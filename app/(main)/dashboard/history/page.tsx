"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { formatCompactLocalDateTime } from "@/lib/date-utils"
import { formatMatchScoreDisplay } from "@/lib/format-score"
import { getHistoryAnalysisTier } from "@/lib/history-analysis-tier"
import { HistoryTierBadge } from "@/components/history-tier-badge"
import type { MatchingHistoryRow } from "@/types/matching-history"
import { HistoryTableSkeleton } from "@/components/dashboard-skeletons"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Loader2, History, Sparkles, ChevronLeft, ChevronRight, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 15

const ScoreBadge = ({ score }: { score: number | null }) => {
  const label = formatMatchScoreDisplay(score)
  if (label === "--") {
    return (
      <span
        className="inline-flex min-w-[3.25rem] items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/60 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-500"
      >
        --
      </span>
    )
  }

  const rounded = Math.round(Number(score))
  const tier = rounded >= 85 ? "high" : rounded >= 60 ? "mid" : "low"
  const displayLabel = `${rounded}分`
  const classByTier =
    tier === "high"
      ? "bg-green-500/10 text-green-400 border border-green-500/20"
      : tier === "mid"
        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
        : "bg-red-500/10 text-red-400 border border-red-500/20"

  return (
    <span
      className={cn(
        "inline-flex min-w-[3.25rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        classByTier,
      )}
    >
      {displayLabel}
    </span>
  )
}

export default function MatchingHistoryPage() {
  const [rows, setRows] = useState<MatchingHistoryRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadErrorDetail, setLoadErrorDetail] = useState<string | null>(null)
  const fetchPage = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    setLoadErrorDetail(null)

    try {
      const all = (await api.getHistories()) as MatchingHistoryRow[]
      const list = Array.isArray(all) ? all : []
      setTotalCount(list.length)
      const from = page * PAGE_SIZE
      setRows(list.slice(from, from + PAGE_SIZE))
    } catch (e) {
      console.error("Fetch history error:", e)
      setLoadError(e instanceof Error ? e.message : "加载历史失败")
      setLoadErrorDetail(null)
      setRows([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => {
    void fetchPage()
  }, [fetchPage])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const canPrev = page > 0
  const canNext = page < totalPages - 1

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-medium text-foreground">匹配历史</h1>
          <p className="text-sm text-muted-foreground">
            聚合每次 AI 诊断、匹配与润色记录，支持快照复盘
          </p>
        </div>
        {!isLoading && !loadError ? (
          <p className="shrink-0 text-sm text-muted-foreground tabular-nums">共 {totalCount} 条</p>
        ) : null}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm backdrop-blur-sm">
        {isLoading ? (
          <div className="scrollbar-dark min-h-0 flex-1 overflow-auto p-4">
            <HistoryTableSkeleton />
          </div>
        ) : loadError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <p className="text-sm font-medium text-red-400">{loadError}</p>
            {loadErrorDetail ? (
              <details className="max-w-lg text-left">
                <summary className="cursor-pointer text-xs text-slate-500">
                  查看技术详情（排障用）
                </summary>
                <pre className="scrollbar-dark mt-2 max-h-40 overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400 whitespace-pre-wrap break-words">
                  {loadErrorDetail}
                </pre>
              </details>
            ) : null}
            <Button type="button" variant="outline" onClick={() => void fetchPage()}>
              重试
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="scrollbar-dark flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-4 md:p-6">

            <div className="flex flex-1 items-center justify-center py-6">
              <Empty className="max-w-md border border-dashed border-slate-700/80 bg-slate-950/40">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <History className="h-8 w-8 text-slate-400" />
                  </EmptyMedia>
                </EmptyHeader>
                <EmptyTitle>暂无匹配记录</EmptyTitle>
                <EmptyDescription>
                  您还没有进行过简历匹配优化。上传简历并前往仪表盘，对照岗位 JD 即可生成第一条记录。
                </EmptyDescription>
                <EmptyContent className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    asChild
                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link href="/dashboard/resumes" aria-label="去上传优化简历">
                      <Upload className="h-4 w-4" aria-hidden />
                      去上传优化简历
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" asChild className="gap-2 border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800">
                    <Link href="/" aria-label="前往仪表盘">
                      <Sparkles className="h-4 w-4" aria-hidden />
                      前往仪表盘
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          </div>
        ) : (
          <>
            <div className="scrollbar-dark min-h-0 flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
                  <tr className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    <th scope="col" className="whitespace-nowrap px-4 py-3">
                      优化时间
                    </th>
                    <th scope="col" className="px-4 py-3">
                      简历名称
                    </th>
                    <th scope="col" className="px-4 py-3">
                      目标岗位 (JD)
                    </th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3">
                      匹配度
                    </th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3">
                      快照类型
                    </th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3 text-right">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {rows.map((row) => {
                    const tier = getHistoryAnalysisTier(row).tier
                    const resultLinkLabel =
                      tier === "diff-only" ? "查看 Diff" : "查看完整结果"

                    return (
                    <tr
                      key={row.id}
                      className="text-slate-200 transition-colors hover:bg-slate-800/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300 tabular-nums">
                        {formatCompactLocalDateTime(row.created_at)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 font-medium text-slate-100">
                        {row.resume_title?.trim() || "未命名简历"}
                      </td>
                      <td className="max-w-[min(280px,40vw)] truncate px-4 py-3 text-slate-300">
                        {row.target_job?.trim() || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBadge score={row.score} />
                      </td>
                      <td className="px-4 py-3">
                        <HistoryTierBadge tier={tier} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800"
                          asChild
                        >
                          <Link
                            href={`/dashboard/match-result?historyId=${encodeURIComponent(row.id)}`}
                            aria-label={`${resultLinkLabel}：${row.resume_title ?? "简历"}`}
                          >
                            {resultLinkLabel}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalCount > PAGE_SIZE ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-4 py-3 text-sm text-slate-400">
                <span className="tabular-nums">
                  第 {page + 1} / {totalPages} 页
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canPrev}
                    className="border-slate-700 bg-slate-900/60 text-slate-200 disabled:opacity-40"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    aria-label="上一页"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canNext}
                    className="border-slate-700 bg-slate-900/60 text-slate-200 disabled:opacity-40"
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="下一页"
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

    </div>
  )
}
