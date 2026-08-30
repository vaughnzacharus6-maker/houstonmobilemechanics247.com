---
name: eBay Integration
description: eBay Motors affiliate shop setup — env vars, API flow, dual-mode parts shop
---

## What was built

The parts shop has two modes determined at runtime by `GET /api/ebay/status`:
- **eBay mode** (when `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` set): shows real eBay Motors parts with photos, prices, "Buy on eBay" buttons. Affiliate commission via eBay Partner Network.
- **Stripe mode** (fallback): shows seeded Stripe catalog with cart + checkout.

## Required env vars

| Var | Source |
|-----|--------|
| `EBAY_CLIENT_ID` | developer.ebay.com → App ID |
| `EBAY_CLIENT_SECRET` | developer.ebay.com → App Secret |
| `EBAY_CAMPAIGN_ID` | eBay Partner Network → Campaign ID (optional, for affiliate tracking) |

## API flow

1. `GET /api/ebay/status` — returns `{ configured: boolean }`, no auth needed
2. `GET /api/ebay/parts?q=&category=&limit=` — proxies eBay Browse API
   - Uses Client Credentials OAuth (token cached 90 min, tokens last 2h)
   - Token endpoint: `POST https://api.ebay.com/identity/v1/oauth2/token`
   - Search endpoint: `GET https://api.ebay.com/buy/browse/v1/item_summary/search`
   - When unconfigured: returns `503 { error, data: [] }` gracefully

## Category → eBay category ID mapping

Defined in `artifacts/api-server/src/routes/ebay.ts` → `CATEGORY_QUERIES` map.

**Why:** eBay category IDs improve search relevance for specific part types.

## Affiliate URLs

When `EBAY_CAMPAIGN_ID` is set, item URLs are rewritten with EPN tracking params (`mkevt`, `mkcid`, `mkrid`, `campid`, `toolid`). Without it, direct eBay URLs are used.
