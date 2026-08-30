import { Router } from 'express';
import { storage } from '../storage';
import { getUncachableStripeClient } from '../stripeClient';

const router = Router();

// List all active products with their prices
router.get('/stripe/products', async (req, res) => {
  const rows = await storage.listProductsWithPrices();

  const productsMap = new Map<string, {
    id: string; name: string; description: string;
    metadata: Record<string, string>; images: string[];
    prices: { id: string; unit_amount: number; currency: string }[];
  }>();

  for (const row of rows) {
    const pid = row.product_id as string;
    if (!productsMap.has(pid)) {
      productsMap.set(pid, {
        id: pid,
        name: row.product_name as string,
        description: row.product_description as string,
        metadata: (row.product_metadata ?? {}) as Record<string, string>,
        images: (row.product_images ?? []) as string[],
        prices: [],
      });
    }
    if (row.price_id) {
      productsMap.get(pid)!.prices.push({
        id: row.price_id as string,
        unit_amount: row.unit_amount as number,
        currency: row.currency as string,
      });
    }
  }

  res.json({ data: Array.from(productsMap.values()) });
});

// Create a Stripe Checkout session for one-time part purchases
router.post('/stripe/checkout', async (req, res) => {
  const { items, customerEmail } = req.body as {
    items: { priceId: string; quantity: number }[];
    customerEmail?: string;
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'items array is required' });
    return;
  }

  // Validate all price IDs exist
  for (const item of items) {
    const price = await storage.getPrice(item.priceId);
    if (!price) {
      res.status(400).json({ error: `Price not found: ${item.priceId}` });
      return;
    }
  }

  const stripe = await getUncachableStripeClient();

  const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: customerEmail || undefined,
    line_items: items.map((item) => ({
      price: item.priceId,
      quantity: item.quantity,
    })),
    shipping_address_collection: {
      allowed_countries: ['US'],
    },
    success_url: `${baseUrl}/?checkout=success`,
    cancel_url: `${baseUrl}/?checkout=cancel`,
  });

  res.json({ url: session.url });
});

// Create a $50 deposit checkout session for a service booking
router.post('/stripe/deposit', async (req, res) => {
  const { customerEmail, customerName, serviceType, vehicleType } = req.body as {
    customerEmail?: string;
    customerName?: string;
    serviceType?: string;
    vehicleType?: string;
  };

  const stripe = await getUncachableStripeClient();
  const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: customerEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: 5000, // $50.00
          product_data: {
            name: 'Service Booking Deposit',
            description: `$50 deposit for ${serviceType ?? 'mobile mechanic service'}${vehicleType ? ` — ${vehicleType}` : ''}. Applied toward your total service cost.`,
            metadata: {
              ...(customerName ? { customer_name: customerName } : {}),
              ...(serviceType ? { service_type: serviceType } : {}),
              ...(vehicleType ? { vehicle_type: vehicleType } : {}),
            },
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/?deposit=success`,
    cancel_url: `${baseUrl}/?deposit=cancel#contact`,
  });

  res.json({ url: session.url });
});

export default router;
