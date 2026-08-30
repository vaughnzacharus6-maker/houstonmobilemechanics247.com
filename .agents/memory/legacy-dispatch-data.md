---
name: Legacy dispatch data normalization
description: Older service-call records can retain urgency and deposit values that no longer satisfy the current API contract.
---

Older service-call records may contain the former `low` / `medium` / `high` urgency values and unpaid or zero-value deposit defaults. API serialization must normalize these to the current urgency and pending-deposit contract before returning a service call, including after an edit.

**Why:** Editing a legacy call originally succeeded in the database but failed when the response no longer satisfied the generated current API schema, leaving Dispatch with a misleading save error.

**How to apply:** Preserve the strict current request/response contract. When a legacy service call is read or used as a fallback during an edit, map its legacy urgency and deposit state to the supported values rather than sending an invalid historical value to a client or response validator.