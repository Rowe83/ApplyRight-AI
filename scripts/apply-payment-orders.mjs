#!/usr/bin/env node
/**
 * Applies supabase/migrations/20260519120000_payment_orders.sql
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationPath = join(
  __dirname,
  "../supabase/migrations/20260519120000_payment_orders.sql",
)

const databaseUrl = process.env.DATABASE_URL?.trim()

if (!databaseUrl) {
  console.error(`
Missing DATABASE_URL.

DATABASE_URL='postgresql://...' npm run db:apply-payment-orders

Or paste SQL from:
  supabase/migrations/20260519120000_payment_orders.sql
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
  console.log("Applied payment_orders migration.")
} catch (err) {
  console.error("Migration failed:", err.message ?? err)
  process.exit(1)
} finally {
  await client.end()
}
