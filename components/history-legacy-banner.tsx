"use client"

import { AlertCircle, FileDiff } from "lucide-react"
import type { HistoryAnalysisTier } from "@/lib/history-analysis-tier"
import { cn } from "@/lib/utils"

type HistoryLegacyBannerProps = {
  tier: HistoryAnalysisTier
  className?: string
}

const COPY: Record<
  Exclude<HistoryAnalysisTier, "full">,
  { title: string; body: string; icon: typeof AlertCircle }
> = {
  partial: {
    title: "部分分析快照",
    body: "该记录保存了部分结构化分析（如分数与摘要），但缺少变更清单或完整缺口数据。你仍可查看 Diff；关键词跳转与「按建议再优化」不可用。",
    icon: AlertCircle,
  },
  "diff-only": {
    title: "旧版快照（仅文本对比）",
    body: "该记录生成时尚未保存结构化分析，仅保留原文与优化稿。侧栏摘要、变更摘要、关键词定位不可用；请使用下方 Diff 查看差异。",
    icon: FileDiff,
  },
}

export const HistoryLegacyBanner = ({ tier, className }: HistoryLegacyBannerProps) => {
  if (tier === "full") {
    return null
  }

  const content = COPY[tier]
  const Icon = content.icon

  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm",
        tier === "diff-only"
          ? "border-slate-500/40 bg-slate-500/5 text-slate-700 dark:text-slate-300"
          : "border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-100",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <div className="min-w-0 space-y-1 text-left">
        <p className="font-medium">{content.title}</p>
        <p className="text-xs leading-relaxed opacity-90">{content.body}</p>
      </div>
    </div>
  )
}
