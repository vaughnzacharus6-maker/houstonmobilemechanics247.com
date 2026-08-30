---
name: Stripe integration credentials
description: Correct field names when fetching Stripe credentials from Replit connectors API
---

When fetching Stripe credentials via `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`:

- The auth header is `"X-Replit-Token"` (NOT `X_REPLIT_TOKEN`)
- The secret key field in `settings` is `secret` (NOT `secret_key`)
- Full shape: `data.items?.[0]?.settings.secret` for the Stripe secret key
- Webhook secret: `data.items?.[0]?.settings.webhook_secret`

**Why:** These are the actual field names returned by the Replit connectors API for Stripe. The wrong names silently return undefined or cause 401 errors.

**How to apply:** Any time you write or update a stripeClient.ts that fetches credentials from the connectors API proxy.
