# Billing Experience (Sprint E-1)

**Date:** 2026-05-19  
**Status:** Implemented

## Goals

- Clarify pay-as-you-go vs monthly subscription packages (mock billing)
- Surface low/empty credits in workbench and header
- Centralize credit cost and status thresholds

## Package model

- `BillingPlanKind`: `paygo` | `subscription`
- `OPTIMIZE_CREDIT_COST = 1`, `LOW_CREDITS_THRESHOLD = 2`
- `getCreditsStatus(credits)`: `empty` | `low` | `ok`

## UI

- `BillingPlanComparison` on billing page
- Split package grids: paygo + subscription
- `CreditsLowBanner` on dashboard workbench
- Header credits badge styling by status

## API

- `mock-purchase`: subscription transactions labeled as monthly mock开通
