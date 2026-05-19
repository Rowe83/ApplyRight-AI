import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { runOptimize } from "@/lib/ai/registry"
import { buildAnalysisJson } from "@/lib/match-analysis"
import { createJobDescription, getJobDescription } from "@/lib/storage/job-descriptions"
import { appendHistory } from "@/lib/storage/history"
import { getResume, updateResume } from "@/lib/storage/resumes"

type OptimizePayload = {
  resume_id?: string
  jd_id?: string
  resumeId?: string
  jdText?: string
  focus_suggestions?: string[]
  focusSuggestions?: string[]
}

export async function POST(req: NextRequest) {
  try {
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

    const resume = await getResume(resumeId)
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    let jdRecord = jdId ? await getJobDescription(jdId) : null
    if (jdId && !jdRecord) {
      return NextResponse.json({ error: "Job description not found" }, { status: 404 })
    }
    if (!jdRecord && jdTextFromPayload) {
      jdRecord = await createJobDescription({ full_text: jdTextFromPayload })
    }

    const resumeText = (resume.raw_text ?? "").trim()
    const jdText = (jdRecord?.full_text ?? "").trim()
    if (!resumeText || !jdText) {
      return NextResponse.json(
        { error: "Resume/JD content is empty" },
        { status: 400 },
      )
    }

    let aiResult
    try {
      aiResult = await runOptimize(resumeText, jdText, focusSuggestions)
    } catch (aiErr) {
      const message = aiErr instanceof Error ? aiErr.message : "AI 调用失败"
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const resumeTitle = resume.original_filename?.trim() || "未命名简历"
    const targetJob =
      jdRecord?.job_title?.trim() ||
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

    const historyId = randomUUID()
    const createdAt = new Date().toISOString()

    await appendHistory({
      id: historyId,
      resume_id: resume.id,
      resume_title: resumeTitle,
      target_job: targetJob,
      jd_id: jdRecord?.id ?? null,
      jd_text: jdText,
      score: aiResult.match_score,
      raw_text_snapshot: resumeText,
      optimized_text_snapshot: aiResult.optimized_content,
      analysis_json: analysisJson,
      created_at: createdAt,
    })

    await updateResume(resume.id, {
      last_match_score: aiResult.match_score,
      last_match_at: createdAt,
    })

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
      history_id: historyId,
      resume_id: resume.id,
      resume_title: resumeTitle,
      target_job: targetJob,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
