import type { AnalysisResult } from "@/components/analysis-panel"
import type { MatchChangeItem, MatchGapItem } from "@/types/matching-history-analysis"

export const MATCH_RESULT_SESSION_KEY = "applyright:v1:lastMatchAnalysis"

export const persistMatchAnalysisResult = (result: AnalysisResult) => {
  if (typeof window === "undefined") {
    return
  }
  try {
    sessionStorage.setItem(MATCH_RESULT_SESSION_KEY, JSON.stringify(result))
  } catch (err) {
    console.error("persistMatchAnalysisResult failed:", err)
  }
}

const parseGapItems = (raw: unknown): MatchGapItem[] | undefined => {
  if (!Array.isArray(raw)) {
    return undefined
  }
  const items = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null
      }
      const row = entry as { keyword?: string; reason?: string }
      const reason = String(row.reason ?? "").trim()
      if (!reason) {
        return null
      }
      return {
        keyword: row.keyword ? String(row.keyword) : undefined,
        reason,
      }
    })
    .filter(Boolean) as MatchGapItem[]
  return items.length ? items : undefined
}

const parseChanges = (raw: unknown): MatchChangeItem[] | undefined => {
  if (!Array.isArray(raw)) {
    return undefined
  }
  const items = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null
      }
      const row = entry as { section?: string; type?: string; summary?: string }
      const section = String(row.section ?? "").trim()
      const summary = String(row.summary ?? "").trim()
      const type = row.type === "add" || row.type === "remove" ? row.type : "rewrite"
      if (!section || !summary) {
        return null
      }
      return { section, type, summary }
    })
    .filter(Boolean) as MatchChangeItem[]
  return items.length ? items : undefined
}

export const readMatchAnalysisResult = (): AnalysisResult | null => {
  if (typeof window === "undefined") {
    return null
  }
  try {
    const raw = sessionStorage.getItem(MATCH_RESULT_SESSION_KEY)
    if (!raw?.trim()) {
      return null
    }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") {
      return null
    }
    const data = parsed as Partial<AnalysisResult>
    if (
      typeof data.matchScore !== "number" ||
      !Array.isArray(data.strengths) ||
      !Array.isArray(data.weaknesses) ||
      typeof data.originalContent !== "string" ||
      typeof data.optimizedContent !== "string"
    ) {
      return null
    }
    return {
      matchScore: data.matchScore,
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      missingKeywords: Array.isArray(data.missingKeywords) ? data.missingKeywords : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      originalContent: data.originalContent,
      optimizedContent: data.optimizedContent,
      optimizedContentPlain:
        typeof data.optimizedContentPlain === "string" ? data.optimizedContentPlain : undefined,
      scoreSummary: typeof data.scoreSummary === "string" ? data.scoreSummary : undefined,
      gapItems: data.gapItems ?? parseGapItems((data as { gap_items?: unknown }).gap_items),
      changes: data.changes ?? parseChanges((data as { changes?: unknown }).changes),
    }
  } catch {
    return null
  }
}
