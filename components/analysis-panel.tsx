"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ResumeDiffView,
  useDiffSectionList,
  useResumeDiffStats,
} from "@/components/resume-diff-view"
import { DiffSectionNav } from "@/components/diff-section-nav"
import { cn } from "@/lib/utils"
import { MatchSummaryCompact } from "@/components/match-summary-compact"
import { MatchChangesSummary } from "@/components/match-changes-summary"
import { DiffToolbar } from "@/components/diff-toolbar"
import { getOptimizedTextForDiff } from "@/lib/match-analysis"
import { scrollToDiffSection, scrollToKeywordInDiff } from "@/lib/diff-navigation"
import { SuggestionRefinePanel } from "@/components/suggestion-refine-panel"
import type { AnalysisResultWithMeta } from "@/components/match-result-actions"
import type { HistoryAnalysisTier } from "@/lib/history-analysis-tier"
import type { MatchChangeItem, MatchGapItem } from "@/types/matching-history-analysis"
import ReactMarkdown from "react-markdown"
import {
  FileText,
  Copy,
  Check,
  GitCompare,
  ListTree,
  Sparkles,
} from "lucide-react"

export interface AnalysisResult {
  matchScore: number
  strengths: string[]
  weaknesses: string[]
  missingKeywords: string[]
  suggestions: {
    category: string
    items: string[]
  }[]
  originalContent: string
  optimizedContent: string
  optimizedContentPlain?: string
  scoreSummary?: string
  gapItems?: MatchGapItem[]
  changes?: MatchChangeItem[]
}

interface AnalysisPanelProps {
  result: AnalysisResult | AnalysisResultWithMeta | null
  isAnalyzing: boolean
  /** Session results default to full; history rows pass tier from DB */
  playbackTier?: HistoryAnalysisTier
}

type DiffTab = "section-diff" | "line-diff" | "original" | "optimized"

