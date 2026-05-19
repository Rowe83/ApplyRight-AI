"use client"

import { Badge } from "@/components/ui/badge"
import {
  HISTORY_TIER_BADGE_CLASS,
  HISTORY_TIER_LABELS,
  type HistoryAnalysisTier,
} from "@/lib/history-analysis-tier"
import { cn } from "@/lib/utils"

type HistoryTierBadgeProps = {
  tier: HistoryAnalysisTier
  className?: string
}

export const HistoryTierBadge = ({ tier, className }: HistoryTierBadgeProps) => (
  <Badge
    variant="outline"
    className={cn(
      "h-5 border px-1.5 text-[10px] font-medium tabular-nums",
      HISTORY_TIER_BADGE_CLASS[tier],
      className,
    )}
  >
    {HISTORY_TIER_LABELS[tier]}
  </Badge>
)
