---
name: Manual deposit verification
description: Rules for recording deposits received outside Stripe in the operations portal.
---

Outside payments are recorded by owners or admins as manually verified deposits. A confirmation requires a positive amount and a payment method; the portal must not provide a “waive deposit” action.

**Why:** The business commonly receives deposits through Zelle and other person-to-person methods, but still needs an accountable internal confirmation rather than treating those payments as Stripe transactions.

**How to apply:** Keep manual verification restricted to owner/admin roles, retain the method, amount, timestamp, optional reference, and confirming account, and never let a technician or customer approve a deposit.