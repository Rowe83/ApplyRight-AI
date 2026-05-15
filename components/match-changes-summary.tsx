"use client"

import { Badge } from "@/components/ui/badge"
import type { MatchChangeItem } from "@/types/matching-history-analysis"
import { FileEdit, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

type MatchChangesSummaryProps = {
  changes: MatchChangeItem[]
  onSelectChange?: (change: MatchChangeItem) => void
  className?: string
}

const typeMeta: Record<
  MatchChangeItem["type"],
  { label: string; icon: typeof FileEdit; className: string }
> = {
  rewrite: {
    label: "改写",
    icon: FileEdit,
    className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  add: {
    label: "新增",
    icon: Plus,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  remove: {
    label: "删减",
    icon: Minus,
    className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
}

export const MatchChangesSummary = ({
  changes,
  onSelectChange,
  className,
}: MatchChangesSummaryProps) => {
  if (!changes.length) {
    return null
  }

  return (
    <section
      className={cn("space-y-2 rounded-lg border border-border bg-muted/20 p-3", className)}
      aria-label="变更摘要"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">变更摘要</h3>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
          {changes.length} 处
        </Badge>
      </div>
      <ul className="space-y-2">
        {changes.map((change, index) => {
          const meta = typeMeta[change.type] ?? typeMeta.rewrite
          const Icon = meta.icon
          const clickable = Boolean(onSelectChange)

          return (
            <li key={`${change.section}-${index}`}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onSelectChange?.(change)}
                className={cn(
                  "w-full rounded-md border border-border/60 bg-card/60 p-2.5 text-left transition-colors",
                  clickable && "hover:border-primary/40 hover:bg-card",
                  !clickable && "cursor-default",
                )}
                aria-label={`${change.section}：${change.summary}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]", meta.className)}>
                    <Icon className="mr-1 h-3 w-3" aria-hidden />
                    {meta.label}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">{change.section}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {change.summary}
                </p>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
