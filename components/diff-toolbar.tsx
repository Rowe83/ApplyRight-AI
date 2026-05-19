"use client"

import { Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { ResumeSectionDiffStats } from "@/lib/resume-sections"
import { cn } from "@/lib/utils"

type DiffToolbarProps = {
  mode: "sections" | "lines"
  stats: ResumeSectionDiffStats | null
  syncScroll: boolean
  onlyChangedSections: boolean
  usePlainText: boolean
  onSyncScrollChange: (value: boolean) => void
  onOnlyChangedSectionsChange: (value: boolean) => void
  diffFullscreen?: boolean
  onDiffFullscreenChange?: (value: boolean) => void
  className?: string
}

export const DiffToolbar = ({
  mode,
  stats,
  syncScroll,
  onlyChangedSections,
  usePlainText,
  onSyncScrollChange,
  onOnlyChangedSectionsChange,
  diffFullscreen = false,
  onDiffFullscreenChange,
  className,
}: DiffToolbarProps) => {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2",
        className,
      )}
      role="toolbar"
      aria-label="Diff 对比工具栏"
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {stats ? (
          <span className="tabular-nums">
            {stats.changed}/{stats.total} 个章节有变更
            {stats.lineAdds + stats.lineDeletes > 0
              ? ` · 约 ${stats.lineAdds + stats.lineDeletes} 行差异`
              : null}
          </span>
        ) : null}
        {usePlainText ? (
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            Plain Diff
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {onDiffFullscreenChange ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => onDiffFullscreenChange(!diffFullscreen)}
            aria-label={diffFullscreen ? "退出全屏 Diff" : "全屏查看 Diff"}
          >
            {diffFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                退出全屏
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                全屏
              </>
            )}
          </Button>
        ) : null}
        {mode === "sections" ? (
          <div className="flex items-center gap-2">
            <Switch
              id="only-changed-sections"
              checked={onlyChangedSections}
              onCheckedChange={onOnlyChangedSectionsChange}
              aria-label="仅显示有变更的章节"
            />
            <Label htmlFor="only-changed-sections" className="cursor-pointer text-xs font-normal">
              仅有变更章节
            </Label>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Switch
              id="sync-scroll"
              checked={syncScroll}
              onCheckedChange={onSyncScrollChange}
              aria-label="左右同步滚动"
            />
            <Label htmlFor="sync-scroll" className="cursor-pointer text-xs font-normal">
              同步滚动
            </Label>
          </div>
        )}
      </div>
    </div>
  )
}
