window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;
  const stopWords = new Set(engine.config.stopWords);

  function roundNumber(value) {
    return Number(value.toFixed(6));
  }

  function orderObject(input) {
    return Object.keys(input)
      .sort()
      .reduce((ordered, key) => {
        ordered[key] = input[key];
        return ordered;
      }, {});
  }

  function tokenize(text) {
    const matches = text.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];

    return matches.filter((token) => (
      token.length >= engine.config.minTokenLength
      && !stopWords.has(token)
    ));
  }

  function countTerms(tokens) {
    return tokens.reduce((counts, token) => {
      counts[token] = (counts[token] || 0) + 1;
      return counts;
    }, {});
  }

  function computeTfidf(segments) {
    const baseDocuments = segments.map((segment) => {
      const tokens = tokenize(segment.text);
      const termCounts = countTerms(tokens);

      return {
        segmentId: segment.id,
        messageId: segment.messageId,
        role: segment.role,
        position: segment.position,
        sentenceIndex: segment.sentenceIndex,
        text: segment.text,
        tokens,
        tokenCount: tokens.length,
        uniqueTokenCount: Object.keys(termCounts).length,
        termCounts
      };
    });

    const documentFrequencies = {};

    for (const document of baseDocuments) {
      Object.keys(document.termCounts).forEach((term) => {
        documentFrequencies[term] = (documentFrequencies[term] || 0) + 1;
      });
    }

    const vocabulary = Object.keys(documentFrequencies).sort();
    const totalDocuments = baseDocuments.length;
    const idfByTerm = vocabulary.reduce((idfMap, term) => {
      idfMap[term] = roundNumber(
        Math.log((1 + totalDocuments) / (1 + documentFrequencies[term])) + 1
      );
      return idfMap;
    }, {});

    let totalTokenCount = 0;

    const documents = baseDocuments.map((document) => {
      const denominator = document.tokenCount || 1;
      const tfidf = {};
      const topTerms = [];
      let sumSquares = 0;

      Object.keys(document.termCounts)
        .sort()
        .forEach((term) => {
          const tf = document.termCounts[term] / denominator;
          const weight = roundNumber(tf * idfByTerm[term]);
          tfidf[term] = weight;
          topTerms.push({ term, weight });
          sumSquares += weight * weight;
        });

      totalTokenCount += document.tokenCount;

      topTerms.sort((left, right) => (
        right.weight - left.weight || left.term.localeCompare(right.term)
      ));

      return {
        segmentId: document.segmentId,
        messageId: document.messageId,
        role: document.role,
        position: document.position,
        sentenceIndex: document.sentenceIndex,
        text: document.text,
        tokens: document.tokens,
        tokenCount: document.tokenCount,
        uniqueTokenCount: document.uniqueTokenCount,
        termCounts: orderObject(document.termCounts),
        tfidf: orderObject(tfidf),
        vectorNorm: roundNumber(Math.sqrt(sumSquares)),
        topTerms: topTerms.slice(0, engine.config.topTermsPerSegment)
      };
    });

    return {
      documentCount: documents.length,
      vocabulary,
      vocabularySize: vocabulary.length,
      averageTokenCount: documents.length > 0
        ? roundNumber(totalTokenCount / documents.length)
        : 0,
      documentFrequencies: orderObject(documentFrequencies),
      idfByTerm: orderObject(idfByTerm),
      documents
    };
  }

  engine.computeTfidf = computeTfidf;
})();
