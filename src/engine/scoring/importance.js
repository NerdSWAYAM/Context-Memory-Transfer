window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;

  function countCueMatches(text, cues) {
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

  function calculateRecencySignal(segment, totalSegments) {
    // Basic linear recency: 0.0 at beginning, 1.0 at the end
    if (totalSegments <= 1) return 1.0;
    return segment.sentenceIndex / (totalSegments - 1);
  }

  engine.computeImportance = function(textRankResult, tfidfResult, config, cues) {
    const weights = config.importanceWeights || {
      textRank: 0.30,
      tfidf: 0.15,
      decision: 0.12,
      requirement: 0.10,
      constraint: 0.08,
      failure: 0.08,
      nextStep: 0.08,
      recency: 0.05
    };

    const segments = textRankResult.rankedSegments;
    const totalSegments = segments.length;

    // We need the tfidf scores per segment to normalize
    const tfidfMap = new Map();
    if (tfidfResult && tfidfResult.documents) {
      for (const doc of tfidfResult.documents) {
        // sum of weights for this segment
        const totalTfidfWeight = doc.topTerms.reduce((sum, term) => sum + term.weight, 0);
        tfidfMap.set(doc.segmentId, totalTfidfWeight);
      }
    }

    // Find max values for normalization
    let maxTextRank = 0;
    let maxTfidf = 0;

    for (const seg of segments) {
      if (seg.textRank > maxTextRank) maxTextRank = seg.textRank;
      const tfidfScore = tfidfMap.get(seg.id) || 0;
      if (tfidfScore > maxTfidf) maxTfidf = tfidfScore;
    }

    const scoredSegments = segments.map((segment, index) => {
      // Normalize TextRank
      const normTextRank = maxTextRank > 0 ? (segment.textRank / maxTextRank) : 0;
      
      // Normalize TF-IDF
      const rawTfidf = tfidfMap.get(segment.id) || 0;
      const normTfidf = maxTfidf > 0 ? (rawTfidf / maxTfidf) : 0;

      // Calculate cue signals (binary: 1 if present, 0 if not, can be tuned)
      const hasDecision = countCueMatches(segment.text, cues.decision) > 0 ? 1 : 0;
      const hasRequirement = countCueMatches(segment.text, cues.requirement) > 0 ? 1 : 0;
      const hasConstraint = countCueMatches(segment.text, cues.constraint) > 0 ? 1 : 0;
      const hasFailure = countCueMatches(segment.text, cues.failure) > 0 ? 1 : 0;
      const hasNextStep = countCueMatches(segment.text, cues.nextStep) > 0 ? 1 : 0;
      const hasGoal = countCueMatches(segment.text, cues.goal) > 0 ? 1 : 0;

      // Protection: if it's a strong explicit cue for a critical category, protect it
      const isProtected = (hasDecision || hasRequirement || hasConstraint || hasFailure || hasGoal) > 0;

      // Recency
      // We use the overall position of the segment in the array, not sentenceIndex, for conversation recency.
      const recency = calculateRecencySignal({ sentenceIndex: index }, totalSegments);

      // Final Score
      let finalScore = 0;
      finalScore += normTextRank * (weights.textRank || 0);
      finalScore += normTfidf * (weights.tfidf || 0);
      finalScore += hasDecision * (weights.decision || 0);
      finalScore += hasRequirement * (weights.requirement || 0);
      finalScore += hasConstraint * (weights.constraint || 0);
      finalScore += hasFailure * (weights.failure || 0);
      finalScore += hasNextStep * (weights.nextStep || 0);
      finalScore += recency * (weights.recency || 0);

      // Boost protected segments
      if (isProtected) {
        finalScore += 1000.0;
      }

      return {
        ...segment,
        importanceScore: finalScore,
        isProtected: isProtected,
        scoreBreakdown: {
          textRank: normTextRank * (weights.textRank || 0),
          tfidf: normTfidf * (weights.tfidf || 0),
          decision: hasDecision * (weights.decision || 0),
          requirement: hasRequirement * (weights.requirement || 0),
          constraint: hasConstraint * (weights.constraint || 0),
          failure: hasFailure * (weights.failure || 0),
          nextStep: hasNextStep * (weights.nextStep || 0),
          recency: recency * (weights.recency || 0)
        }
      };
    });

    // Sort by importance descending
    scoredSegments.sort((a, b) => b.importanceScore - a.importanceScore);

    return {
      scoredSegments: scoredSegments,
      segmentCount: scoredSegments.length
    };
  };

})();
