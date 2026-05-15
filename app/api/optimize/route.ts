import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { openai } from "@/lib/openai"
import { buildAnalysisJson, normalizeChanges, normalizeGapItems } from "@/lib/match-analysis"
import { toPlainResumeText } from "@/lib/plain-resume-text"
import { refundOptimizeCredit, tryReserveOptimizeCredit } from "@/lib/optimize-credits"

type OptimizePayload = {
  resume_id?: string
  jd_id?: string
  resumeId?: string
  jdText?: string
  focus_suggestions?: string[]
  focusSuggestions?: string[]
}

type OptimizeAiResult = {
  match_score: number
  score_summary: string
  strengths: string[]
  weaknesses: string[]
  missing_keywords: string[]
  gap_items: { keyword?: string; reason: string }[]
  core_suggestions: string[]
  changes: { section: string; type: "rewrite" | "add" | "remove"; summary: string }[]
  optimized_content: string
  optimized_content_plain: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const insufficientCreditsResponse = () =>
  NextResponse.json(
    { error: "余额不足", code: "INSUFFICIENT_CREDITS" },
    { status: 403 },
  )

const systemPrompt =
  '你是一位技术专家级猎头。请根据提供的简历和JD，输出深度分析。必须严格返回 JSON，不要输出任何额外文本。JSON 结构：{"match_score":65,"score_summary":"一句话说明主要失分或亮点","strengths":["…"],"weaknesses":["…"],"missing_keywords":["…"],"gap_items":[{"keyword":"K8s","reason":"JD要求但简历未体现"}],"core_suggestions":["…"],"changes":[{"section":"工作经历","type":"rewrite","summary":"补充量化指标"}],"optimized_content":"Markdown完整润色简历","optimized_content_plain":"与optimized_content语义相同但无Markdown符号的纯文本","remaining_credits":2}。要求：match_score 为 0-100；gap_items 3-8 条；changes 3-8 条且 type 只能是 rewrite/add/remove；optimized_content 用 Markdown+STAR；optimized_content_plain 为纯文本；保留真实性；remaining_credits 为数字占位。'

const extractJson = (text: string) => {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) return fencedMatch[1].trim()

  const firstBrace = text.indexOf("{")
  const lastBrace = text.lastIndexOf("}")
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }
  return text
}

