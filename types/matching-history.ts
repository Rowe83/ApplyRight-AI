export type MatchingHistoryRow = {
  id: string
  user_id: string
  resume_id: string | null
  resume_title: string | null
  target_job: string | null
  score: number | null
  raw_text_snapshot: string | null
  optimized_text_snapshot: string | null
  created_at: string
}
