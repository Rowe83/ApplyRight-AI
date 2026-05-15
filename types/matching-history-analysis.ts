export type MatchGapItem = {
  keyword?: string
  reason: string
}

export type MatchChangeItem = {
  section: string
  type: "rewrite" | "add" | "remove"
  summary: string
}

/** Persisted in matching_histories.analysis_json */
export type MatchingHistoryAnalysisJson = {
  match_score: number
  score_summary?: string
  strengths: string[]
  weaknesses: string[]
  missing_keywords: string[]
  core_suggestions: string[]
  gap_items?: MatchGapItem[]
  changes?: MatchChangeItem[]
  optimized_content_plain?: string
}
