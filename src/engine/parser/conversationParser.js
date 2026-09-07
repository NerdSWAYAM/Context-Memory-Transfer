window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;

  function normalizeRole(label) {
    const normalized = (label || "").trim().toLowerCase();

    if (["assistant", "ai", "claude", "chatgpt", "gemini"].includes(normalized)) {
      return "assistant";
    }

    if (["system"].includes(normalized)) {
      return "system";
    }

    return "user";
  }

  function parseTranscript(transcript) {
    const normalizedTranscript = transcript.replaceAll("\r\n", "\n");
    const lines = normalizedTranscript.split("\n");
    const messages = [];

    let currentRoleLabel = null;
    let currentLines = [];
    let hasExplicitRoles = false;

    function flushMessage() {
      const rawText = currentLines.join("\n").trim();
      if (!rawText) {
        currentLines = [];
        return;
      }

      messages.push({
        id: messages.length + 1,
        role: normalizeRole(currentRoleLabel),
        text: rawText,
        position: messages.length + 1,
        originalRoleLabel: currentRoleLabel || "USER"
      });

      currentLines = [];
    }

    for (const line of lines) {
      const roleMatch = line.match(/^\s*([A-Za-z][A-Za-z0-9 _-]{1,20})\s*:\s*(.*)$/);
      const roleCandidate = roleMatch ? roleMatch[1].trim() : null;

      if (roleCandidate && ["user", "assistant", "system", "human", "ai", "claude", "chatgpt", "gemini"].includes(roleCandidate.toLowerCase())) {
        hasExplicitRoles = true;
        flushMessage();
        currentRoleLabel = roleCandidate;

        const firstLineText = roleMatch[2] ? roleMatch[2].trim() : "";
        currentLines = firstLineText ? [firstLineText] : [];
      } else {
        currentLines.push(line);
      }
    }

    flushMessage();

    if (!hasExplicitRoles && messages.length === 0) {
      return {
        messages: []
      };
    }

    if (!hasExplicitRoles && messages.length > 0) {
      return {
        messages: [
          {
            id: 1,
            role: "user",
            text: normalizedTranscript.trim(),
            position: 1,
            originalRoleLabel: "USER"
          }
        ]
      };
    }

    return { messages };
  }

  engine.parseTranscript = parseTranscript;
})();
