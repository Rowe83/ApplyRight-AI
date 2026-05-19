import "server-only"
import { normalizeChanges, normalizeGapItems } from "@/lib/match-analysis"
import { toPlainResumeText } from "@/lib/plain-resume-text"
import type { OptimizeAiResult } from "@/lib/ai/types"

export const OPTIMIZE_SYSTEM_PROMPT =
  '你是一位技术专家级猎头。请根据提供的简历和JD，输出深度分析。必须严格返回 JSON，不要输出任何额外文本。JSON 结构：{"match_score":65,"score_summary":"一句话说明主要失分或亮点","strengths":["…"],"weaknesses":["…"],"missing_keywords":["…"],"gap_items":[{"keyword":"K8s","reason":"JD要求但简历未体现"}],"core_suggestions":["…"],"changes":[{"section":"工作经历","type":"rewrite","summary":"补充量化指标"}],"optimized_content":"Markdown完整润色简历","optimized_content_plain":"与optimized_content语义相同但无Markdown符号的纯文本"}。要求：match_score 为 0-100；gap_items 3-8 条；changes 3-8 条且 type 只能是 rewrite/add/remove；optimized_content 用 Markdown+STAR；optimized_content_plain 为纯文本；保留真实性。'

export const extractJson = (text: string) => {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) return fencedMatch[1].trim()

  const firstBrace = text.indexOf("{")
  const lastBrace = text.lastIndexOf("}")
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }
  return text
}

export const normalizeResult = (raw: unknown): OptimizeAiResult => {
  const data = raw as Partial<OptimizeAiResult> & Record<string, unknown>
  const score = Number(data.match_score)
  const strengths = Array.isArray(data.strengths)
    ? data.strengths
        .map((item) => String(item))
        .filter(Boolean)
        .slice(0, 5)
    : []
  const weaknesses = Array.isArray(data.weaknesses)
    ? data.weaknesses
        .map((item) => String(item))
        .filter(Boolean)
        .slice(0, 5)
    : []
  const missingKeywords = Array.isArray(data.missing_keywords)
    ? data.missing_keywords
        .map((item) => String(item))
        .filter(Boolean)
        .slice(0, 10)
    : []
  const coreSuggestions = Array.isArray(data.core_suggestions)
    ? data.core_suggestions
        .map((item) => String(item))
        .filter(Boolean)
        .slice(0, 5)
    : []
  const optimizedContent = String(data.optimized_content ?? "").trim()
  const optimizedPlainFromAi = String(data.optimized_content_plain ?? "").trim()
  const optimizedContentPlain =
    optimizedPlainFromAi || toPlainResumeText(optimizedContent)

  const gapItems = normalizeGapItems(data.gap_items, missingKeywords)
  const changes = normalizeChanges(data.changes)

  const scoreSummary =
    String(data.score_summary ?? "").trim() ||
    weaknesses[0] ||
    (missingKeywords.length > 0
      ? `主要缺口：${missingKeywords.slice(0, 3).join("、")}`
      : "已完成简历与岗位匹配分析")

  if (!Number.isFinite(score)) {
    throw new Error("AI 返回的 match_score 无效")
  }
  if (strengths.length === 0) {
    throw new Error("AI 返回的 strengths 无效")
  }
  if (weaknesses.length === 0) {
    throw new Error("AI 返回的 weaknesses 无效")
  }
  if (missingKeywords.length === 0) {
    throw new Error("AI 返回的 missing_keywords 无效")
  }
  if (coreSuggestions.length === 0) {
    throw new Error("AI 返回的 core_suggestions 无效")
  }
  if (!optimizedContent) {
    throw new Error("AI 返回的 optimized_content 为空")
  }

  return {
    match_score: Math.max(0, Math.min(100, Math.round(score))),
    score_summary: scoreSummary,
    strengths,
    weaknesses,
    missing_keywords: missingKeywords,
    gap_items: gapItems,
    core_suggestions: coreSuggestions,
    changes,
    optimized_content: optimizedContent,
    optimized_content_plain: optimizedContentPlain,
  }
}

export const buildOptimizeUserPrompt = (
  resumeText: string,
  jdText: string,
  focusSuggestions: string[] = [],
) => {
  const focusBlock =
    focusSuggestions.length > 0
      ? `\n\n【用户指定需重点落实的优化建议（请在 optimized_content 与 changes 中体现）】\n${focusSuggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : ""
  return `【简历原文】\n${resumeText}\n\n【职位JD原文】\n${jdText}${focusBlock}`
}
