---
name: Technician dispatch SMS delivery safety
description: How dispatch SMS delivery states protect technicians from duplicate alert messages.
---

Treat notification delivery as at-least-once until the SMS provider acceptance is durably confirmed. Only a confirmed rejection before provider acceptance may be retried automatically. Timeouts, transport loss after submission, stalled work, and failure to persist a successful provider response are ambiguous outcomes and must require manual verification before another SMS is sent.

**Why:** A provider can accept and deliver an SMS even when the application loses the response. Treating that case as an ordinary failed delivery creates duplicate technician dispatch alerts.

**How to apply:** Keep ambiguous delivery states distinct from retryable failures in storage, API authorization, and dispatcher UI. Recovery workers should surface ambiguity for verification rather than returning it to the send queue.