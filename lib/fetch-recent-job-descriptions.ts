import { supabase } from "@/lib/supabase"

export type RecentJobDescription = {
  id: string
  job_title: string | null
  full_text: string | null
  created_at: string
}

export const fetchRecentJobDescriptions = async (
  limit = 5,
): Promise<{ data: RecentJobDescription[]; error: string | null }> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: [], error: userError?.message ?? "未登录" }
  }

  const { data, error } = await supabase
    .from("job_descriptions")
    .select("id, job_title, full_text, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data ?? []) as RecentJobDescription[], error: null }
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
