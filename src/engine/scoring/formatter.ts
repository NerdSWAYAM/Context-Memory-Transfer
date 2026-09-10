  const CATEGORY_ORDER = [
    "[OBJ] Objective",
    "[REQ] Requirements",
    "[CONST] Constraints",
    "[DEC] Decisions",
    "[STATE] Current State",
    "[CTX] Relevant Context",
    "[OPEN] Open Issues",
    "[NEXT] Next Actions"
  ];

  export function formatContext(chronologyResult) {
    const segments = chronologyResult.orderedSegments || [];
    
    // Group segments by category, preserving their chronological order within the category
    const grouped = {};
    CATEGORY_ORDER.forEach(cat => {
      grouped[cat] = [];
    });

    segments.forEach(segment => {
      const cat = segment.category;
      if (grouped[cat]) {
        grouped[cat].push(segment.text);
      } else {
        // Fallback for any unknown category
        grouped["[CTX] Relevant Context"] = grouped["[CTX] Relevant Context"] || [];
        grouped["[CTX] Relevant Context"].push(segment.text);
      }
    });

    let outputMarkdown = "";

    CATEGORY_ORDER.forEach(cat => {
      const items = grouped[cat];
      if (items && items.length > 0) {
        outputMarkdown += `${cat}\n`;
        items.forEach(text => {
          outputMarkdown += `- ${text}\n`;
        });
        outputMarkdown += "\n";
      }
    });

    return {
      formattedText: outputMarkdown.trim()
    };
  };

