"use client"

import { useEffect, useState } from "react"
import { History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  fetchRecentJobDescriptions,
  pickJdPreviewLabel,
  type RecentJobDescription,
} from "@/lib/fetch-recent-job-descriptions"
import { cn } from "@/lib/utils"

type RecentJdPickerProps = {
  onSelect: (fullText: string) => void
  className?: string
}

export const RecentJdPicker = ({ onSelect, className }: RecentJdPickerProps) => {
  const [items, setItems] = useState<RecentJobDescription[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data } = await fetchRecentJobDescriptions(5)
      if (cancelled) {
        return
      }
      setItems(data.filter((row) => row.full_text?.trim()))
      setLoaded(true)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded || items.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <History className="h-3.5 w-3.5" aria-hidden />
        最近使用的 JD
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row.full_text!.trim())}
            className="max-w-full rounded-md border border-border bg-background/80 px-2 py-1 text-left text-[11px] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            aria-label={`使用最近 JD：${pickJdPreviewLabel(row)}`}
          >
            <Badge variant="secondary" className="mr-1 h-4 px-1 text-[10px] font-normal">
              JD
            </Badge>
            {pickJdPreviewLabel(row)}
          </button>
        ))}
      </div>
    </div>
  )
}
