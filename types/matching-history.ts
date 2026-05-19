import type { MatchingHistoryAnalysisJson } from "@/types/matching-history-analysis"

export type MatchingHistoryRow = {
  id: string
  resume_id: string | null
  resume_title: string | null
  target_job: string | null
  jd_id?: string | null
  jd_text?: string | null
  score: number | null
  raw_text_snapshot: string | null
  optimized_text_snapshot: string | null
  analysis_json: MatchingHistoryAnalysisJson | null
  created_at: string
}
