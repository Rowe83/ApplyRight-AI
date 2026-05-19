import type { JobDescriptionRecord } from "@/types/resume"

export type RecentJobDescription = JobDescriptionRecord

export const fetchRecentJobDescriptions = async (
  limit = 5,
): Promise<{ data: RecentJobDescription[]; error: string | null }> => {
  try {
    const res = await fetch(`/api/job-descriptions?limit=${limit}`)
    const data = (await res.json()) as RecentJobDescription[] & { error?: string }
    if (!res.ok) {
      const message =
        typeof data === "object" && data && "error" in data
          ? String((data as { error?: string }).error)
          : `HTTP ${res.status}`
      return { data: [], error: message }
    }
    return { data: Array.isArray(data) ? data : [], error: null }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "加载 JD 失败",
    }
  }
}

export const pickJdPreviewLabel = (row: RecentJobDescription): string => {
  const title = row.job_title?.trim()
  if (title) {
    return title.length > 28 ? `${title.slice(0, 28)}…` : title
  }
  const firstLine =
    row.full_text
      ?.split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "未命名岗位"
  return firstLine.length > 28 ? `${firstLine.slice(0, 28)}…` : firstLine
}
