window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;

  function computeTextRank(graph, segments) {
    const nodes = (segments || []).map((segment) => segment.id);
    const adjacency = new Map(nodes.map((id) => [id, []]));

    (graph.edges || []).forEach((edge) => {
      adjacency.get(edge.sourceId)?.push({ id: edge.targetId, weight: edge.weight });
      adjacency.get(edge.targetId)?.push({ id: edge.sourceId, weight: edge.weight });
    });

    const damping = engine.config.textrankDamping;
    const iterations = engine.config.textrankIterations;
    let scores = new Map(nodes.map((id) => [id, 1]));

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const next = new Map();
      nodes.forEach((id) => {
        const incoming = adjacency.get(id) || [];
        const contribution = incoming.reduce((total, neighbor) => {
          const neighborLinks = adjacency.get(neighbor.id) || [];
          const totalWeight = neighborLinks.reduce((sum, link) => sum + link.weight, 0);
          return total + (totalWeight ? (neighbor.weight * scores.get(neighbor.id)) / totalWeight : 0);
        }, 0);
        next.set(id, (1 - damping) + (damping * contribution));
      });
      scores = next;
    }

    const rankedSegments = (segments || []).map((segment) => ({
      ...segment,
      textRank: Number((scores.get(segment.id) || (1 - damping)).toFixed(6)),
      degree: (adjacency.get(segment.id) || []).length
    })).sort((left, right) => right.textRank - left.textRank || left.id - right.id);

    return {
      damping,
      iterations,
      nodeCount: nodes.length,
      edgeCount: graph.edgeCount || 0,
      rankedSegments
    };
  }

  engine.computeTextRank = computeTextRank;
})();
