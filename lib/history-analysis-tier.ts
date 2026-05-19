import type { MatchingHistoryRow } from "@/types/matching-history"
import type { MatchingHistoryAnalysisJson } from "@/types/matching-history-analysis"

export type HistoryAnalysisTier = "full" | "partial" | "diff-only"

export type HistoryAnalysisTierInfo = {
  tier: HistoryAnalysisTier
  /** Machine-readable hints for UI copy */
  missing: string[]
}

export const isAnalysisJson = (value: unknown): value is MatchingHistoryAnalysisJson => {
  if (!value || typeof value !== "object") {
    return false
  }
  const row = value as Partial<MatchingHistoryAnalysisJson>
  return typeof row.match_score === "number" && Array.isArray(row.strengths)
}

export const getHistoryAnalysisTier = (
  row: Pick<MatchingHistoryRow, "analysis_json">,
): HistoryAnalysisTierInfo => {
  const json = row.analysis_json
  if (!isAnalysisJson(json)) {
    return { tier: "diff-only", missing: ["analysis_json"] }
  }

  const missing: string[] = []
  const hasChanges = Array.isArray(json.changes) && json.changes.length > 0
  const hasGaps = Array.isArray(json.gap_items) && json.gap_items.length > 0
  const hasSuggestions =
    Array.isArray(json.core_suggestions) && json.core_suggestions.length > 0

  if (!hasChanges) {
    missing.push("changes")
  }
  if (!hasGaps) {
    missing.push("gap_items")
  }
  if (!hasSuggestions) {
    missing.push("core_suggestions")
  }
  if (!json.score_summary?.trim()) {
    missing.push("score_summary")
  }
  if (!json.optimized_content_plain?.trim()) {
    missing.push("optimized_content_plain")
  }

  if ((hasChanges || hasGaps) && hasSuggestions) {
    return { tier: "full", missing }
  }

  return { tier: "partial", missing }
}

export const HISTORY_TIER_LABELS: Record<HistoryAnalysisTier, string> = {
  full: "完整分析",
  partial: "部分分析",
  "diff-only": "仅 Diff",
}

export const HISTORY_TIER_BADGE_CLASS: Record<HistoryAnalysisTier, string> = {
  full: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partial: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "diff-only": "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
}
