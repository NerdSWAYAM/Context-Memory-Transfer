window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;

  function roundNumber(value) {
    return Number(value.toFixed(6));
  }

  function computeSimilarity(tfidfResult) {
    const documents = tfidfResult.documents || [];
    const invertedIndex = new Map();
    const pairDotProducts = new Map();

    documents.forEach((document, documentIndex) => {
      Object.entries(document.tfidf).forEach(([term, weight]) => {
        const priorEntries = invertedIndex.get(term) || [];

        priorEntries.forEach((priorEntry) => {
          const pairKey = `${priorEntry.documentIndex}:${documentIndex}`;
          const dotProduct = pairDotProducts.get(pairKey) || 0;
          pairDotProducts.set(pairKey, dotProduct + (priorEntry.weight * weight));
        });

        priorEntries.push({
          documentIndex,
          weight
        });

        invertedIndex.set(term, priorEntries);
      });
    });

    const pairs = [];
    const neighborsBySegment = new Map();

    pairDotProducts.forEach((dotProduct, pairKey) => {
      const [leftIndex, rightIndex] = pairKey.split(":").map(Number);
      const left = documents[leftIndex];
      const right = documents[rightIndex];

      if (!left || !right || !left.vectorNorm || !right.vectorNorm) {
        return;
      }

      const score = roundNumber(dotProduct / (left.vectorNorm * right.vectorNorm));

      const pair = {
        sourceId: left.segmentId,
        targetId: right.segmentId,
        score,
        sourceText: left.text,
        targetText: right.text
      };

      pairs.push(pair);

      const leftNeighbors = neighborsBySegment.get(left.segmentId) || [];
      leftNeighbors.push({
        segmentId: right.segmentId,
        score,
        text: right.text
      });
      neighborsBySegment.set(left.segmentId, leftNeighbors);

      const rightNeighbors = neighborsBySegment.get(right.segmentId) || [];
      rightNeighbors.push({
        segmentId: left.segmentId,
        score,
        text: left.text
      });
      neighborsBySegment.set(right.segmentId, rightNeighbors);
    });

    pairs.sort((left, right) => (
      right.score - left.score
      || left.sourceId - right.sourceId
      || left.targetId - right.targetId
    ));

    const topNeighbors = documents.map((document) => {
      const neighbors = (neighborsBySegment.get(document.segmentId) || [])
        .sort((left, right) => (
          right.score - left.score || left.segmentId - right.segmentId
        ))
        .slice(0, engine.config.topNeighborsPerSegment);

      return {
        segmentId: document.segmentId,
        text: document.text,
        neighbors
      };
    });

    const densePairCount = documents.length > 1
      ? (documents.length * (documents.length - 1)) / 2
      : 0;

    return {
      documentCount: documents.length,
      pairCount: pairs.length,
      densePairCount,
      skippedPairs: densePairCount - pairs.length,
      density: densePairCount > 0
        ? roundNumber(pairs.length / densePairCount)
        : 0,
      pairs,
      topNeighbors
    };
  }

  engine.computeSimilarity = computeSimilarity;
})();
