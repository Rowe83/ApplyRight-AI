"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileQuestion } from "lucide-react"
import { AnalysisPanel, type AnalysisResult } from "@/components/analysis-panel"
import { Button } from "@/components/ui/button"
import { readMatchAnalysisResult } from "@/lib/match-result-storage"

export default function MatchResultPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setResult(readMatchAnalysisResult())
    setHydrated(true)
  }, [])

  if (!hydrated) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-3"
        role="status"
        aria-label="正在加载匹配结果"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">正在加载最近一次分析结果…</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-8 w-8 text-muted-foreground" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">暂无匹配结果</h1>
          <p className="text-sm text-muted-foreground">
            请先在首页上传简历并粘贴职位描述，完成一次「智能匹配与优化」后，将自动进入本页查看分数、关键词与 Diff 对比。
          </p>
        </div>
        <Button asChild>
          <Link href="/">返回工作台</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/" aria-label="返回工作台">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            返回工作台
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          以下为最近一次分析结果，刷新页面后仍可查看（同一会话内有效）。
        </p>
      </div>

      <div className="min-h-[calc(100svh-10rem)] overflow-hidden rounded-lg border border-border bg-card/50 p-3 sm:p-4">
        <AnalysisPanel result={result} isAnalyzing={false} />
      </div>
    </div>
  )
}
