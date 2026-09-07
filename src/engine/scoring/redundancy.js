window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;

  engine.removeRedundancy = function(categoriesResult, similarityResult, config) {
    const threshold = config.redundancyThreshold || 0.70;
    const maxOutputSegments = config.maxOutputSegments || 30;
    const allCategorizedSegments = categoriesResult.categorizedSegments || [];

    // --- Separate soft-excluded segments before redundancy processing ---
    // They never enter the retained pool, but we record them for transparency.
    const softExcludedSegments = [];
    const activeSegments = [];

    for (const seg of allCategorizedSegments) {
      if (seg.softExcluded) {
        softExcludedSegments.push({ ...seg, rejectReason: "soft_excluded" });
      } else {
        activeSegments.push(seg);
      }
    }

    // --- Build similarity lookup ---
    const similarityMap = new Map();
    if (similarityResult && similarityResult.pairs) {
      similarityResult.pairs.forEach(pair => {
        const key1 = `${pair.sourceId}-${pair.targetId}`;
        const key2 = `${pair.targetId}-${pair.sourceId}`;
        similarityMap.set(key1, pair.score);
        similarityMap.set(key2, pair.score);
      });
    }

    const retained = [];
    const removed = [];

    for (const segment of activeSegments) {
      let shouldRetain = true;

      for (let i = 0; i < retained.length; i++) {
        const kept = retained[i];
        const key = `${segment.id}-${kept.id}`;
        const score = similarityMap.get(key) || 0;

        const isCriticalPair = (s1, s2) => {
          const isCrit = s => s.category === "[DEC] Decisions" || s.category === "[REQ] Requirements";
          return isCrit(s1) && isCrit(s2);
        };

        const effectiveThreshold = isCriticalPair(segment, kept) ? Math.min(threshold, 0.50) : threshold;

        if (score >= effectiveThreshold) {
          if (isCriticalPair(segment, kept)) {
            const segOrder = segment.id !== undefined ? segment.id : segment.sentenceIndex;
            const keptOrder = kept.id !== undefined ? kept.id : kept.sentenceIndex;

            if (segOrder > keptOrder) {
              // segment supersedes kept
              removed.push({
                ...kept,
                isSuperseded: true,
                supersededBy: segment.id,
                supersessionScore: score
              });
              retained.splice(i, 1);
              i--;
              continue; // keep checking segment against remaining retained
            } else {
              // kept supersedes segment
              segment.isSuperseded = true;
              segment.supersededBy = kept.id;
              segment.supersessionScore = score;
              shouldRetain = false;
              removed.push(segment);
              break;
            }
          } else {
            // Normal redundancy — keep highest importance score
            segment.isRedundant = true;
            segment.redundantWith = kept.id;
            segment.redundancyScore = score;
            shouldRetain = false;
            removed.push(segment);
            break;
          }
        }
      }

      if (shouldRetain) {
        retained.push(segment);
      }
    }

    // Apply max-output cap
    const finalRetained = retained.slice(0, maxOutputSegments);
    const cappedOut = retained.slice(maxOutputSegments).map(s => ({
      ...s, rejectReason: "max_limit_reached"
    }));

    const finalRemoved = [...removed, ...cappedOut];

    return {
      retainedSegments: finalRetained,
      removedSegments: finalRemoved,
      softExcludedSegments,
      retainedCount: finalRetained.length,
      removedCount: finalRemoved.length,
      softExcludedCount: softExcludedSegments.length,
      threshold
    };
  };

})();
