window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;
  const { fillerPhrases, artifactPatterns, criticalCuePatterns } = engine.config;

  function normalizeWhitespace(text) {
    return text
      .replaceAll("\r\n", "\n")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  function containsCriticalCue(text) {
    return criticalCuePatterns.some((pattern) => pattern.test(text));
  }

  function isArtifact(text) {
    return artifactPatterns.some((pattern) => pattern.test(text));
  }

  function isLowValueFiller(text) {
    const normalized = text.toLowerCase();
    return fillerPhrases.includes(normalized);
  }

  function cleanMessages(messages) {
    const seenMessages = new Set();
    const cleanedMessages = [];
    const removedMessages = [];

    for (const message of messages) {
      const normalizedText = normalizeWhitespace(message.text);

      if (!normalizedText) {
        removedMessages.push({
          role: message.role,
          position: message.position,
          text: message.text,
          reason: "empty after normalization"
        });
        continue;
      }

      if (isArtifact(normalizedText)) {
        removedMessages.push({
          role: message.role,
          position: message.position,
          text: normalizedText,
          reason: "ui artifact"
        });
        continue;
      }

      if (isLowValueFiller(normalizedText) && !containsCriticalCue(normalizedText)) {
        removedMessages.push({
          role: message.role,
          position: message.position,
          text: normalizedText,
          reason: "low-value filler"
        });
        continue;
      }

      const duplicateKey = `${message.role}::${normalizedText.toLowerCase()}`;
      if (seenMessages.has(duplicateKey)) {
        removedMessages.push({
          role: message.role,
          position: message.position,
          text: normalizedText,
          reason: "duplicate message"
        });
        continue;
      }

      seenMessages.add(duplicateKey);
      cleanedMessages.push({
        id: message.id,
        role: message.role,
        text: normalizedText,
        position: message.position,
        originalText: message.text
      });
    }

    return {
      messages: cleanedMessages,
      removed: removedMessages
    };
  }

  engine.cleanMessages = cleanMessages;
})();
