# Billing Experience (Sprint E-2)

**Date:** 2026-05-19  
**Status:** Implemented

## Goals

- Real payments via **Stripe Checkout** (CNY)
- Supports card, Alipay, WeChat Pay when enabled on the Stripe account
- Idempotent credit fulfillment; mock purchase only in dev / when explicitly allowed

## Architecture

```
Billing UI → POST /api/billing/create-checkout → Stripe Hosted Checkout
Stripe Webhook → POST /api/billing/webhook → fulfillPackagePurchase
Return URL → POST /api/billing/verify-session (fallback if webhook delayed)
```

## Data

- `payment_orders` table: `provider_session_id` unique, status `pending` | `completed`
- Shared fulfillment: `lib/billing-fulfill.ts`

## Environment

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server-side Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `NEXT_PUBLIC_SITE_URL` | Checkout success/cancel URLs |
| `NEXT_PUBLIC_BILLING_MOCK` | Show mock pay button with Stripe enabled |

## Local webhook

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

## Packages

- `unlimited` tier: `stripePurchasable: false` (mock only)
- All other tiers include `priceCents` for Stripe line items

## Migration

```bash
DATABASE_URL='postgresql://...' npm run db:apply-payment-orders
```
