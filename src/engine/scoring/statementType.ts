import { config } from '../config';

  // Statement types that are useful for final context
  const USEFUL_TYPES = new Set([
    "FACT", "REQUIREMENT", "CONSTRAINT", "DECISION",
    "FAILURE", "CURRENT_STATE", "OPEN_ISSUE", "NEXT_STEP"
  ]);

  // Types that are soft-excluded unless the segment is protected
  const SOFT_EXCLUDE_TYPES = new Set([
    "QUESTION", "EXAMPLE", "EXPLANATION", "STRUCTURAL_TEXT", "FILLER"
  ]);

  // Interrogative words that open a question
  const INTERROGATIVE_OPENERS = [
    "what", "who", "where", "when", "why", "how", "which",
    "is", "are", "was", "were", "will", "would", "can", "could",
    "should", "did", "do", "does", "have", "has", "had"
  ];

  // Patterns for STRUCTURAL_TEXT detection
  const STRUCTURAL_PATTERNS = [
    /^[-*•]\s+\S.*$/,           // bare list bullets with only 1-2 words after
    /^\d+\.\s+\S{1,30}$/,      // numbered list label (short)
    /^\*\*[^*]+\*\*:?\s*$/,    // **Bold:** label only
    /^#{1,6}\s/,               // markdown heading (# Heading)
    /^[A-Z][A-Z\s]+:?\s*$/,   // ALL-CAPS section labels (e.g. "SUMMARY:")
    /^[\d\s:.\-/]+$/,          // purely numeric/date lines
    /^[^\w\s]+$/               // purely punctuation/symbol lines
  ];

  // Patterns for EXPLANATION detection
  const EXPLANATION_STARTERS = [
    /^this (is|was|means|allows|ensures|makes|enables|provides|helps)/i,
    /^it (is|was|means|allows|ensures|makes|enables|provides|helps)/i,
    /^that (is|was|means|allows|ensures|makes)/i,
    /^so (this|it|that|we|the)/i,
    /^basically[,\s]/i,
    /^essentially[,\s]/i,
    /^in other words[,\s]/i,
    /^the (reason|idea|concept|goal|purpose) (is|was|being)/i
  ];

  // Patterns for EXAMPLE detection
  const EXAMPLE_PATTERNS = [
    /\bfor example\b/i,
    /\bfor instance\b/i,
    /\bsuch as\b/i,
    /\be\.g\.\b/i,
    /\bas an example\b/i,
    /\blike[,\s]\s*(when|if|how)/i
  ];

  function testAny(patterns, text) {
    return patterns.some(p => p.test(text));
  }

  function matchesCues(text, cues) {
    if (!cues || cues.length === 0) return false;
    return cues.some(cue =>
      cue instanceof RegExp ? cue.test(text) : text.toLowerCase().includes(cue.toLowerCase())
    );
  }

  /**
   * Returns confidence 0–1 based on how many cue groups match.
   */
  function cueConfidence(text, cueGroups) {
    const hits = cueGroups.filter(cues => matchesCues(text, cues));
    return Math.min(hits.length / cueGroups.length, 1.0);
  }

  function classifySegment(segment, cues, config) {
    const text = segment.text || "";
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    const isProtected = segment.isProtected || false;

    // --- 1. STRUCTURAL_TEXT ---
    if (testAny(STRUCTURAL_PATTERNS, trimmed)) {
      return { statementType: "STRUCTURAL_TEXT", statementTypeConfidence: 0.90, isContextUseful: isProtected };
    }
    // Also catch very-short labeling text that looks like a heading/label
    if (words.length <= 3 && !trimmed.endsWith("?") && /^[A-Z]/.test(trimmed) && !/[a-z]/.test(trimmed.slice(0, 5))) {
      return { statementType: "STRUCTURAL_TEXT", statementTypeConfidence: 0.80, isContextUseful: isProtected };
    }

    // --- 2. FAILURE ---
    if (matchesCues(trimmed, cues.failure)) {
      return { statementType: "FAILURE", statementTypeConfidence: 0.90, isContextUseful: true };
    }

    // --- 3. DECISION ---
    if (matchesCues(trimmed, cues.decision)) {
      return { statementType: "DECISION", statementTypeConfidence: 0.90, isContextUseful: true };
    }

    // --- 4. REQUIREMENT ---
    // Only if NOT a question (ends with ?) to prevent "What must we do?" becoming REQUIREMENT
    const isQuestion = trimmed.endsWith("?");
    if (!isQuestion && matchesCues(trimmed, cues.requirement)) {
      return { statementType: "REQUIREMENT", statementTypeConfidence: 0.85, isContextUseful: true };
    }
    // Exception: question that ALSO contains hard requirement language can still be REQUIREMENT
    if (isQuestion && matchesCues(trimmed, cues.requirement) && matchesCues(trimmed, cues.constraint)) {
      return { statementType: "REQUIREMENT", statementTypeConfidence: 0.70, isContextUseful: true };
    }

    // --- 5. CONSTRAINT ---
    if (matchesCues(trimmed, cues.constraint)) {
      return { statementType: "CONSTRAINT", statementTypeConfidence: 0.85, isContextUseful: true };
    }

    // --- 6. NEXT_STEP ---
    if (matchesCues(trimmed, cues.nextStep)) {
      return { statementType: "NEXT_STEP", statementTypeConfidence: 0.85, isContextUseful: true };
    }

    // --- 7. OPEN_ISSUE ---
    if (matchesCues(trimmed, cues.openIssue) && !isQuestion) {
      return { statementType: "OPEN_ISSUE", statementTypeConfidence: 0.80, isContextUseful: true };
    }

    // --- 8. CURRENT_STATE ---
    if (matchesCues(trimmed, cues.current)) {
      return { statementType: "CURRENT_STATE", statementTypeConfidence: 0.80, isContextUseful: true };
    }

    // --- 9. QUESTION ---
    // A question that does NOT have strong requirement/constraint cues
    if (isQuestion) {
      const firstWord = words[0] ? words[0].toLowerCase() : "";
      const isInterrogative = INTERROGATIVE_OPENERS.includes(firstWord);
      if (isInterrogative || words.length < 8) {
        return { statementType: "QUESTION", statementTypeConfidence: 0.85, isContextUseful: isProtected };
      }
    }

    // --- 10. EXAMPLE ---
    if (testAny(EXAMPLE_PATTERNS, trimmed)) {
      return { statementType: "EXAMPLE", statementTypeConfidence: 0.80, isContextUseful: isProtected };
    }

    // --- 11. EXPLANATION ---
    if (testAny(EXPLANATION_STARTERS, trimmed)) {
      return { statementType: "EXPLANATION", statementTypeConfidence: 0.70, isContextUseful: isProtected };
    }

    // --- 12. FILLER ---
    const fillerPhrases = config.fillerPhrases || [];
    const isFiller = fillerPhrases.some(f =>
      lower === f.toLowerCase() ||
      lower === f.toLowerCase() + "." ||
      lower === f.toLowerCase() + "!"
    );
    if (isFiller || (words.length <= 3 && !isProtected)) {
      return { statementType: "FILLER", statementTypeConfidence: 0.75, isContextUseful: isProtected };
    }

    // --- 13. FACT (default fallback) ---
    // Anything left that is informational and has enough content
    const hasTechnicalCue = matchesCues(trimmed, cues.technical);
    const confidence = hasTechnicalCue ? 0.80 : 0.60;
    return { statementType: "FACT", statementTypeConfidence: confidence, isContextUseful: true };
  }

  export function classifyStatementTypes(qualityResult, cues, config) {
    const segments = qualityResult.qualityFilteredSegments || [];
    let softExcludedCount = 0;

    const classifiedSegments = segments.map(segment => {
      const classification = classifySegment(segment, cues, config);
      const st = classification.statementType;
      const role = segment.role;

      let semanticRole = "unknown";

      if (st === "DECISION") {
        semanticRole = role === "user" ? "confirmed_decision" : "assistant_suggestion";
      } else if (st === "REQUIREMENT") {
        semanticRole = role === "user" ? "user_requirement" : "assistant_suggestion";
      } else if (st === "CONSTRAINT") {
        semanticRole = role === "user" ? "user_constraint" : "assistant_suggestion";
      } else if (st === "FAILURE") {
        semanticRole = role === "user" ? "failed_approach" : "assistant_fact";
      } else if (st === "CURRENT_STATE") {
        semanticRole = role === "user" ? "current_state" : "assistant_fact";
      } else if (st === "QUESTION") {
        semanticRole = role === "user" ? "user_question" : "assistant_question";
      } else if (st === "OPEN_ISSUE") {
        semanticRole = role === "user" ? "open_issue" : "assistant_question"; // assistant issue? Let's say assistant_question
      } else if (st === "NEXT_STEP") {
        semanticRole = role === "user" ? "next_step" : "assistant_suggestion"; 
      } else if (st === "FACT" || st === "TECHNICAL") {
        // We can detect user_goal here by checking cues, or we can just call it technical_fact and let categories upgrade it
        // Actually, let's just check if it has goal cues
        if (role === "user" && matchesCues(segment.text, cues.goal)) {
          semanticRole = "user_goal";
        } else {
          semanticRole = role === "user" ? "technical_fact" : "assistant_fact";
        }
      } else if (st === "FILLER" || st === "EXPLANATION" || st === "EXAMPLE" || st === "STRUCTURAL_TEXT") {
        semanticRole = "conversational";
      }

      // isProtected always overrides soft-exclusion initially
      let finalContextUseful = segment.isProtected ? true : classification.isContextUseful;

      // Override protection for assistant suggestions, questions, and conversational text
      if (semanticRole === "assistant_question" || semanticRole === "conversational" || semanticRole === "assistant_suggestion") {
         finalContextUseful = false;
      }

      if (!finalContextUseful) softExcludedCount++;

      return {
        ...segment,
        statementType: classification.statementType,
        statementTypeConfidence: classification.statementTypeConfidence,
        semanticRole: semanticRole,
        isContextUseful: finalContextUseful
      };
    });

    return {
      classifiedSegments,
      totalCount: classifiedSegments.length,
      softExcludedCount
    };
  };

