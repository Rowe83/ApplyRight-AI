import { supabase } from "@/lib/supabase"
import type { MatchingHistoryRow } from "@/types/matching-history"

const HISTORY_SELECT_FULL =
  "id, user_id, resume_id, resume_title, target_job, score, raw_text_snapshot, optimized_text_snapshot, analysis_json, created_at"

const HISTORY_SELECT_LEGACY =
  "id, user_id, resume_id, resume_title, target_job, score, raw_text_snapshot, optimized_text_snapshot, created_at"

export const fetchMatchingHistoryById = async (
  historyId: string,
  userId: string,
): Promise<{ data: MatchingHistoryRow | null; error: string | null }> => {
  const full = await supabase
    .from("matching_histories")
    .select(HISTORY_SELECT_FULL)
    .eq("id", historyId)
    .eq("user_id", userId)
    .maybeSingle<MatchingHistoryRow>()

  if (!full.error) {
    return { data: full.data, error: null }
  }

  const legacy = await supabase
    .from("matching_histories")
    .select(HISTORY_SELECT_LEGACY)
    .eq("id", historyId)
    .eq("user_id", userId)
    .maybeSingle<MatchingHistoryRow>()

  if (legacy.error) {
    return { data: null, error: legacy.error.message }
  }

  return {
    data: legacy.data ? { ...legacy.data, analysis_json: null } : null,
    error: null,
  }
}
