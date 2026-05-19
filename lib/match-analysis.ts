import type { AnalysisResult } from "@/components/analysis-panel"
import type {
  MatchChangeItem,
  MatchGapItem,
  MatchingHistoryAnalysisJson,
} from "@/types/matching-history-analysis"
import { toPlainResumeText } from "@/lib/plain-resume-text"
import type { MatchingHistoryRow } from "@/types/matching-history"
import { getHistoryAnalysisTier, isAnalysisJson } from "@/lib/history-analysis-tier"

const CHANGE_TYPES = new Set<MatchChangeItem["type"]>(["rewrite", "add", "remove"])

export const normalizeGapItems = (raw: unknown, fallbackKeywords: string[]): MatchGapItem[] => {
  if (Array.isArray(raw)) {
    const items = raw
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null
        }
        const row = entry as { keyword?: string; reason?: string; text?: string }
        const reason = String(row.reason ?? row.text ?? "").trim()
        const keyword = row.keyword ? String(row.keyword).trim() : undefined
        if (!reason && !keyword) {
          return null
        }
        return { keyword, reason: reason || `JD 要求：${keyword}` }
      })
      .filter(Boolean) as MatchGapItem[]
    if (items.length > 0) {
      return items.slice(0, 10)
    }
  }

  return fallbackKeywords.slice(0, 10).map((keyword) => ({
    keyword,
    reason: "简历中未充分体现该 JD 关键词",
  }))
}

export const normalizeChanges = (raw: unknown): MatchChangeItem[] => {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null
      }
      const row = entry as { section?: string; type?: string; summary?: string }
      const section = String(row.section ?? "").trim()
      const summary = String(row.summary ?? "").trim()
      const type = CHANGE_TYPES.has(row.type as MatchChangeItem["type"])
        ? (row.type as MatchChangeItem["type"])
        : "rewrite"
      if (!section || !summary) {
        return null
      }
      return { section, type, summary }
    })
    .filter(Boolean)
    .slice(0, 12) as MatchChangeItem[]
}

export const buildAnalysisJson = (input: {
  match_score: number
  score_summary?: string
  strengths: string[]
  weaknesses: string[]
  missing_keywords: string[]
  core_suggestions: string[]
  gap_items?: MatchGapItem[]
  changes?: MatchChangeItem[]
  optimized_content_plain?: string
}): MatchingHistoryAnalysisJson => ({
  match_score: input.match_score,
  score_summary: input.score_summary,
  strengths: input.strengths,
  weaknesses: input.weaknesses,
  missing_keywords: input.missing_keywords,
  core_suggestions: input.core_suggestions,
  gap_items: input.gap_items,
  changes: input.changes,
  optimized_content_plain: input.optimized_content_plain,
})

export const apiPayloadToAnalysisResult = (input: {
  match_score?: number
  score?: number
  score_summary?: string
  strengths?: string[]
  weaknesses?: string[]
  missing_keywords?: string[]
  gap_items?: MatchGapItem[]
  changes?: MatchChangeItem[]
  suggestions?: string[]
  core_suggestions?: string[]
  top_3_suggestions?: string[]
  original_content?: string
  optimized_content?: string
  optimized_content_plain?: string
  revised_summary?: string
}): AnalysisResult => {
  const strengths = Array.isArray(input.strengths)
    ? input.strengths.filter(Boolean).slice(0, 5)
    : []
  const weaknesses = Array.isArray(input.weaknesses)
    ? input.weaknesses.filter(Boolean).slice(0, 5)
    : []
  const missingKeywords = Array.isArray(input.missing_keywords)
    ? input.missing_keywords.filter(Boolean)
    : []

  const suggestionItems = Array.isArray(input.suggestions)
    ? input.suggestions.filter(Boolean)
    : Array.isArray(input.core_suggestions)
      ? input.core_suggestions.filter(Boolean)
      : Array.isArray(input.top_3_suggestions)
        ? input.top_3_suggestions.filter(Boolean)
        : []

  const rawScore = input.match_score ?? input.score
  const scoreNum = Number(rawScore)
  const safeScore = Number.isFinite(scoreNum) ? scoreNum : 0

  const optimizedContent = input.optimized_content ?? input.revised_summary ?? ""
  const optimizedContentPlain =
    input.optimized_content_plain?.trim() || toPlainResumeText(optimizedContent)

  const gapItems = normalizeGapItems(input.gap_items, missingKeywords)
  const changes = normalizeChanges(input.changes)

  const scoreSummary =
    input.score_summary?.trim() ||
    weaknesses[0] ||
    (missingKeywords.length > 0
      ? `主要缺口：${missingKeywords.slice(0, 3).join("、")}`
      : undefined)

  return {
    matchScore: safeScore,
    strengths: strengths.length >= 1 ? strengths : suggestionItems.slice(0, 5),
    weaknesses: weaknesses.length >= 1 ? weaknesses : suggestionItems.slice(0, 5),
    missingKeywords,
    suggestions: [
      {
        category: "核心优化建议",
        items: suggestionItems,
      },
    ],
    originalContent: input.original_content ?? "",
    optimizedContent,
    optimizedContentPlain,
    scoreSummary,
    gapItems,
    changes,
  }
}

export const matchingHistoryRowToResult = (row: MatchingHistoryRow): AnalysisResult | null => {
  const raw = row.raw_text_snapshot ?? ""
  const optimized = row.optimized_text_snapshot ?? ""
  if (!raw.trim() && !optimized.trim()) {
    return null
  }

  const plainFromSnapshot = toPlainResumeText(optimized)

  if (isAnalysisJson(row.analysis_json)) {
    const json = row.analysis_json
    const base = apiPayloadToAnalysisResult({
      match_score: json.match_score,
      score_summary: json.score_summary,
      strengths: json.strengths,
      weaknesses: json.weaknesses,
      missing_keywords: json.missing_keywords,
      core_suggestions: json.core_suggestions,
      gap_items: json.gap_items,
      changes: json.changes,
      original_content: raw,
      optimized_content: optimized,
      optimized_content_plain: json.optimized_content_plain?.trim() || plainFromSnapshot,
    })
    return base
  }

  return apiPayloadToAnalysisResult({
    match_score: row.score ?? 0,
    original_content: raw,
    optimized_content: optimized,
    optimized_content_plain: plainFromSnapshot,
  })
}

export { getHistoryAnalysisTier }

export const getOptimizedTextForDiff = (result: AnalysisResult): string =>
  result.optimizedContentPlain?.trim() || result.optimizedContent

const sanitizeFilenamePart = (value: string, maxLen = 48) =>
  value
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, maxLen)
    .replace(/^_+|_+$/g, "") || "resume"

export const buildSaveAsResumeFilename = (
  resumeTitle?: string | null,
  targetJob?: string | null,
) => {
  const titlePart = sanitizeFilenamePart(resumeTitle?.trim() || "优化简历", 40)
  const jobPart = targetJob?.trim() ? sanitizeFilenamePart(targetJob.trim(), 32) : ""
  const composed = jobPart ? `${titlePart}_${jobPart}_optimized` : `${titlePart}_optimized`
  return `${composed}.md`.slice(0, 2048)
}
