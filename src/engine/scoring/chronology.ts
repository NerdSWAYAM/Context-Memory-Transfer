  export function orderChronologically(redundancyResult) {
    // Accept either retainedSegments (from redundancy) or categorizedSegments (legacy)
    const segments = redundancyResult.retainedSegments || redundancyResult.categorizedSegments || [];
    
    // Sort by id to restore chronological order.
    // The parser and segmenter preserve chronological id and position.
    const orderedSegments = [...segments].sort((a, b) => {
      // First sort by message position, then by sentence index
      if (a.position !== b.position) {
        return (a.position || 0) - (b.position || 0);
      }
      return (a.sentenceIndex || 0) - (b.sentenceIndex || 0);
    });

    return {
      orderedSegments: orderedSegments
    };
  };

