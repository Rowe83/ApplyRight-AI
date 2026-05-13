"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Copy, Trash2, ExternalLink, Sparkles, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResumeWithScore } from "@/types/resume"
import { formatRelativeTime } from "@/lib/date-utils"

interface ResumeCardProps {
  resume: ResumeWithScore
  onRename: (resumeId: string, newName: string) => Promise<void>
  onDelete: (resumeId: string) => Promise<void>
  onCopy: (resumeId: string) => Promise<void>
  onNavigate: (resumeId: string) => void
}

const DEFAULT_TARGET_LABEL = "未分类岗位"

export const ResumeCard = ({
  resume,
  onRename,
  onDelete,
  onCopy,
  onNavigate,
}: ResumeCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const lastModifiedSource = resume.updated_at ?? resume.created_at ?? null
  const targetLabel = (resume.target_position?.trim() || DEFAULT_TARGET_LABEL).slice(0, 64)
  const parsedName = resume.parsed_name?.trim()
  const scoreValue = resume.highest_match_score
  const showScoreBadge = typeof scoreValue === "number" && Number.isFinite(scoreValue)

  const handleTitleClick = useCallback(() => {
    const newName = prompt("请输入新的简历名称:", resume.original_filename)
    if (newName && newName.trim() && newName !== resume.original_filename) {
      void onRename(resume.id, newName.trim())
    }
  }, [resume.id, resume.original_filename, onRename])

  const handleDeleteClick = useCallback(async () => {
    const confirmed = confirm("确定要删除这份简历吗？此操作无法撤销。")
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await onDelete(resume.id)
      toast.success("简历已删除")
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除简历失败"
      toast.error("删除失败", { description: message })
    } finally {
      setIsDeleting(false)
    }
  }, [resume.id, onDelete])

  const handleCopyClick = useCallback(async () => {
    try {
      await onCopy(resume.id)
      toast.success("简历内容已复制到剪贴板")
    } catch (error) {
      const message = error instanceof Error ? error.message : "复制失败"
      toast.error("复制失败", { description: message })
    }
  }, [resume.id, onCopy])

  const handleNavigateClick = useCallback(() => {
    onNavigate(resume.id)
  }, [resume.id, onNavigate])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    if (score >= 60) return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    if (score >= 40) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    return "bg-red-500/20 text-red-400 border-red-500/30"
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "border-border bg-card",
        "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1",
        "cursor-pointer"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div
              className="mb-2 flex items-center gap-2"
              onClick={handleTitleClick}
              role="button"
              tabIndex={0}
              aria-label="点击重命名简历"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleTitleClick()
                }
              }}
              title="点击重命名"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className={cn(
                    "truncate font-semibold transition-colors",
                    "text-foreground group-hover:text-primary"
                  )}
                >
                  {resume.original_filename}
                </h3>
                {parsedName ? (
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <User className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">{parsedName}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary text-xs"
            >
              {targetLabel}
            </Badge>
          </div>

          {showScoreBadge ? (
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium",
                getScoreColor(scoreValue as number)
              )}
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              {Math.round(scoreValue as number)}%
            </Badge>
          ) : null}
        </div>

        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="shrink-0">最后修改:</span>
            <span className="font-medium text-foreground">
              {formatRelativeTime(lastModifiedSource)}
            </span>
          </div>
          {resume.last_match_date ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="shrink-0">最近分析:</span>
              <span className="font-medium text-foreground">
                {formatRelativeTime(resume.last_match_date)}
              </span>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "absolute inset-x-4 bottom-4 flex gap-2 transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={handleNavigateClick}
            title="进入优化仪表盘"
            type="button"
          >
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
            优化仪表盘
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={handleCopyClick}
            title="复制简历内容"
            type="button"
          >
            <Copy className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-background/80 backdrop-blur-sm hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            title="删除简历"
            type="button"
          >
            {isDeleting ? (
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-label="删除中"
              />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
