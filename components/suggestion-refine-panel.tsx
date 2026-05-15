"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { persistRefineSuggestions } from "@/lib/refine-suggestions-storage"
import { Sparkles } from "lucide-react"

type SuggestionRefinePanelProps = {
  suggestions: string[]
  resumeId?: string | null
  targetJob?: string | null
}

export const SuggestionRefinePanel = ({
  suggestions,
  resumeId,
  targetJob,
}: SuggestionRefinePanelProps) => {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<number>>(() => new Set(suggestions.map((_, i) => i)))

  if (suggestions.length === 0) {
    return null
  }

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleRefine = () => {
    const items = suggestions.filter((_, i) => selected.has(i))
    if (items.length === 0) {
      toast.error("请至少选择一条优化建议")
      return
    }
    persistRefineSuggestions({
      items,
      resumeId: resumeId ?? undefined,
      targetJob: targetJob ?? undefined,
    })
    const href = resumeId ? `/?id=${encodeURIComponent(resumeId)}&refine=1` : "/?refine=1"
    toast.success("已带上选中建议", {
      description: "返回工作台后粘贴 JD 并重新分析，AI 将侧重这些改进点",
    })
    router.push(href)
  }

  return (
    <section
      className="space-y-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3"
      aria-label="按建议重新分析"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">按选中建议重新分析</p>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleRefine}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          返回工作台优化
        </Button>
      </div>
      <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
        {suggestions.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <Checkbox
              id={`refine-suggestion-${index}`}
              checked={selected.has(index)}
              onCheckedChange={() => toggle(index)}
              aria-label={`选择建议：${item}`}
            />
            <Label
              htmlFor={`refine-suggestion-${index}`}
              className="cursor-pointer text-xs leading-relaxed text-muted-foreground"
            >
              {item}
            </Label>
          </li>
        ))}
      </ul>
    </section>
  )
}
