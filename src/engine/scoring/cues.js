window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;

  engine.CUES = {
    requirement: [
      /\b(?:must|need to|needs to|should|required to|have to|necessary|make sure|ensure)\b/i
    ],
    decision: [
      /\b(?:decided|we decided|we chose|we will use|go with|switch to|settled on|going with)\b/i,
      /\b(?:let's use|we are going to build|we will implement)\b/i
    ],
    failure: [
      /\b(?:failed|didn't work|doesn't work|too slow|not suitable|caused an error|rejected|abandoned|broke|issue with)\b/i
    ],
    constraint: [
      /\b(?:cannot|can't|must not|without|limited to|not allowed|budget|memory limit|cpu limit)\b/i,
      /\b(?:no external|no backend|browser-only)\b/i
    ],
    nextStep: [
      /\b(?:next step|todo|remaining|need to implement|will add|to be done|later|upcoming)\b/i
    ],
    goal: [
      /\b(?:want to|goal is|build a|create a|purpose is|objective|target is)\b/i
    ],
    technical: [
      /\b(?:using|api|function|variable|code|architecture|database|server|frontend|backend|algorithm|logic)\b/i
    ],
    current: [
      /\b(?:currently|right now|at the moment|status is|working on|so far|we have)\b/i
    ],
    openIssue: [
      /\b(?:not sure|don't know|how to|problem with|issue|bug|question|unresolved)\b/i
    ]
  };
})();
