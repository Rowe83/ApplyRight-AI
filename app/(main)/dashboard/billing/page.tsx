"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { BILLING_PACKAGES, type MockPurchasePackageId } from "@/lib/billing-packages"
import { dispatchCreditsChanged, CREDITS_CHANGED_EVENT } from "@/lib/credits-events"
import { useCredits } from "@/components/credits-context"
import { formatCompactLocalDateTime } from "@/lib/date-utils"
import type { CreditTransactionRow } from "@/types/credit-transaction"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Loader2, ArrowLeft, Coins, QrCode, Sparkles, Zap, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"

const DISPLAY_CAP = 30

const formatActionLabel = (row: CreditTransactionRow) => {
  if (row.description?.trim()) {
    return row.description
  }
  if (row.action_type === "consume") {
    return "额度消费"
  }
  if (row.action_type === "recharge") {
    return "套餐充值"
  }
  return row.action_type || "变动"
}

export default function BillingPage() {
  const router = useRouter()
  const { credits, isLoading: creditsLoading } = useCredits()
  const [rows, setRows] = useState<CreditTransactionRow[]>([])
  const [txLoading, setTxLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<MockPurchasePackageId | null>(null)
  const [isPaying, setIsPaying] = useState(false)

  const selectedPack = selectedPackageId
    ? BILLING_PACKAGES.find((p) => p.id === selectedPackageId)
    : null

  const loadTransactions = useCallback(async () => {
    setTxLoading(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push("/login")
        return
      }

      const { data: tx, error: txError } = await supabase
        .from("credit_transactions")
        .select("id, user_id, amount, action_type, description, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(80)

      if (txError) {
        console.error(txError)
        setRows([])
        toast.error("暂时无法加载流水", {
          description: txError.message || "请确认已执行最新数据库迁移",
        })
        return
      }

      setRows((tx ?? []) as CreditTransactionRow[])
    } finally {
      setTxLoading(false)
    }
  }, [router])

  useEffect(() => {
    void loadTransactions()
  }, [loadTransactions])

  useEffect(() => {
    const handleCredits = () => {
      void loadTransactions()
    }
    window.addEventListener(CREDITS_CHANGED_EVENT, handleCredits)
    return () => window.removeEventListener(CREDITS_CHANGED_EVENT, handleCredits)
  }, [loadTransactions])

  const handleOpenCheckout = (packageId: MockPurchasePackageId) => {
    setSelectedPackageId(packageId)
    setCheckoutOpen(true)
  }

  const handleMockPaySuccess = async () => {
    if (!selectedPackageId) return

    setIsPaying(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      let token = session?.access_token
      if (!token) {
        const {
          data: { session: refreshed },
        } = await supabase.auth.refreshSession()
        token = refreshed?.access_token
      }

      if (!token) {
        toast.error("请先登录")
        router.push("/login")
        return
      }

      const response = await fetch("/api/billing/mock-purchase", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId: selectedPackageId }),
      })

      const data = (await response.json()) as {
        error?: string
        credits?: number
        label?: string
      }

      if (!response.ok) {
        throw new Error(data.error || "充值失败")
      }

      if (typeof data.credits === "number" && Number.isFinite(data.credits)) {
        dispatchCreditsChanged(data.credits)
      } else {
        dispatchCreditsChanged()
      }

      toast.success("模拟支付成功", {
        description: data.label ? `已入账：${data.label}` : "额度已更新",
      })

      setCheckoutOpen(false)
      setSelectedPackageId(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : "充值失败"
      toast.error("支付未完成", { description: message })
    } finally {
      setIsPaying(false)
    }
  }

  const ringPct = Math.min(100, Math.round((credits / Math.max(DISPLAY_CAP, credits, 1)) * 100))
  const progressDemo = Math.min(100, Math.round((credits / DISPLAY_CAP) * 100))

  return (
    <div className="flex min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
          <Link href="/" aria-label="返回仪表盘">
            <ArrowLeft className="h-4 w-4" />
            返回仪表盘
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-lg font-medium text-foreground">积分与计费</h1>
        <p className="text-sm text-muted-foreground">
          查看剩余额度、模拟充值与消费流水（演示环境，非真实支付）
        </p>
      </div>

      <Card className="relative overflow-hidden border-primary/25 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-primary/10 shadow-[0_0_40px_-12px_rgba(56,189,248,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
            <CardHeader className="relative z-10 pb-2">
              <CardDescription className="text-primary/90">实时额度</CardDescription>
              <CardTitle className="flex flex-wrap items-end gap-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                <span className="text-base font-normal text-muted-foreground md:text-lg">当前剩余额度</span>
                <span className="tabular-nums text-primary drop-shadow-[0_0_12px_rgba(56,189,248,0.45)]">
                  {creditsLoading ? "…" : credits}
                  <span className="ml-2 text-lg font-semibold text-foreground/90 md:text-2xl">次</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
              <div
                className="relative mx-auto flex h-32 w-32 shrink-0 items-center justify-center rounded-full p-[3px] md:mx-0"
                style={{
                  background: `conic-gradient(hsl(var(--primary)) ${ringPct}%, rgba(148,163,184,0.15) 0)`,
                }}
                aria-hidden
              >
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-950/95 text-center">
                  <Coins className="mb-1 h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">可用</span>
                  <span className="text-xl font-bold tabular-nums text-foreground">
                    {creditsLoading ? "—" : credits}
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">
                  每次「简历智能优化」消耗 1 次额度。以下为相对演示上限（{DISPLAY_CAP}
                  次）的可视化进度，仅作展示。
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>额度储备</span>
                    <span className="tabular-nums">{progressDemo}%</span>
                  </div>
                  <Progress value={progressDemo} className="h-2 bg-white/5" />
                </div>
              </div>
        </CardContent>
      </Card>

      <div id="billing-packages">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Zap className="h-4 w-4 text-primary" />
              模拟充值套餐
            </h2>
            <div className="grid min-w-0 gap-4 md:grid-cols-3">
              {BILLING_PACKAGES.map((pack) => (
                <Card
                  key={pack.id}
                  className={cn(
                    "relative flex min-w-0 flex-col border-border/80 bg-card/60 backdrop-blur-sm transition-shadow",
                    pack.highlight &&
                      "border-primary/40 shadow-[0_0_32px_-8px_rgba(56,189,248,0.35)]",
                  )}
                >
                  {pack.highlight ? (
                    <Badge className="absolute right-3 top-3 bg-primary/90 text-primary-foreground">推荐</Badge>
                  ) : null}
                  <CardHeader>
                    <CardTitle className="text-lg">{pack.title}</CardTitle>
                    <CardDescription>{pack.blurb}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto flex flex-col gap-4">
                    <div>
                      <p className="text-3xl font-bold text-foreground">{pack.priceLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        含 <span className="font-semibold text-primary">{pack.credits}</span> 次额度
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="w-full gap-2 shadow-lg shadow-primary/20"
                      variant={pack.highlight ? "default" : "secondary"}
                      onClick={() => handleOpenCheckout(pack.id)}
                    >
                      <Sparkles className="h-4 w-4" />
                      立即开通
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
      </div>

      <div className="min-h-0 flex-1">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              额度消费流水
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40 backdrop-blur-sm">
              {txLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
                </div>
              ) : rows.length === 0 ? (
                <div className="px-4 py-10 md:px-8">
                  <Empty className="border border-dashed border-slate-700/80 bg-slate-950/30">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Receipt className="h-8 w-8 text-slate-500" />
                      </EmptyMedia>
                    </EmptyHeader>
                    <EmptyTitle>暂无消费流水</EmptyTitle>
                    <EmptyDescription>
                      完成一次简历优化或模拟充值后，流水将自动出现在此列表。
                    </EmptyDescription>
                    <EmptyContent className="flex flex-wrap justify-center gap-2">
                      <Button type="button" asChild className="gap-2">
                        <Link href="/" aria-label="前往仪表盘进行简历优化">
                          <Sparkles className="h-4 w-4" />
                          去上传优化简历
                        </Link>
                      </Button>
                      <Button type="button" variant="outline" asChild>
                        <Link href="/dashboard/resumes" aria-label="前往我的简历上传文件">
                          管理我的简历
                        </Link>
                      </Button>
                    </EmptyContent>
                  </Empty>
                </div>
              ) : (
                <ScrollArea className="scrollbar-dark h-[min(420px,50vh)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="w-[180px] text-muted-foreground">变动时间</TableHead>
                        <TableHead className="text-muted-foreground">事项</TableHead>
                        <TableHead className="w-[100px] text-right text-muted-foreground">额度变动</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id} className="border-slate-800/80">
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                            {formatCompactLocalDateTime(row.created_at)}
                          </TableCell>
                          <TableCell className="text-sm text-foreground/90">
                            {formatActionLabel(row)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right text-sm font-semibold tabular-nums",
                              row.amount > 0 ? "text-emerald-400" : "text-slate-200",
                            )}
                          >
                            {row.amount > 0 ? `+${row.amount}` : row.amount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="border-border/80 bg-slate-950/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              模拟收银台
            </DialogTitle>
            <DialogDescription>
              请使用微信或支付宝扫描下方二维码完成支付（演示环境为占位图示）。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5">
              <QrCode className="h-24 w-24 text-primary/40" aria-hidden />
            </div>
            {selectedPack ? (
              <div className="text-center text-sm">
                <p className="font-medium text-foreground">{selectedPack.title}</p>
                <p className="text-muted-foreground">
                  {selectedPack.priceLabel} · {selectedPack.credits} 次额度
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              className="w-full"
              disabled={isPaying}
              onClick={() => void handleMockPaySuccess()}
            >
              {isPaying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中…
                </>
              ) : (
                "模拟支付成功"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              disabled={isPaying}
              onClick={() => setCheckoutOpen(false)}
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
