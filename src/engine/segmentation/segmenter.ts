  function splitIntoSentences(text) {
    const lines = text
      .replaceAll("\r\n", "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const sentences = [];

    for (const line of lines) {
      // Keep the first pass simple and deterministic so stage-by-stage
      // inspection exposes where a later rule-based splitter needs refinement.
      const matches = line.match(/.+?(?:[.!?]+(?=\s|$)|$)/g) || [line];
      sentences.push(
        ...matches
          .map((sentence) => sentence.trim())
          .filter(Boolean)
      );
    }

    return sentences;
  }
export function segmentMessages(messages) {
    const segments = [];

    for (const message of messages) {
      const sentences = splitIntoSentences(message.text);
      const units = sentences.length > 0 ? sentences : [message.text];

      units.forEach((sentence, index) => {
        segments.push({
          id: segments.length + 1,
          messageId: message.id,
          role: message.role,
          text: sentence,
          position: message.position,
          sentenceIndex: index + 1
        });
      });
    }

    return segments;
  }

  
