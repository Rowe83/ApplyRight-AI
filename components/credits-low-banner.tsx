"use client"

import Link from "next/link"
import { AlertCircle, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getCreditsStatus,
  LOW_CREDITS_THRESHOLD,
  OPTIMIZE_CREDIT_COST,
} from "@/lib/billing-packages"
import { useCredits } from "@/components/credits-context"
import { cn } from "@/lib/utils"

type CreditsLowBannerProps = {
  className?: string
}

export const CreditsLowBanner = ({ className }: CreditsLowBannerProps) => {
  const { credits, isLoading } = useCredits()

  if (isLoading) {
    return null
  }

  const status = getCreditsStatus(credits)
  if (status === "ok") {
    return null
  }

  const isEmpty = status === "empty"

  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
        isEmpty
          ? "border-red-500/40 bg-red-500/5 text-red-900 dark:text-red-100"
          : "border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-100",
        className,
      )}
      role="status"
    >
      <div className="flex min-w-0 gap-2">
        {isEmpty ? (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Coins className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium">
            {isEmpty ? "积分已用尽" : `积分即将用尽（剩余 ${credits} 次）`}
          </p>
          <p className="text-xs opacity-90">
            每次简历智能优化消耗 {OPTIMIZE_CREDIT_COST} 积分。余额低于 {LOW_CREDITS_THRESHOLD}{" "}
            次时建议提前充值。
          </p>
        </div>
      </div>
      <Button type="button" size="sm" variant={isEmpty ? "default" : "secondary"} asChild>
        <Link href="/dashboard/billing">前往充值</Link>
      </Button>
    </div>
  )
}
