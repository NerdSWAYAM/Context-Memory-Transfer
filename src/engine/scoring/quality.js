window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;

  engine.filterQuality = function(importanceResult, config) {
    const scoredSegments = importanceResult.scoredSegments || [];
    const minTokenLength = config.minTokenLength || 3;
    const fillerPhrases = config.fillerPhrases || [];

    const qualityFilteredSegments = [];
    const rejectedSegments = [];

    for (const segment of scoredSegments) {
      const text = segment.text.trim();
      const lowerText = text.toLowerCase();
      const words = text.split(/\s+/).filter(w => w.length > 0);

      // Check 1: Fragments (too short)
      if (words.length < minTokenLength) {
        rejectedSegments.push({ ...segment, rejectReason: "fragment" });
        continue;
      }

      // Check 2: Markdown Headings
      if (text.startsWith("#")) {
        rejectedSegments.push({ ...segment, rejectReason: "heading" });
        continue;
      }

      // Check 3: Filler phrases (exact match or very similar)
      const isFiller = fillerPhrases.some(filler => 
        lowerText === filler.toLowerCase() || 
        lowerText === filler.toLowerCase() + "." || 
        lowerText === filler.toLowerCase() + "!"
      );
      if (isFiller) {
        rejectedSegments.push({ ...segment, rejectReason: "filler" });
        continue;
      }

      // Check 4: Generic questions (e.g. "What do you think?")
      // Simple heuristic: short questions (< 6 words) starting with certain words
      const isQuestion = text.endsWith("?");
      if (isQuestion && words.length < 6) {
        const firstWord = words[0].toLowerCase();
        if (["what", "how", "does", "do", "is", "are", "can", "could", "should"].includes(firstWord)) {
          // If it's a very short question and not protected, it's likely generic noise
          if (!segment.isProtected) {
            rejectedSegments.push({ ...segment, rejectReason: "generic_question" });
            continue;
          }
        }
      }

      // Passed quality filter
      qualityFilteredSegments.push(segment);
    }

    return {
      qualityFilteredSegments: qualityFilteredSegments,
      rejectedSegments: rejectedSegments
    };
  };

})();
