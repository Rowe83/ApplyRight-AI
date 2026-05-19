# Workbench Onboarding (Sprint D-1)

**Date:** 2026-05-19  
**Status:** Approved  
**Scope:** First-time user guidance on dashboard without product tours.

## Goals

- New users see a 1→2→3 checklist within 3 seconds.
- Right panel explains where results appear instead of a vague empty state.
- After first successful analysis, guidance collapses and does not nag.

## Components

- `lib/workbench-onboarding.ts` — step state, localStorage, JD min length
- `WorkbenchStepChecklist` — three-step progress UI
- `DashboardResultPlaceholder` — right panel empty guide
- `UploadPanel` — checklist + disabled CTA hints
- `DashboardShell` — first-time user probe, placeholder, mark analysis complete

## Rules

- Step ② requires JD trim length ≥ 20 characters.
- Step ③ completes on successful `/api/optimize` response.
- First-time user: resume count = 0 AND matching history count = 0.
- No fullscreen tours or forced step locking.
