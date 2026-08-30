---
name: Technician portal access model
description: Bootstrap, role, and data-visibility rules for the internal technician portal.
---

The first Clerk-authenticated person to open the operations portal is provisioned as the owner. Later signed-in people are matched to a pre-created technician by email, or provisioned as technicians.

**Why:** The business needs a practical first-run setup without exposing a public owner-registration path, while owners need to invite workers before those workers sign in.

**How to apply:** Keep customer-call data server-authorized. Technicians may only read and update calls assigned to their own profile; owners and admins may manage all calls, pay amounts, workers, and contracts. Do not reintroduce a public endpoint for internal contact records.