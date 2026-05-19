import type { MatchingHistoryRow } from "@/types/matching-history"

export const fetchMatchingHistoryById = async (
  historyId: string,
): Promise<{ data: MatchingHistoryRow | null; error: string | null }> => {
  try {
    const res = await fetch(`/api/history/${encodeURIComponent(historyId)}`)
    const data = (await res.json()) as MatchingHistoryRow & { error?: string }
    if (!res.ok) {
      return { data: null, error: data.error ?? `HTTP ${res.status}` }
    }
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "加载历史失败",
    }
  }
}
