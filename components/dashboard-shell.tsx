"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { UploadPanel } from "@/components/upload-panel"
import { AnalysisPanel, AnalysisResult } from "@/components/analysis-panel"
import { CheckCircle2, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { dispatchCreditsChanged } from "@/lib/credits-events"
import { formatMatchScoreDisplay } from "@/lib/format-score"
import { apiPayloadToAnalysisResult } from "@/lib/match-analysis"
import { persistMatchAnalysisResult } from "@/lib/match-result-storage"

export type ResumeIdSearchParamKey = "resumeId" | "id"

type DashboardPageBodyProps = {
  resumeIdSearchParam: ResumeIdSearchParamKey
}

const DashboardPageBody = ({ resumeIdSearchParam }: DashboardPageBodyProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [preloadedResume, setPreloadedResume] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    const preloadResume = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (cancelled) {
        return
      }

      if (error || !session) {
        setPreloadedResume(null)
        return
      }

      const resumeId = searchParams.get(resumeIdSearchParam)?.trim()
      if (!resumeId) {
        setPreloadedResume(null)
        return
      }

      try {
        const { data: resume, error: resumeError } = await supabase
          .from("resumes")
          .select("original_filename")
          .eq("id", resumeId)
          .eq("user_id", session.user.id)
          .maybeSingle<{ original_filename: string }>()

        if (cancelled) {
          return
        }

        if (resumeError) {
          console.error("Failed to preload resume:", resumeError)
          setPreloadedResume(null)
          return
        }

        if (resume) {
          setPreloadedResume({ id: resumeId, name: resume.original_filename })
          toast.success(`已加载简历: ${resume.original_filename}`, {
            duration: 3000,
          })
        } else {
          setPreloadedResume(null)
        }
      } catch (err) {
        console.error("Failed to preload resume:", err)
        if (!cancelled) {
          setPreloadedResume(null)
        }
      }
    }

    void preloadResume()

    return () => {
      cancelled = true
    }
  }, [searchParams, resumeIdSearchParam])

  const handleAnalyze = async (payload: { resumeId: string; jdText: string }) => {
    setIsAnalyzing(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      let token = session?.access_token
      if (!token) {
        const {
          data: { session: refreshedSession },
        } = await supabase.auth.refreshSession()
        token = refreshedSession?.access_token
      }

      if (!token) {
        toast.error("请先登录")
        router.push("/login")
        return
      }

      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeId: payload.resumeId,
          jdText: payload.jdText,
        }),
      })

      const data = (await response.json()) as {
        error?: string
        code?: string
        match_score?: number
        score?: number
        remaining_credits?: number
        strengths?: string[]
        weaknesses?: string[]
        missing_keywords?: string[]
        original_content?: string
        optimized_content?: string
        revised_summary?: string
        suggestions?: string[]
        core_suggestions?: string[]
        top_3_suggestions?: string[]
        score_summary?: string
        gap_items?: { keyword?: string; reason: string }[]
        changes?: { section: string; type: "rewrite" | "add" | "remove"; summary: string }[]
        optimized_content_plain?: string
        history_id?: string | null
        resume_title?: string
        target_job?: string
      }

      if (!response.ok) {
        const insufficient =
          response.status === 403 &&
          (data.code === "INSUFFICIENT_CREDITS" || data.error === "余额不足")
        if (insufficient) {
          toast.error("积分不足", {
            description: "当前额度已用尽，请前往「积分与计费」模拟充值后再试",
            duration: 6000,
          })
          return
        }
        throw new Error(data.error || "分析失败，请稍后重试")
      }

      const nextResult = apiPayloadToAnalysisResult(data)

      setAnalysisResult(nextResult)
      persistMatchAnalysisResult(nextResult)

      const resultHref = data.history_id
        ? `/dashboard/match-result?historyId=${encodeURIComponent(data.history_id)}`
        : "/dashboard/match-result"
      router.push(resultHref)

      const scoreLabel = formatMatchScoreDisplay(nextResult.matchScore)
      const scorePhrase = scoreLabel === "--" ? "已完成分析" : `您的简历匹配度为 ${scoreLabel}%`

      toast.success("简历优化成功！", {
        description: scorePhrase,
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        duration: 5000,
      })

      if (typeof data.remaining_credits === "number" && Number.isFinite(data.remaining_credits)) {
        dispatchCreditsChanged(data.remaining_credits)
      } else {
        dispatchCreditsChanged()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "分析失败，请稍后重试"
      toast.error("分析失败", { description: message })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100svh-8rem)] gap-6 lg:grid-cols-3">
      <div className="flex min-h-0 flex-col overflow-hidden lg:col-span-1">
        <UploadPanel onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} preloadedResume={preloadedResume} />
      </div>

      <div className="min-h-0 overflow-hidden rounded-lg border border-border bg-card/50 p-4 lg:col-span-2">
        <AnalysisPanel result={analysisResult} isAnalyzing={isAnalyzing} />
      </div>
    </div>
  )
}

const dashboardSuspenseFallback = (
  <div
    className="flex min-h-[50vh] items-center justify-center"
    role="status"
    aria-label="正在加载"
  >
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
  </div>
)

export const DashboardShell = ({ resumeIdSearchParam }: DashboardPageBodyProps) => (
  <Suspense fallback={dashboardSuspenseFallback}>
    <DashboardPageBody resumeIdSearchParam={resumeIdSearchParam} />
  </Suspense>
)
