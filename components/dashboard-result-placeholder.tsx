"use client"

import Link from "next/link"
import { GitCompare, History, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DashboardResultPlaceholderProps = {
  isFirstTimeUser?: boolean
  className?: string
}

export const DashboardResultPlaceholder = ({
  isFirstTimeUser = false,
  className,
}: DashboardResultPlaceholderProps) => {
  return (
    <div
      className={cn(
        "flex h-full min-h-[min(70vh,800px)] flex-col items-center justify-center gap-6 p-6 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-7 w-7 text-primary" aria-hidden />
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="text-base font-semibold text-foreground">完成左侧两步后开始分析</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          点击「分析并优化」后，系统将生成匹配分数、JD 缺口与简历 Diff，并自动打开
          <strong className="font-medium text-foreground"> 匹配结果 </strong>
          页。
        </p>
      </div>

      <ul className="max-w-sm space-y-2 text-left text-xs text-muted-foreground">
        <li className="flex gap-2">
          <span className="font-medium text-foreground">①</span>
          <span>上传 PDF 或从简历库加载已有简历</span>
        </li>
        <li className="flex gap-2">
          <span className="font-medium text-foreground">②</span>
          <span>粘贴目标岗位的职位描述（JD）</span>
        </li>
        <li className="flex gap-2">
          <span className="font-medium text-foreground">③</span>
          <span>查看匹配结果页的 Diff 与优化建议</span>
        </li>
      </ul>

      {isFirstTimeUser ? (
        <p className="max-w-sm text-xs text-muted-foreground">
          还没有简历？可先去
          <Link
            href="/dashboard/templates"
            className="mx-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            简历库
          </Link>
          使用示例模板，再回到此处粘贴 JD 分析。
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" asChild className="gap-1.5 text-xs">
          <Link href="/dashboard/match-result" aria-label="前往匹配结果页">
            <GitCompare className="h-3.5 w-3.5" aria-hidden />
            匹配结果
          </Link>
        </Button>
        <Button type="button" variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard/history" aria-label="前往匹配历史">
            <History className="h-3.5 w-3.5" aria-hidden />
            匹配历史
          </Link>
        </Button>
      </div>
    </div>
  )
}
