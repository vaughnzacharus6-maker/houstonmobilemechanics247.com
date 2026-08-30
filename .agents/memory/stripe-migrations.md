---
name: stripe-replit-sync migrations in esbuild
description: runMigrations() from stripe-replit-sync breaks when called inside an esbuild ESM bundle due to __dirname resolution
---

`runMigrations()` from `stripe-replit-sync` resolves its SQL migration files relative to `__dirname` at runtime. When the server is bundled with esbuild, `__dirname` points to the `dist/` folder, not the node_modules folder where migrations live — so no tables are created (silently).

**Fix:** Run migrations via a separate `tsx` pre-step before building and starting the bundle:
- Create `src/migrate.ts` that just imports and calls `runMigrations({ databaseUrl })`
- Add `"migrate": "tsx src/migrate.ts"` to package.json scripts
- Update `dev` script to: `pnpm run migrate && pnpm run build && pnpm run start`

**Why:** tsx resolves `__dirname` correctly because it runs the TypeScript file directly in the source tree, not from a bundle.

**How to apply:** Any Express API server using stripe-replit-sync in a pnpm monorepo with esbuild bundling.

**Version note:** stripe-replit-sync v0.0.6 has a bug where `_managed_webhooks` table isn't created. Use v1.0.0+. If upgrading from v0.0.6, DROP SCHEMA stripe CASCADE to let v1.0.0 run all migrations fresh.