const normalizeResult = (raw: unknown): OptimizeAiResult => {
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

const callAi = async (
  resumeText: string,
  jdText: string,
  focusSuggestions: string[] = [],
) => {
  const focusBlock =
    focusSuggestions.length > 0
      ? `\n\n【用户指定需重点落实的优化建议（请在 optimized_content 与 changes 中体现）】\n${focusSuggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : ""
  const userPrompt = `【简历原文】\n${resumeText}\n\n【职位JD原文】\n${jdText}${focusBlock}`
  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    temperature: 0.4,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  })

  const text = completion.choices[0]?.message?.content ?? ""
  const jsonText = extractJson(text)
  const parsed = JSON.parse(jsonText)
  return normalizeResult(parsed)
}

export async function POST(req: NextRequest) {
  let reservedCredit = false
  let adminClient: ReturnType<typeof createClient> | null = null
  let userIdForRefund: string | null = null

  try {
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables for /api/optimize" },
        { status: 500 },
      )
    }

    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const authHeader = req.headers.get("authorization")
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null

    let userId: string | null = null

    if (token) {
      const {
        data: { user: tokenUser },
      } = await adminClient.auth.getUser(token)
      userId = tokenUser?.id ?? null
    }

    if (!userId) {
      const cookieStore = await cookies()
      const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 })
          },
        },
      })
      const {
        data: { user: cookieUser },
      } = await serverClient.auth.getUser()
      userId = cookieUser?.id ?? null
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userIdForRefund = userId

    const payload = (await req.json()) as OptimizePayload
    const resumeId = payload.resume_id?.trim() || payload.resumeId?.trim()
    const jdId = payload.jd_id?.trim()
    const jdTextFromPayload = payload.jdText?.trim()
    const focusSuggestions = Array.isArray(payload.focus_suggestions)
      ? payload.focus_suggestions.filter(Boolean).map(String).slice(0, 8)
      : Array.isArray(payload.focusSuggestions)
        ? payload.focusSuggestions.filter(Boolean).map(String).slice(0, 8)
        : []

    if (!resumeId || (!jdId && !jdTextFromPayload)) {
      return NextResponse.json(
        { error: "Missing resume_id/resumeId and jd_id/jdText" },
        { status: 400 },
      )
    }

    const { data: resume, error: resumeError } = await adminClient
      .from("resumes")
      .select("id, raw_text, original_filename")
      .eq("id", resumeId)
      .eq("user_id", userId)
      .single<{
        id: string
        raw_text: string | null
        original_filename: string | null
      }>()

    if (resumeError || !resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    let jdRecord: { id: string; full_text: string | null; job_title: string | null } | null = null
    if (jdId) {
      const { data: jd, error: jdError } = await adminClient
        .from("job_descriptions")
        .select("id, full_text, job_title")
        .eq("id", jdId)
        .eq("user_id", userId)
        .single<{ id: string; full_text: string | null; job_title: string | null }>()
      if (jdError || !jd) {
        return NextResponse.json({ error: "Job description not found" }, { status: 404 })
      }
      jdRecord = jd
    } else {
      const fallbackTitle =
        jdTextFromPayload
          ?.split("\n")
          .map((line) => line.trim())
          .find((line) => line.length > 0) ?? "未命名岗位"
      const { data: createdJd, error: createJdError } = await adminClient
        .from("job_descriptions")
        .insert({
          user_id: userId,
          job_title: fallbackTitle,
          full_text: jdTextFromPayload,
        })
        .select("id, full_text, job_title")
        .single<{ id: string; full_text: string | null; job_title: string | null }>()
      if (createJdError || !createdJd) {
        return NextResponse.json(
          { error: "Failed to create job description from jdText" },
          { status: 500 },
        )
      }
      jdRecord = createdJd
    }

    const resumeText = (resume.raw_text ?? "").trim()
    const jdText = (jdRecord.full_text ?? "").trim()
    if (!resumeText || !jdText) {
      return NextResponse.json(
        { error: "Resume/JD content is empty" },
        { status: 400 },
      )
    }

    const reserve = await tryReserveOptimizeCredit(adminClient, userId)

    if (!reserve.ok) {
      if (reserve.reason === "insufficient") {
        return insufficientCreditsResponse()
      }
      console.error("try_reserve_optimize_credit failed:", reserve.message)
      return NextResponse.json(
        { error: "Failed to verify credits", code: "CREDITS_CHECK_FAILED" },
        { status: 500 },
      )
    }

    const remainingAfterReserve = reserve.remaining
    reservedCredit = true

    let aiResult: OptimizeAiResult
    try {
      aiResult = await callAi(resumeText, jdText, focusSuggestions)
    } catch (aiErr) {
      await refundOptimizeCredit(adminClient, userId)
      reservedCredit = false
      const message = aiErr instanceof Error ? aiErr.message : "AI 调用失败"
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const { data: insertedMatch, error: insertMatchError } = await adminClient
      .from("matches")
      .insert({
        resume_id: resume.id,
        jd_id: jdRecord.id,
        match_score: aiResult.match_score,
        optimized_content: aiResult.optimized_content,
        suggestions: aiResult.core_suggestions,
      })
      .select("id")
      .single<{ id: string }>()

    if (insertMatchError || !insertedMatch) {
      await refundOptimizeCredit(adminClient, userId)
      reservedCredit = false
      return NextResponse.json(
        { error: "Failed to save optimize result" },
        { status: 500 },
      )
    }

    const { error: ledgerError } = await adminClient.from("credit_transactions").insert({
      user_id: userId,
      amount: -1,
      action_type: "consume",
      description: "简历智能优化（DeepSeek 匹配分析）",
    })

    if (ledgerError) {
      console.error("credit_transactions consume insert failed:", ledgerError)
    }

    const resumeTitle =
      resume.original_filename?.trim() || "未命名简历"
    const targetJob =
      jdRecord.job_title?.trim() ||
      jdTextFromPayload
        ?.split("\n")
        .map((line) => line.trim())
        .find((line) => line.length > 0) ||
      "未命名岗位"

    const analysisJson = buildAnalysisJson({
      match_score: aiResult.match_score,
      score_summary: aiResult.score_summary,
      strengths: aiResult.strengths,
      weaknesses: aiResult.weaknesses,
      missing_keywords: aiResult.missing_keywords,
      core_suggestions: aiResult.core_suggestions,
      gap_items: aiResult.gap_items,
      changes: aiResult.changes,
      optimized_content_plain: aiResult.optimized_content_plain,
    })

    const historyBase = {
      user_id: userId,
      resume_id: resume.id,
      resume_title: resumeTitle,
      target_job: targetJob,
      score: aiResult.match_score,
      raw_text_snapshot: resumeText,
      optimized_text_snapshot: aiResult.optimized_content,
    }

    let historyId: string | null = null
    const withAnalysis = await adminClient
      .from("matching_histories")
      .insert({ ...historyBase, analysis_json: analysisJson })
      .select("id")
      .single<{ id: string }>()

    if (!withAnalysis.error && withAnalysis.data) {
      historyId = withAnalysis.data.id
    } else {
      const fallback = await adminClient
        .from("matching_histories")
        .insert(historyBase)
        .select("id")
        .single<{ id: string }>()
      if (fallback.error) {
        console.error("matching_histories insert failed:", withAnalysis.error, fallback.error)
      } else {
        historyId = fallback.data?.id ?? null
      }
    }

    reservedCredit = false

    return NextResponse.json({
      match_score: aiResult.match_score,
      score_summary: aiResult.score_summary,
      strengths: aiResult.strengths,
      weaknesses: aiResult.weaknesses,
      missing_keywords: aiResult.missing_keywords,
      gap_items: aiResult.gap_items,
      changes: aiResult.changes,
      core_suggestions: aiResult.core_suggestions,
      suggestions: aiResult.core_suggestions,
      original_content: resumeText,
      optimized_content: aiResult.optimized_content,
      optimized_content_plain: aiResult.optimized_content_plain,
      remaining_credits: remainingAfterReserve,
      match_id: insertedMatch.id,
      history_id: historyId,
      resume_id: resume.id,
      resume_title: resumeTitle,
      target_job: targetJob,
    })
  } catch (error) {
    if (reservedCredit && adminClient && userIdForRefund) {
      await refundOptimizeCredit(adminClient, userIdForRefund)
    }
    const message = error instanceof Error ? error.message : "Unexpected server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
