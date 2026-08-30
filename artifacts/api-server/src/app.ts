import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { WebhookHandlers } from "./webhookHandlers";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { phoneWebhookRouter } from "./routes/phone";

const app: Express = express();

export function serializeRequestUrl(url?: string) {
  const path = url?.split("?")[0];
  if (!path) return path;
  if (/^\/api\/receipts\/public\/[^/]+$/.test(path)) {
    return "/api/receipts/public/[redacted]";
  }
  if (/^\/api\/tracking\/[^/]+(?:\/conversation(?:\/messages)?)?$/.test(path)) {
    return path.replace(/^\/api\/tracking\/[^/]+/, "/api/tracking/[redacted]");
  }
  return path;
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: serializeRequestUrl(req.url) };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Stripe webhook MUST be registered BEFORE express.json()
// It needs the raw Buffer body, not parsed JSON
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature' });
      return;
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error({ err: error }, 'Stripe webhook error');
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(
  "/api/phone/webhooks",
  express.raw({ type: ["application/json", "application/x-www-form-urlencoded"], limit: "64kb" }),
  phoneWebhookRouter,
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
    jwtKey: process.env.CLERK_JWT_KEY,
  })),
);

app.use("/api", router);

export default app;
