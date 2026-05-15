#!/usr/bin/env node
/**
 * Applies supabase/migrations/20260513140000_credits_billing.sql to your project.
 *
 * Set DATABASE_URL (Supabase → Project Settings → Database → Connection string, URI).
 * Example: postgresql://postgres.[ref]:[PASSWORD]@aws-0-xxx.pooler.supabase.com:6543/postgres
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationPath = join(
  __dirname,
  "../supabase/migrations/20260513140000_credits_billing.sql",
)

const databaseUrl = process.env.DATABASE_URL?.trim()

if (!databaseUrl) {
  console.error(`
Missing DATABASE_URL.

1. Supabase Dashboard → Project Settings → Database → Connection string (URI)
2. Run:

   DATABASE_URL='postgresql://...' npm run db:apply-credits-billing

Or paste the SQL file into SQL Editor:
   supabase/migrations/20260513140000_credits_billing.sql
`)
  process.exit(1)
}

const sql = readFileSync(migrationPath, "utf8")

let pg
try {
  pg = await import("pg")
} catch {
  console.error("Install pg first: npm install --save-dev pg")
  process.exit(1)
}

const client = new pg.default.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  await client.query(sql)
  console.log("Applied credits billing migration (profiles, credit_transactions, RPC functions).")
} catch (err) {
  console.error("Migration failed:", err.message ?? err)
  process.exit(1)
} finally {
  await client.end()
}
