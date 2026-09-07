window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;

  engine.sampleTranscript = `USER:
I want to build a browser extension that can capture useful context from AI conversations. The idea is that I often have long conversations with ChatGPT, Claude, Gemini, and other AI systems, and after a while the conversation becomes too long or I want to move the work to another AI. I want some way to capture the important context and transfer it.

ASSISTANT:
That sounds like a context portability system. A basic architecture could be:

AI conversation
→ browser extension
→ conversation extraction
→ summarization
→ context storage
→ export/transfer

The important part is making sure the generated context preserves the information needed to continue the work.

USER:
Exactly. I don't want a normal summary like "The user discussed building an extension." I want the summary to contain the actual project state.

ASSISTANT:
Then the system should produce structured working context rather than a generic summary.

Potential fields are:
- Goal
- Requirements
- Constraints
- Decisions
- Technical context
- Current state
- Problems
- Failed approaches
- Open questions
- Next steps

USER:
I want this to run completely locally. I don't want to pay for a server.

ASSISTANT:
That strongly suggests a non-LLM extractive approach initially. TF-IDF, similarity calculations, TextRank, keyword scoring, and redundancy removal can all run in JavaScript.

USER:
I tried a 270M parameter model in a prototype.

ASSISTANT:
How did it perform?

USER:
It took about four seconds just to load the model, then roughly thirty seconds to summarize a conversation. The quality was also worse than I expected.

ASSISTANT:
In that case, a local generative model isn't a good choice for the current version. A deterministic extractive system is a better baseline.

USER:
Yes, let's go with extractive summarization.`;
})();
