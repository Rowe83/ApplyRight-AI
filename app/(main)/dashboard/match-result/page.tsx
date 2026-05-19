"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, FileQuestion, Loader2 } from "lucide-react"
import { AnalysisPanel } from "@/components/analysis-panel"
import { MatchResultActions, type AnalysisResultWithMeta } from "@/components/match-result-actions"
import { Button } from "@/components/ui/button"
import { matchingHistoryRowToResult } from "@/lib/match-analysis"
import { fetchMatchingHistoryById } from "@/lib/fetch-matching-history"
import { getHistoryAnalysisTier, type HistoryAnalysisTier } from "@/lib/history-analysis-tier"
import { HistoryLegacyBanner } from "@/components/history-legacy-banner"
import { readMatchAnalysisResult } from "@/lib/match-result-storage"

const MatchResultPageBody = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const historyId = searchParams.get("historyId")?.trim() ?? ""

  const [result, setResult] = useState<AnalysisResultWithMeta | null>(null)
  const [playbackTier, setPlaybackTier] = useState<HistoryAnalysisTier>("full")
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoadState("loading")
      setErrorMessage(null)

      if (historyId) {
        const { data, error } = await fetchMatchingHistoryById(historyId)

        if (cancelled) {
          return
        }

        if (error) {
          setErrorMessage(error)
          setLoadState("error")
          return
        }

        if (!data) {
          setLoadState("empty")
          return
        }

        const parsed = matchingHistoryRowToResult(data)
        if (!parsed) {
          setLoadState("empty")
          return
        }

        setPlaybackTier(getHistoryAnalysisTier(data).tier)
        setResult({
          ...parsed,
          historyId: data.id,
          resumeId: data.resume_id,
          resumeTitle: data.resume_title,
          targetJob: data.target_job,
        })
        setLoadState("ready")
        return
      }

      setPlaybackTier("full")
      const sessionResult = readMatchAnalysisResult()
      if (cancelled) {
        return
      }

      if (sessionResult) {
        setResult(sessionResult as AnalysisResultWithMeta)
        setLoadState("ready")
        return
      }

      setLoadState("empty")
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [historyId, router])

  if (loadState === "loading") {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-3"
        role="status"
        aria-label="正在加载匹配结果"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          {historyId ? "正在加载历史记录…" : "正在加载最近一次分析结果…"}
        </p>
      </div>
    )
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-16 text-center">
        <p className="text-sm text-red-400">{errorMessage ?? "加载失败"}</p>
        <Button type="button" variant="outline" onClick={() => router.refresh()}>
          重试
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/history">返回匹配历史</Link>
        </Button>
      </div>
    )
  }

  if (loadState === "empty" || !result) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-8 w-8 text-muted-foreground" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">暂无匹配结果</h1>
          <p className="text-sm text-muted-foreground">
            {historyId
              ? "未找到该条历史记录，可能已被删除或无权访问。"
              : "请先在首页完成一次「智能匹配与优化」，或从匹配历史进入。"}
          </p>
        </div>
        <Button asChild>
          <Link href={historyId ? "/dashboard/history" : "/"}>
            {historyId ? "返回匹配历史" : "返回工作台"}
          </Link>
        </Button>
      </div>
    )
  }

  const subtitle = historyId
    ? `历史记录 · ${result.resumeTitle?.trim() || "简历"} · ${result.targetJob?.trim() || "岗位"}`
    : "本次分析结果（同一会话内刷新仍可查看）"

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href={historyId ? "/dashboard/history" : "/"} aria-label="返回">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {historyId ? "返回历史" : "返回工作台"}
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <MatchResultActions result={result} />
      </div>

      {historyId ? <HistoryLegacyBanner tier={playbackTier} /> : null}

      <div className="min-h-[calc(100svh-10rem)] overflow-hidden rounded-lg border border-border bg-card/50 p-3 sm:p-4">
        <AnalysisPanel result={result} isAnalyzing={false} playbackTier={playbackTier} />
      </div>
    </div>
  )
}

const fallback = (
  <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="正在加载">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
  </div>
)

export default function MatchResultPage() {
  return (
    <Suspense fallback={fallback}>
      <MatchResultPageBody />
    </Suspense>
  )
}
