import { runMigrations } from 'stripe-replit-sync';
import { pool } from "@workspace/db";
import { runApplicationMigrations } from "./lib/application-migrations";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL required');

await runMigrations({ databaseUrl });
try {
  await runApplicationMigrations();
} finally {
  await pool.end();
}
