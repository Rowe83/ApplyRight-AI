"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { supabase } from "@/lib/supabase"
import { formatCompactLocalDateTime } from "@/lib/date-utils"
import { MATCHING_HISTORIES_DDL } from "@/lib/matching-histories-ddl"
import { parseHistoryFetchError } from "@/lib/matching-history-fetch-errors"
import type { MatchingHistoryRow } from "@/types/matching-history"
import { ResumeDiffView } from "@/components/resume-diff-view"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Loader2, History, Sparkles, ChevronLeft, ChevronRight, Copy, Database } from "lucide-react"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 15

const ScoreBadge = ({ score }: { score: number }) => {
  const rounded = Math.round(score)
  const tier =
    rounded >= 85 ? "high" : rounded >= 60 ? "mid" : "low"
  const label = `${rounded}分`
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
      {label}
    </span>
  )
}

export default function MatchingHistoryPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [rows, setRows] = useState<MatchingHistoryRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadErrorDetail, setLoadErrorDetail] = useState<string | null>(null)
  const [missingTableHint, setMissingTableHint] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeRow, setActiveRow] = useState<MatchingHistoryRow | null>(null)

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (cancelled) return

      if (error || !session) {
        router.push("/login")
        return
      }

      setAuthReady(true)
    }

    void checkSession()

    return () => {
      cancelled = true
    }
  }, [router])

  const fetchPage = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    setLoadErrorDetail(null)
    setMissingTableHint(false)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push("/login")
        return
      }

      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error, count } = await supabase
        .from("matching_histories")
        .select(
          "id, user_id, resume_id, resume_title, target_job, score, raw_text_snapshot, optimized_text_snapshot, created_at",
          { count: "exact" },
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to)

      if (error) {
        console.error("Fetch history error:", error)
        const parsed = parseHistoryFetchError(error)
        if (parsed.kind === "missing_table") {
          setMissingTableHint(true)
          setRows([])
          setTotalCount(0)
          return
        }
        setLoadError(parsed.message)
        setLoadErrorDetail(parsed.technical ?? null)
        setRows([])
        setTotalCount(0)
        return
      }

      const list = (data ?? []) as MatchingHistoryRow[]
      setRows(list)
      setTotalCount(typeof count === "number" ? count : list.length)
    } catch (e) {
      console.error("Fetch history error:", e)
      const parsed = parseHistoryFetchError(e)
      if (parsed.kind === "missing_table") {
        setMissingTableHint(true)
        setRows([])
        setTotalCount(0)
      } else {
        setLoadError(parsed.message)
        setLoadErrorDetail(parsed.technical ?? null)
        setRows([])
        setTotalCount(0)
      }
    } finally {
      setIsLoading(false)
    }
  }, [page, router])

  const handleCopyDdl = async () => {
    try {
      await navigator.clipboard.writeText(MATCHING_HISTORIES_DDL)
      toast.success("已复制 SQL 到剪贴板")
    } catch {
      toast.error("复制失败", { description: "请手动选中下方 SQL 复制" })
    }
  }

  useEffect(() => {
    if (!authReady) {
      return
    }
    void fetchPage()
  }, [authReady, fetchPage])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const canPrev = page > 0
  const canNext = page < totalPages - 1

  const handleOpenSnapshot = (row: MatchingHistoryRow) => {
    setActiveRow(row)
    setSheetOpen(true)
  }

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      setActiveRow(null)
    }
  }

  if (!authReady) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        role="status"
        aria-label="正在验证登录状态"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <DashboardHeader />
        <main className="flex flex-1 flex-col gap-6 overflow-hidden p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-lg font-medium text-foreground">匹配历史</h1>
              <p className="text-sm text-muted-foreground">
                聚合每次 AI 诊断、匹配与润色记录，支持快照复盘
              </p>
            </div>
            {!isLoading && !loadError && !missingTableHint ? (
              <p className="text-sm text-muted-foreground tabular-nums">
                共 {totalCount} 条
              </p>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm backdrop-blur-sm">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
              </div>
            ) : loadError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <p className="text-sm font-medium text-red-400">{loadError}</p>
                {loadErrorDetail ? (
                  <details className="max-w-lg text-left">
                    <summary className="cursor-pointer text-xs text-slate-500">
                      查看技术详情（排障用）
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400 whitespace-pre-wrap break-words">
                      {loadErrorDetail}
                    </pre>
                  </details>
                ) : null}
                <Button type="button" variant="outline" onClick={() => void fetchPage()}>
                  重试
                </Button>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-4 md:p-6">
                {missingTableHint ? (
                  <div
                    className="shrink-0 space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 md:p-5"
                    role="region"
                    aria-label="数据库建表说明"
                  >
                    <div className="flex items-start gap-3">
                      <Database className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
                      <div className="min-w-0 space-y-2 text-left text-sm text-slate-200">
                        <p className="font-medium text-amber-200">
                          需要在 Supabase 中创建 matching_histories 表
                        </p>
                        <p className="text-slate-400">
                          当前请求来自浏览器内的 Supabase 客户端（非 Server Component、非 /api/history）。
                          若表尚未执行迁移，PostgREST 会报错（常见为 PGRST205 / schema cache 或 42P01）。
                          请在 Supabase Dashboard → SQL Editor 粘贴并运行下方脚本，然后点击「我已建表，重试」。
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => void handleCopyDdl()}
                      >
                        <Copy className="h-4 w-4" aria-hidden />
                        复制 SQL
                      </Button>
                      <Button type="button" size="sm" onClick={() => void fetchPage()}>
                        我已建表，重试
                      </Button>
                    </div>
                    <pre className="max-h-56 overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-left text-xs leading-relaxed text-slate-300">
                      {MATCHING_HISTORIES_DDL}
                    </pre>
                  </div>
                ) : null}

                <div className="flex flex-1 items-center justify-center">
                  <Empty className="max-w-md border border-dashed border-slate-700/80 bg-slate-950/40">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <History className="h-8 w-8 text-slate-400" />
                      </EmptyMedia>
                    </EmptyHeader>
                    <EmptyTitle>暂无匹配历史</EmptyTitle>
                    <EmptyDescription>
                      您还没有进行过简历匹配优化，快去仪表盘试试吧！
                    </EmptyDescription>
                    <EmptyContent>
                      <Button
                        type="button"
                        asChild
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Link href="/dashboard" aria-label="前往仪表盘进行简历匹配优化">
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
                <div className="min-h-0 flex-1 overflow-auto">
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
                        <th scope="col" className="whitespace-nowrap px-4 py-3 text-right">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {rows.map((row) => {
                        const scoreNum = Number(row.score ?? 0)
                        const safeScore = Number.isFinite(scoreNum) ? scoreNum : 0
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
                            <td className="max-w-[280px] truncate px-4 py-3 text-slate-300">
                              {row.target_job?.trim() || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <ScoreBadge score={safeScore} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800"
                                onClick={() => handleOpenSnapshot(row)}
                                aria-label={`查看 ${row.resume_title ?? "简历"} 的对比快照`}
                              >
                                查看对比快照
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
        </main>
      </SidebarInset>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full max-w-none flex-col gap-0 border-l border-slate-800 bg-slate-950 p-0 sm:max-w-[min(96vw,1400px)]"
        >
          <SheetHeader className="border-b border-slate-800 px-6 py-4 text-left">
            <SheetTitle className="text-base text-slate-100">
              对比快照复盘
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              {activeRow
                ? `${formatCompactLocalDateTime(activeRow.created_at)} · ${activeRow.resume_title?.trim() || "简历"} · ${activeRow.target_job?.trim() || "岗位"}`
                : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden border-t border-slate-800/80">
            {activeRow ? (
              <ResumeDiffView
                rawText={activeRow.raw_text_snapshot ?? ""}
                optimizedText={activeRow.optimized_text_snapshot ?? ""}
                mode="lines"
                appearance="dark"
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  )
}
