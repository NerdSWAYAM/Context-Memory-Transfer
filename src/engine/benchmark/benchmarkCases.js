window.SummaryEngine = window.SummaryEngine || {};

(() => {
  const engine = window.SummaryEngine;

  engine.benchmarkCases = [
    {
      id: "auth_refactor",
      name: "Auth Refactor & Decision Supersession",
      description: "Tests goal extraction, requirements, superseded database decisions, failed security approach, and current state.",
      transcript: `USER:
Hello! Hope you are doing well today.
I want to refactor our legacy authentication system into a modern OAuth2 JWT microservice.

ASSISTANT:
Sounds great! What are the primary requirements and constraints for the microservice?

USER:
The system must maintain backward compatibility with existing session cookies and support Google and GitHub OAuth providers.
Also, the maximum memory footprint must not exceed 256MB per instance with zero-downtime deployment.

ASSISTANT:
Got it. Where should we store session tokens and user profiles?

USER:
We decided to use MongoDB for session token storage.

ASSISTANT:
Let's consider token security as well.

USER:
I tried storing raw JWT tokens directly in client-side cookies without HttpOnly flags, but that failed security review because of XSS vulnerability risks.

ASSISTANT:
Using HttpOnly and Secure flags is definitely required. What about session storage performance under high load?

USER:
Actually, we decided to switch from MongoDB to PostgreSQL for session token storage with Redis caching. MongoDB latency was too high under load.

ASSISTANT:
That makes sense. Redis will give sub-millisecond revoking lookups. What is the current status?

USER:
Currently, the PostgreSQL database schema migration scripts are written and endpoint routing is structured.
However, configuring the CORS policy for our staging domain is still an open issue.

ASSISTANT:
What are the next actions?

USER:
Next steps are to write unit tests for the JWT validation middleware.`
    },
    {
      id: "k8s_incident",
      name: "Kubernetes Incident & Memory Leak Fix",
      description: "Tests incident handling, failed memory tuning attempts, constraint management, and canary deployment status.",
      transcript: `USER:
We have a critical production issue. Our Kubernetes pods are crashing due to OOM kills under heavy WebSocket traffic.

ASSISTANT:
Let's investigate. What has been tried so far?

USER:
We tried increasing the Node.js V8 heap limit from 512MB to 2GB, but that failed because the pod still crashed after 6 hours.

ASSISTANT:
That indicates an uncollected buffer memory leak rather than insufficient heap allocation.

USER:
Correct. We identified that unclosed stream buffers were leaking. We decided to replace custom buffer allocations with stream buffer pooling.

ASSISTANT:
What is the constraint for the fix?

USER:
Must not drop active WebSocket client connections during server reconnects.

ASSISTANT:
What is the current state?

USER:
Currently, the memory heap is stabilized at 120MB after 12 hours of synthetic load testing.

ASSISTANT:
What is the next action?

USER:
Next step is to deploy docker image tag v1.4.2 to the canary cluster.`
    },
    {
      id: "api_design",
      name: "Order Processing API Architecture",
      description: "Tests requirement extraction, API constraints, architectural decisions, and OpenAPI documentation tasks.",
      transcript: `USER:
I need to design a high-throughput REST API for our order processing pipeline.

ASSISTANT:
What are the performance and functional requirements?

USER:
The API must enforce a rate limit of 100 requests per minute per IP address.
Also, the POST /orders endpoint must be strictly idempotent to prevent double charges.

ASSISTANT:
Which infrastructure services will we use for payment and rate limiting?

USER:
We decided to use Stripe webhooks for payment verification and Redis sliding windows for rate limiting.

ASSISTANT:
Are there any unresolved questions or open issues?

USER:
Determining the exact worker queue retry timeout for failed payment webhooks remains an open issue.

ASSISTANT:
And what is the immediate next step?

USER:
Next step is to draft the OpenAPI 3.0 specification file.`
    }
  ];
})();
