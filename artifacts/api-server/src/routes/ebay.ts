import { Router } from 'express';
import { logger } from '../lib/logger';

const router = Router();

// In-memory token cache (tokens last 2 hours, we refresh at 90 minutes)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getEbayToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.token;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET environment variables are required');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const resp = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`eBay OAuth failed: ${resp.status} — ${text}`);
  }

  const data = await resp.json() as { access_token: string; expires_in: number };

  // Cache for 90 minutes (token lasts 7200s = 2h)
  cachedToken = {
    token: data.access_token,
    expiresAt: now + 90 * 60 * 1000,
  };

  return data.access_token;
}

// Map our UI categories to eBay search queries
const CATEGORY_QUERIES: Record<string, { q: string; categoryId: string }> = {
  'Oil Filters':   { q: 'oil filter car truck', categoryId: '179966' },
  'Brake Pads':    { q: 'brake pads set',        categoryId: '33559'  },
  'Batteries':     { q: 'car battery 12v',       categoryId: '31670'  },
  'Spark Plugs':   { q: 'spark plugs set',        categoryId: '33631'  },
  'Air Filters':   { q: 'engine air filter',      categoryId: '179979' },
  'Wiper Blades':  { q: 'wiper blades pair',      categoryId: '33626'  },
  'Cooling':       { q: 'radiator coolant flush',  categoryId: '33554'  },
  'Belts':         { q: 'serpentine belt',         categoryId: '33552'  },
};

function buildAffiliateUrl(itemUrl: string): string {
  const campId = process.env.EBAY_CAMPAIGN_ID;
  if (!campId) return itemUrl;
  // eBay Partner Network tracking parameters
  const url = new URL(itemUrl);
  url.searchParams.set('mkevt', '1');
  url.searchParams.set('mkcid', '1');
  url.searchParams.set('mkrid', '711-53200-19255-0');
  url.searchParams.set('campid', campId);
  url.searchParams.set('toolid', '10001');
  return url.toString();
}

// GET /ebay/parts?q=oil+filter&category=Oil+Filters&limit=12
router.get('/ebay/parts', async (req, res) => {
  const clientId = process.env.EBAY_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: 'eBay not configured', data: [] });
    return;
  }

  const q = (req.query.q as string) || 'car parts';
  const category = req.query.category as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 12, 24);

  let searchQ = q;
  let categoryId: string | undefined;

  if (category && CATEGORY_QUERIES[category]) {
    searchQ = CATEGORY_QUERIES[category].q;
    categoryId = CATEGORY_QUERIES[category].categoryId;
  }

  try {
    const token = await getEbayToken();

    const params = new URLSearchParams({
      q: searchQ,
      limit: String(limit),
      filter: 'buyingOptions:{FIXED_PRICE},conditions:{NEW}',
    });
    if (categoryId) params.set('category_ids', categoryId);

    const searchResp = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!searchResp.ok) {
      const text = await searchResp.text();
      logger.error({ status: searchResp.status, body: text }, 'eBay search failed');
      res.status(502).json({ error: 'eBay search failed', data: [] });
      return;
    }

    const ebayData = await searchResp.json() as {
      itemSummaries?: Array<{
        itemId: string;
        title: string;
        price?: { value: string; currency: string };
        image?: { imageUrl: string };
        itemWebUrl: string;
        condition?: string;
        seller?: { username: string; feedbackPercentage: string };
        shippingOptions?: Array<{ shippingCost?: { value: string } }>;
      }>;
    };

    const items = (ebayData.itemSummaries ?? []).map((item) => ({
      id: item.itemId,
      title: item.title,
      price: item.price ? parseFloat(item.price.value) : null,
      currency: item.price?.currency ?? 'USD',
      imageUrl: item.image?.imageUrl ?? null,
      itemUrl: buildAffiliateUrl(item.itemWebUrl),
      condition: item.condition ?? 'New',
      shipping: item.shippingOptions?.[0]?.shippingCost?.value ?? null,
      seller: item.seller?.username ?? null,
      sellerFeedback: item.seller?.feedbackPercentage ?? null,
    }));

    res.json({ data: items, total: items.length });
  } catch (err) {
    logger.error({ err }, 'eBay parts error');
    res.status(500).json({ error: 'Failed to fetch eBay parts', data: [] });
  }
});

// GET /ebay/status — check if eBay is configured
router.get('/ebay/status', (_req, res) => {
  res.json({ configured: !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET) });
});

export default router;
