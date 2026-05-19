"use client"

import Link from "next/link"
import { Coins, AlertCircle } from "lucide-react"
import { useCredits } from "@/components/credits-context"
import { cn } from "@/lib/utils"

const OPTIMIZE_CREDIT_COST = 1

type AnalyzeCreditsHintProps = {
  className?: string
}

export const AnalyzeCreditsHint = ({ className }: AnalyzeCreditsHintProps) => {
  const { credits, isLoading } = useCredits()
  const insufficient = !isLoading && credits < OPTIMIZE_CREDIT_COST

  return (
    <div
      className={cn(
        "flex gap-2 rounded-lg border px-3 py-2 text-xs",
        insufficient
          ? "border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-100"
          : "border-border bg-muted/30 text-muted-foreground",
        className,
      )}
      role="status"
    >
      {insufficient ? (
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      )}
      <p className="leading-relaxed">
        {isLoading ? (
          "正在加载积分余额…"
        ) : insufficient ? (
          <>
            积分不足，无法发起分析（需要 {OPTIMIZE_CREDIT_COST} 积分）。
            <Link
              href="/dashboard/billing"
              className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              前往充值
            </Link>
          </>
        ) : (
          <>
            本次分析消耗 <span className="font-medium text-foreground">{OPTIMIZE_CREDIT_COST}</span>{" "}
            积分，当前余额{" "}
            <span className="font-medium tabular-nums text-foreground">{credits}</span>
          </>
        )}
      </p>
    </div>
  )
}
