window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;

  function buildSimilarityGraph(similarityResult, threshold = engine.config.graphSimilarityThreshold) {
    const edges = (similarityResult.pairs || [])
      .filter((pair) => pair.score >= threshold)
      .map((pair) => ({ ...pair, weight: pair.score }));

    const nodeIds = new Set();
    edges.forEach((edge) => {
      nodeIds.add(edge.sourceId);
      nodeIds.add(edge.targetId);
    });

    return {
      nodeCount: similarityResult.documentCount || 0,
      connectedNodeCount: nodeIds.size,
      possibleEdgeCount: similarityResult.densePairCount || 0,
      threshold: Number(threshold.toFixed(2)),
      edgeCount: edges.length,
      density: similarityResult.densePairCount
        ? Number((edges.length / similarityResult.densePairCount).toFixed(6))
        : 0,
      edges
    };
  }

  engine.buildSimilarityGraph = buildSimilarityGraph;
})();
