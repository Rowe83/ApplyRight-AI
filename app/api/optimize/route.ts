import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { openai } from "@/lib/openai"

type OptimizePayload = {
  resume_id?: string
  jd_id?: string
  resumeId?: string
  jdText?: string
}

type OptimizeAiResult = {
  match_score: number
  strengths: string[]
  weaknesses: string[]
  missing_keywords: string[]
  core_suggestions: string[]
  optimized_content: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const systemPrompt =
  "你是一位技术专家级猎头。请根据提供的简历和JD，输出一份深度分析。必须严格返回 JSON，不要输出任何额外文本。JSON结构必须为：{\"match_score\": 65, \"strengths\": [\"...\"], \"weaknesses\": [\"...\"], \"missing_keywords\": [\"...\"], \"core_suggestions\": [\"...\"], \"optimized_content\": \"Markdown格式的完整润色简历...\", \"remaining_credits\": 2}。要求：match_score 为 0-100 数字；strengths/weaknesses/missing_keywords/core_suggestions 都必须是字符串数组；optimized_content 必须是 Markdown 格式并使用 STAR 原则，且保留原简历真实性，仅优化专业表达。remaining_credits 字段必须保留为数字占位。"

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
  const data = raw as Partial<OptimizeAiResult>
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
    strengths,
    weaknesses,
    missing_keywords: missingKeywords,
    core_suggestions: coreSuggestions,
    optimized_content: optimizedContent,
  }
}

const callAi = async (resumeText: string, jdText: string) => {
  const userPrompt = `【简历原文】\n${resumeText}\n\n【职位JD原文】\n${jdText}`
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
  try {
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables for /api/optimize" },
        { status: 500 }
      )
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
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

    const payload = (await req.json()) as OptimizePayload
    const resumeId = payload.resume_id?.trim() || payload.resumeId?.trim()
    const jdId = payload.jd_id?.trim()
    const jdTextFromPayload = payload.jdText?.trim()

    if (!resumeId || (!jdId && !jdTextFromPayload)) {
      return NextResponse.json(
        { error: "Missing resume_id/resumeId and jd_id/jdText" },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single<{ credits: number | null }>()

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to load profile credits" },
        { status: 500 }
      )
    }

    const currentCredits = profile?.credits ?? 0
    if (!profile || currentCredits < 1) {
      return NextResponse.json({ error: "余额不足" }, { status: 403 })
    }

    const { data: resume, error: resumeError } = await adminClient
      .from("resumes")
      .select("id, raw_text")
      .eq("id", resumeId)
      .eq("user_id", userId)
      .single<{ id: string; raw_text: string | null }>()

    if (resumeError || !resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    let jdRecord: { id: string; full_text: string | null } | null = null
    if (jdId) {
      const { data: jd, error: jdError } = await adminClient
        .from("job_descriptions")
        .select("id, full_text")
        .eq("id", jdId)
        .eq("user_id", userId)
        .single<{ id: string; full_text: string | null }>()
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
        .select("id, full_text")
        .single<{ id: string; full_text: string | null }>()
      if (createJdError || !createdJd) {
        return NextResponse.json(
          { error: "Failed to create job description from jdText" },
          { status: 500 }
        )
      }
      jdRecord = createdJd
    }

    const resumeText = (resume.raw_text ?? "").trim()
    const jdText = (jdRecord.full_text ?? "").trim()
    if (!resumeText || !jdText) {
      return NextResponse.json(
        { error: "Resume/JD content is empty" },
        { status: 400 }
      )
    }

    const aiResult = await callAi(resumeText, jdText)

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
      return NextResponse.json(
        { error: "Failed to save optimize result" },
        { status: 500 }
      )
    }

    const { data: updatedProfile, error: deductError } = await adminClient
      .from("profiles")
      .update({ credits: currentCredits - 1 })
      .eq("id", userId)
      .gt("credits", 0)
      .select("credits")
      .single<{ credits: number }>()

    if (deductError || !updatedProfile) {
      await adminClient.from("matches").delete().eq("id", insertedMatch.id)
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 409 }
      )
    }

    return NextResponse.json({
      match_score: aiResult.match_score,
      strengths: aiResult.strengths,
      weaknesses: aiResult.weaknesses,
      missing_keywords: aiResult.missing_keywords,
      core_suggestions: aiResult.core_suggestions,
      suggestions: aiResult.core_suggestions,
      original_content: resumeText,
      optimized_content: aiResult.optimized_content,
      remaining_credits: updatedProfile.credits,
      match_id: insertedMatch.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
