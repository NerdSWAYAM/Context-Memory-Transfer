  const CATEGORY_NAMES = {
    GOAL: "[OBJ] Objective",
    REQUIREMENT: "[REQ] Requirements",
    DECISION: "[DEC] Decisions",
    CONSTRAINT: "[CONST] Constraints",
    TECHNICAL: "[CTX] Relevant Context",
    FAILURE: "[CTX] Relevant Context",
    CURRENT: "[STATE] Current State",
    OPEN_ISSUE: "[OPEN] Open Issues",
    NEXT_STEP: "[NEXT] Next Actions"
  };

  // Maps statement types to category keys for the strong-prior boost
  const STATEMENT_TYPE_PRIOR = {
    REQUIREMENT:   { REQUIREMENT: 2 },
    CONSTRAINT:    { CONSTRAINT: 2 },
    DECISION:      { DECISION: 2 },
    FAILURE:       { FAILURE: 2 },
    NEXT_STEP:     { NEXT_STEP: 2 },
    CURRENT_STATE: { CURRENT: 2 },
    OPEN_ISSUE:    { OPEN_ISSUE: 1 },
    QUESTION:      { OPEN_ISSUE: 1 },
    FACT:          {},  // no bias — let cues decide
    EXAMPLE:       {},
    EXPLANATION:   {},
    STRUCTURAL_TEXT: {},
    FILLER:        {}
  };

  function countMatches(text, cues) {
    if (!cues || cues.length === 0) return 0;
    let count = 0;
    for (const cue of cues) {
      if (cue instanceof RegExp) {
        if (cue.test(text)) count++;
      } else if (text.toLowerCase().includes(cue.toLowerCase())) {
        count++;
      }
    }
    return count;
  }

  export function assignCategories(statementTypeResult, cues) {
    // Accept either classifiedSegments (from statementType stage) or qualityFilteredSegments (legacy)
    const retainedSegments =
      statementTypeResult.classifiedSegments ||
      statementTypeResult.qualityFilteredSegments ||
      [];

    const totalSegments = retainedSegments.length > 0
      ? Math.max(...retainedSegments.map(s => s.sentenceIndex || 0)) + 1
      : 1;

    const categorizedSegments = retainedSegments.map(segment => {
      const text = segment.text;
      const statementType = segment.statementType || "FACT";

      // --- Base scores from cue matching ---
      const scores = {
        GOAL:        countMatches(text, cues.goal),
        REQUIREMENT: countMatches(text, cues.requirement),
        DECISION:    countMatches(text, cues.decision),
        CONSTRAINT:  countMatches(text, cues.constraint),
        FAILURE:     countMatches(text, cues.failure),
        NEXT_STEP:   countMatches(text, cues.nextStep),
        TECHNICAL:   countMatches(text, cues.technical),
        CURRENT:     countMatches(text, cues.current),
        OPEN_ISSUE:  countMatches(text, cues.openIssue)
      };

      // --- Statement-type strong prior (+2 bias) ---
      const prior = STATEMENT_TYPE_PRIOR[statementType] || {};
      for (const [cat, boost] of Object.entries(prior)) {
        scores[cat] = (scores[cat] || 0) + boost;
      }

      // --- Deterministic Role-to-Category Eligibility Layer ---
      const semanticRole = segment.semanticRole || "unknown";
      
      // 1. Hard Restrictions
      // Assistant questions must never become REQ, DEC, STATE, or NEXT.
      if (semanticRole === "assistant_question") {
        scores.REQUIREMENT = 0;
        scores.DECISION = 0;
        scores.CURRENT = 0;
        scores.NEXT_STEP = 0;
        scores.GOAL = 0;
      }
      // Assistant suggestions must not become DEC
      if (semanticRole === "assistant_suggestion") {
        scores.DECISION = 0;
      }
      // User goals should not be classified as requirements
      if (semanticRole === "user_goal") {
        scores.REQUIREMENT = 0;
      }

      // 2. Exact Mapping / Prioritization
      if (semanticRole === "user_goal") scores.GOAL += 5;
      if (semanticRole === "user_requirement") scores.REQUIREMENT += 5;
      if (semanticRole === "user_constraint") scores.CONSTRAINT += 5;
      if (semanticRole === "confirmed_decision") scores.DECISION += 5;
      if (semanticRole === "current_state") scores.CURRENT += 5;
      if (semanticRole === "failed_approach") scores.FAILURE += 5; // Maps to CTX
      if (semanticRole === "technical_fact") scores.TECHNICAL += 5; // Maps to CTX
      if (semanticRole === "open_issue") scores.OPEN_ISSUE += 5;
      if (semanticRole === "next_step") scores.NEXT_STEP += 5;

      // --- Lightweight current-state detection (recency boost) ---
      const recency = (segment.sentenceIndex || 0) / (totalSegments || 1);
      if (recency > 0.85 && (scores.TECHNICAL > 0 || scores.DECISION > 0) && semanticRole !== "assistant_question" && semanticRole !== "user_goal") {
        scores.CURRENT += 0.5;
      }

      // --- Determine primary + secondary categories ---
      const sortedCategories = Object.entries(scores)
        .filter(([_, score]) => score > 0)
        .sort((a, b) => b[1] - a[1]);

      let primaryCategory = CATEGORY_NAMES.TECHNICAL; // safe default
      let secondaryCategories = [];

      if (sortedCategories.length > 0) {
        primaryCategory = CATEGORY_NAMES[sortedCategories[0][0]];
        secondaryCategories = sortedCategories.slice(1).map(c => CATEGORY_NAMES[c[0]]);
      } else {
        // Fallback by recency / role when no cue fired
        if (recency > 0.9) {
          primaryCategory = CATEGORY_NAMES.CURRENT;
        } else if (segment.role === "user" && recency < 0.2) {
          primaryCategory = CATEGORY_NAMES.GOAL;
        }
      }

      // --- Soft-exclude flag ---
      // Segments that are not context-useful and not protected are flagged but still categorized
      // so downstream stages can see them before deciding to exclude them.
      const softExcluded =
        segment.isContextUseful === false && !segment.isProtected;

      return {
        ...segment,
        category: primaryCategory,
        secondaryCategories,
        categoryScores: scores,
        softExcluded
      };
    });

    return {
      categorizedSegments
    };
  };

