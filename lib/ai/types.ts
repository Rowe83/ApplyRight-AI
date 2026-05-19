export type OptimizeAiResult = {
  match_score: number
  score_summary: string
  strengths: string[]
  weaknesses: string[]
  missing_keywords: string[]
  gap_items: { keyword?: string; reason: string }[]
  core_suggestions: string[]
  changes: { section: string; type: "rewrite" | "add" | "remove"; summary: string }[]
  optimized_content: string
  optimized_content_plain: string
}
