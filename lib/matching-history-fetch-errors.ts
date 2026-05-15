export type HistoryFetchErrorKind =
  | "missing_table"
  | "missing_analysis_json_column"
  | "rls"
  | "network"
  | "unknown"

export type ParsedHistoryFetchError = {
  kind: HistoryFetchErrorKind
  /** Short user-facing summary */
  message: string
  /** Original message / code for logs & optional UI details */
  technical?: string
}

const readString = (obj: unknown, key: string): string | undefined => {
  if (!obj || typeof obj !== "object") {
    return undefined
  }
  const v = (obj as Record<string, unknown>)[key]
  return typeof v === "string" ? v : undefined
}

export const parseHistoryFetchError = (e: unknown): ParsedHistoryFetchError => {
  const message = readString(e, "message")
  const code = readString(e, "code")
  const details = readString(e, "details")
  const hint = readString(e, "hint")

  const raw =
    message ??
    (e instanceof Error ? e.message : undefined) ??
    (typeof e === "string" ? e : null) ??
    "未知错误"

  const combined = [raw, details, hint].filter(Boolean).join(" | ")

  const looksLikeMissingTable =
    code === "42P01" ||
    code === "PGRST205" ||
    (/\bmatching_histories\b/i.test(combined) &&
      (/schema cache|does not exist|Could not find the table|relation\b/i.test(combined) ||
        /undefined_table/i.test(combined)))

  if (looksLikeMissingTable) {
    return {
      kind: "missing_table",
      message: "尚未在数据库中创建 matching_histories 表。请在 Supabase SQL Editor 中执行下方脚本后点击「重试」。",
      technical: combined,
    }
  }

  const looksLikeMissingAnalysisJson =
    /analysis_json/i.test(combined) &&
    (/column|does not exist|Could not find/i.test(combined) || code === "42703")

  if (looksLikeMissingAnalysisJson) {
    return {
      kind: "missing_analysis_json_column",
      message:
        "matching_histories 表缺少 analysis_json 列。请执行 analysis_json 迁移脚本，或运行 npm run db:apply-analysis-json 后重试。",
      technical: combined,
    }
  }

  if (
    code === "42501" ||
    /permission denied for table|new row violates row-level security|RLS/i.test(combined)
  ) {
    return {
      kind: "rls",
      message: "当前账号无权读取匹配历史。请确认已登录，并检查 matching_histories 的 RLS（SELECT 需满足 user_id = auth.uid()）。",
      technical: combined,
    }
  }

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(combined)) {
    return {
      kind: "network",
      message: "网络异常，请检查连接后重试。",
      technical: combined,
    }
  }

  return {
    kind: "unknown",
    message: "数据加载失败，请重试。",
    technical: combined,
  }
}
