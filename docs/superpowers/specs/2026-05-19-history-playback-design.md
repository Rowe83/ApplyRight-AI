# History Playback Tiers (Sprint 1)

**Date:** 2026-05-19  
**Status:** Approved  
**Scope:** Legacy `matching_histories` replay without AI backfill or schema changes.

## Problem

Older rows may lack `analysis_json` or store incomplete structured analysis. The result page reused the full-analysis UI, so empty sidebars and broken keyword/change navigation felt like bugs.

## Tier Model

| Tier | Detection | User-facing capabilities |
|------|-----------|-------------------------|
| `full` | Valid `analysis_json` with (`changes` or `gap_items`) and `core_suggestions` | Full summary, change list, keyword jump, refine panel, Diff |
| `partial` | Valid `analysis_json` but not `full` | Summary from saved fields, Diff with client-derived `optimized_content_plain`; no change list / refine / keyword jump |
| `diff-only` | No valid `analysis_json` | Score (if present) + Diff only; banner explains legacy snapshot |

## Rules

- Never fabricate AI `gap_items` or `changes` for legacy rows.
- Always derive `optimized_content_plain` from snapshots when missing (`toPlainResumeText`).
- Session-based results (no `historyId`) are treated as `full`.

## Components

- `lib/history-analysis-tier.ts` — `getHistoryAnalysisTier`, labels
- `components/history-legacy-banner.tsx` — tier-specific banner on result page
- `AnalysisPanel` — `playbackTier` prop gates interactive features
- History list — load `analysis_json`, show tier badge, adjust link label for `diff-only`

## Out of Scope (Sprint 2)

- `jd_text_snapshot` column
- Paid “re-analyze to backfill” API

## Success Criteria

- Opening an old history never shows empty interactive controls without explanation.
- List view distinguishes full / partial / diff-only at a glance.
- Diff remains usable for all tiers with plain-text preprocessing.
