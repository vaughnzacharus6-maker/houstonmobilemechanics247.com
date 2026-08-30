---
name: Customer tracking location privacy
description: Customer-safe location handling for private technician tracking links.
---

Private customer tracking responses must never include latitude, longitude, accuracy, or another precise location object. They may expose a boolean that indicates whether a fresh live location exists, which the UI can use to distinguish a schematic simulation from a live signal.

**Why:** A private tracking URL is customer-facing and can be shared or inspected. Rendering a schematic map is not enough if exact GPS coordinates remain in the response payload.

**How to apply:** Keep precise technician coordinates in authenticated staff-only tracking APIs. Any customer tracking feature must use a privacy-safe presentation state rather than coordinates, including when adding maps, route previews, or ETA enhancements.