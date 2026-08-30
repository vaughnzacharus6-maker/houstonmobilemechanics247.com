---
name: Twilio trial constraints
description: Distinguishes Twilio trial recipient restrictions from integration authentication failures.
---

Twilio trial mode can reject messages to phone numbers that are not verified on the account, but it should not make an authenticated account lookup return 401.

**Why:** A trial account can still authenticate and access account APIs; recipient restrictions are applied when sending messages.

**How to apply:** Treat a Twilio account lookup 401 as an integration credential/account mismatch. After repairing the connection, verify the owner and technician numbers before testing SMS, and use a Twilio SMS-capable sender number.