import app from "./app";
import { logger } from "./lib/logger";
import { getStripeSync } from "./stripeClient";
import { runApplicationMigrations } from "./lib/application-migrations";
import { startTechnicianNotificationWorker } from "./lib/technician-notifications";

async function initStripe() {
  try {
    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info('Stripe webhook configured');

    stripeSync.syncBackfill()
      .then(() => logger.info('Stripe data synced'))
      .catch((err) => logger.error({ err }, 'Stripe sync error'));
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Stripe — continuing without Stripe');
  }
}

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

await runApplicationMigrations();
startTechnicianNotificationWorker();
await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