export function AnalysisPanel({
  result,
  isAnalyzing,
  playbackTier = "full",
}: AnalysisPanelProps) {
  const [copied, setCopied] = useState(false)
  const [diffTab, setDiffTab] = useState<DiffTab>("section-diff")
  const [syncScroll, setSyncScroll] = useState(true)
  const [onlyChangedSections, setOnlyChangedSections] = useState(true)

  const diffStats = useResumeDiffStats(
    result?.originalContent ?? "",
    result ? getOptimizedTextForDiff(result) : "",
    true,
  )

  const optimizedForDiffPreview = result ? getOptimizedTextForDiff(result) : ""
  const sectionNavItems = useDiffSectionList(
    result?.originalContent ?? "",
    optimizedForDiffPreview,
    {
      usePlainText: true,
      optimizedPlainText: result?.optimizedContentPlain?.trim() || undefined,
      onlyChangedSections,
    },
  )

  const displayBody = useMemo(() => {
    if (!result) {
      return ""
    }
    return result.originalContent.replace(/\\n/g, "\n")
  }, [result])

  const handleCopyOriginal = async () => {
    if (!result?.originalContent) {
      return
    }
    try {
      await navigator.clipboard.writeText(result.originalContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  if (isAnalyzing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-medium">AI 正在分析您的简历...</p>
          <p className="text-sm text-muted-foreground">这可能需要几秒钟</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">暂无分析结果</p>
          <p className="text-sm text-muted-foreground">
            上传简历并粘贴职位描述后开始分析
          </p>
        </div>
      </div>
    )
  }

  const diffMode = diffTab === "line-diff" ? "lines" : "sections"
  const optimizedForDiff = getOptimizedTextForDiff(result)
  const optimizedPlainOverride = result.optimizedContentPlain?.trim() || undefined
  const isFullPlayback = playbackTier === "full"

  const handleSelectChange = (change: MatchChangeItem) => {
    setDiffTab("section-diff")
    setOnlyChangedSections(true)
    requestAnimationFrame(() => {
      scrollToDiffSection(change.section, '[data-diff-panel-root="true"]')
    })
  }

  const handleKeywordClick = (keyword: string) => {
    setDiffTab("section-diff")
    setOnlyChangedSections(false)
    requestAnimationFrame(() => {
      const ok = scrollToKeywordInDiff(
        keyword,
        result.originalContent,
        optimizedForDiff,
        '[data-diff-panel-root="true"]',
      )
      if (!ok) {
        scrollToDiffSection("简历内容", '[data-diff-panel-root="true"]')
      }
    })
  }

  const suggestionItems = result.suggestions.flatMap((s) => s.items)
  const meta = result as AnalysisResultWithMeta

  const diffViewportClass =
    "h-[min(65vh,720px)] min-h-[360px] overflow-hidden rounded-lg border border-border bg-slate-50 dark:bg-slate-950/30"

  const diffBodyClass = "h-full min-h-0 overflow-hidden"

  return (
    <div className="flex h-full min-h-[min(70vh,800px)] flex-col gap-4 lg:flex-row lg:gap-6">
      <div className="shrink-0 lg:w-[min(100%,280px)] lg:max-w-xs">
        <MatchSummaryCompact
          result={result}
          onKeywordClick={isFullPlayback ? handleKeywordClick : undefined}
          compactOnlyScore={playbackTier === "diff-only"}
        />
        {isFullPlayback && suggestionItems.length > 0 ? (
          <SuggestionRefinePanel
            suggestions={suggestionItems}
            resumeId={meta.resumeId}
            targetJob={meta.targetJob}
          />
        ) : null}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3" data-diff-panel-root="true">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">简历 Diff 对比</h2>
            <p className="text-xs text-muted-foreground">
              默认章节对照（Plain 文本，已去除 Markdown 符号噪音）
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-normal">
            Diff-first
          </Badge>
        </div>

        {isFullPlayback && result.changes && result.changes.length > 0 ? (
          <MatchChangesSummary
            changes={result.changes}
            onSelectChange={handleSelectChange}
          />
        ) : null}

        <DiffToolbar
          mode={diffMode}
          stats={diffStats}
          syncScroll={syncScroll}
          onlyChangedSections={onlyChangedSections}
          usePlainText
          onSyncScrollChange={setSyncScroll}
          onOnlyChangedSectionsChange={setOnlyChangedSections}
        />

        <Tabs
          value={diffTab}
          onValueChange={(v) => setDiffTab(v as DiffTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="grid h-auto w-full shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-4">
            <TabsTrigger value="section-diff" className="gap-1.5 text-xs sm:text-sm">
              <ListTree className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
              章节对比
            </TabsTrigger>
            <TabsTrigger value="line-diff" className="gap-1.5 text-xs sm:text-sm">
              <GitCompare className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
              全文 Plain
            </TabsTrigger>
            <TabsTrigger value="original" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
              原始版本
            </TabsTrigger>
            <TabsTrigger value="optimized" className="gap-1.5 text-xs sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
              优化版本
            </TabsTrigger>
          </TabsList>

          <TabsContent value="section-diff" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
            <div className={diffViewportClass} role="region" aria-label="按章节 Plain Diff 对比">
              <p className="shrink-0 text-[11px] text-muted-foreground md:hidden">
                小屏为上下排列；点击章节标签可快速跳转
              </p>
              <div className={cn(diffBodyClass, "flex flex-col md:flex-row")}>
                <DiffSectionNav items={sectionNavItems} />
                <div className="min-h-0 min-w-0 flex-1">
                  <ResumeDiffView
                    mode="sections"
                    rawText={result.originalContent}
                    optimizedText={optimizedForDiff}
                    optimizedPlainText={optimizedPlainOverride}
                    usePlainText
                    onlyChangedSections={onlyChangedSections}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="line-diff" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
            <div className={diffViewportClass} role="region" aria-label="全文 Plain 行级对比">
              <div className={diffBodyClass}>
                <ResumeDiffView
                  mode="lines"
                  rawText={result.originalContent}
                  optimizedText={optimizedForDiff}
                  optimizedPlainText={optimizedPlainOverride}
                  usePlainText
                  syncScroll={syncScroll}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="original" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
            <ScrollArea className="h-[min(50vh,480px)] rounded-lg border border-border bg-muted/30">
              <div className="relative p-4">
                <button
                  type="button"
                  onClick={() => void handleCopyOriginal()}
                  className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="复制全文"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <pre className="whitespace-pre-wrap break-words pr-10 font-sans text-sm text-muted-foreground">
                  {displayBody}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="optimized" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
            <ScrollArea className="h-[min(50vh,480px)] rounded-lg border border-primary/30 bg-primary/5">
              <div className="prose prose-sm max-w-none p-4 text-sm dark:prose-invert">
                <ReactMarkdown>{result.optimizedContent}</ReactMarkdown>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
