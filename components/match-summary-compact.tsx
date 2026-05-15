"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { MatchScoreGauge } from "@/components/match-score-gauge"
import { formatMatchScoreDisplay } from "@/lib/format-score"
import type { AnalysisResult } from "@/components/analysis-panel"
import { CheckCircle2, AlertCircle, Lightbulb, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

type MatchSummaryCompactProps = {
  result: AnalysisResult
  onKeywordClick?: (keyword: string) => void
}

export const MatchSummaryCompact = ({ result, onKeywordClick }: MatchSummaryCompactProps) => {
  const [expanded, setExpanded] = useState(false)
  const scoreLabel = formatMatchScoreDisplay(result.matchScore)

  const structuredGaps = result.gapItems ?? []
  const gapItems =
    structuredGaps.length > 0
      ? structuredGaps.map((g) => ({
          type: "structured" as const,
          keyword: g.keyword,
          text: g.reason,
        }))
      : [
          ...result.missingKeywords.map((k) => ({
            type: "keyword" as const,
            keyword: k,
            text: k,
          })),
          ...result.weaknesses
            .filter((w) => !result.missingKeywords.some((k) => w.includes(k)))
            .map((w) => ({ type: "weakness" as const, keyword: undefined, text: w })),
        ].slice(0, 8)

  const scoreHint =
    result.scoreSummary?.trim() ||
    result.weaknesses[0] ||
    (result.missingKeywords.length > 0
      ? `主要缺口：${result.missingKeywords.slice(0, 3).join("、")}`
      : null)

  const hasMoreSuggestions = result.suggestions.some((s) => s.items.length > 0)

  return (
    <aside
      className="flex flex-col gap-4 rounded-lg border border-border bg-card/80 p-4"
      aria-label="匹配分析摘要"
    >
      <div className="flex items-center gap-4">
        <MatchScoreGauge score={result.matchScore} size="sm" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            匹配度 {scoreLabel === "--" ? "—" : `${scoreLabel}%`}
          </p>
          {scoreHint ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{scoreHint}</p>
          ) : null}
        </div>
      </div>

      {result.strengths.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            已匹配
          </div>
          <ul className="space-y-1.5">
            {result.strengths.slice(0, expanded ? 8 : 4).map((item, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {gapItems.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            JD 缺口
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {gapItems.length}
            </Badge>
          </div>
          <ul className="space-y-2">
            {gapItems.slice(0, expanded ? 10 : 5).map((item, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {item.keyword ? (
                  onKeywordClick ? (
                    <button
                      type="button"
                      onClick={() => onKeywordClick(item.keyword!)}
                      className="mb-1 inline-flex rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
                      aria-label={`在 Diff 中定位关键词：${item.keyword}`}
                    >
                      {item.keyword}
                    </button>
                  ) : (
                    <Badge
                      variant="outline"
                      className="mb-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300"
                    >
                      {item.keyword}
                    </Badge>
                  )
                ) : null}
                <p className="leading-relaxed">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasMoreSuggestions ? (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="tips" className="border-border">
            <AccordionTrigger className="py-2 text-xs hover:no-underline">
              <span className="flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-primary" aria-hidden />
                更多优化建议
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1.5 pt-1">
                {result.suggestions.flatMap((s) =>
                  s.items.map((item, i) => (
                    <li key={`${s.category}-${i}`} className="text-xs text-muted-foreground">
                      {item}
                    </li>
                  )),
                )}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}

      {(result.strengths.length > 4 || gapItems.length > 5) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          {expanded ? "收起摘要" : "展开全部摘要"}
        </button>
      )}
    </aside>
  )
}
