---
name: Phone intake privacy lifecycle
description: Consent, access, and provider-side deletion rules for recorded inbound phone intake.
---

Inbound phone intake recordings must be accepted only from a signed provider callback, and their transcript, draft, and recording metadata remain visible only to owner/admin dispatchers. The caller receives the recording/transcription notice before recording begins.

**Why:** Caller recordings contain sensitive personal and service information. Clearing an app-local URL is not a completed retention action if the provider still holds the audio.

**How to apply:** Treat retention as complete only after the provider confirms deletion (or reports it already absent). Keep a failed provider deletion in an explicit retryable state with the provider recording identifier intact; never silently downgrade it to expired.