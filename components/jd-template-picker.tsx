"use client"

import { FileText } from "lucide-react"
import { toast } from "sonner"
import { JD_TEMPLATE_CATALOG } from "@/lib/jd-templates"
import { cn } from "@/lib/utils"

type JdTemplatePickerProps = {
  currentText: string
  onApply: (text: string) => void
  className?: string
}

export const JdTemplatePicker = ({ currentText, onApply, className }: JdTemplatePickerProps) => {
  const handleSelect = (fullText: string, roleTitle: string) => {
    const trimmed = currentText.trim()
    if (trimmed.length >= 20 && trimmed !== fullText.trim()) {
      const ok = window.confirm(
        `将用示例「${roleTitle}」替换当前 JD 内容。确定继续？`,
      )
      if (!ok) {
        return
      }
    }
    onApply(fullText)
    toast.success("已填入示例 JD", {
      description: "请按实际招聘岗位修改后再分析",
    })
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileText className="h-3.5 w-3.5" aria-hidden />
        示例 JD 模板
      </p>
      <div className="flex flex-wrap gap-1.5">
        {JD_TEMPLATE_CATALOG.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => handleSelect(tpl.fullText, tpl.roleTitle)}
            className="rounded-md border border-dashed border-border bg-muted/20 px-2.5 py-1.5 text-left text-[11px] transition-colors hover:border-primary/40 hover:bg-primary/5"
            aria-label={`使用示例 JD：${tpl.roleTitle}`}
          >
            <span className="font-medium text-foreground">{tpl.roleTitle}</span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              {tpl.tags.join(" · ")}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
