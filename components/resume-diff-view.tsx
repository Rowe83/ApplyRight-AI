"use client"

import { Fragment, useMemo, useRef, useCallback } from "react"
import { diffArrays, diffWords } from "diff"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  computeSectionDiffStats,
  parseResumeSections,
  prepareTextsForDiff,
  sectionContentChanged,
  type ResumeSection,
} from "@/lib/resume-sections"

type DiffAppearance = "light" | "dark"
type DiffMode = "sections" | "lines"

export type ResumeDiffViewProps = {
  rawText: string
  optimizedText: string
  mode?: DiffMode
  appearance?: DiffAppearance
  /** Strip Markdown before diff (default true) */
  usePlainText?: boolean
  /** AI-provided plain optimized text; skips stripping on optimized side */
  optimizedPlainText?: string
  onlyChangedSections?: boolean
  syncScroll?: boolean
}

export const ResumeDiffView = ({
  rawText,
  optimizedText,
  mode = "sections",
  appearance = "light",
  usePlainText = true,
  optimizedPlainText,
  onlyChangedSections = false,
  syncScroll = true,
}: ResumeDiffViewProps) => {
  const { raw, optimized } = useMemo(
    () => prepareTextsForDiff(rawText, optimizedText, usePlainText, optimizedPlainText),
    [rawText, optimizedText, usePlainText, optimizedPlainText],
  )

  if (mode === "lines") {
    return (
      <LineSyncedDiffView
        rawText={raw}
        optimizedText={optimized}
        appearance={appearance}
        syncScroll={syncScroll}
      />
    )
  }

  return (
    <SectionDiffView
      rawText={raw}
      optimizedText={optimized}
      appearance={appearance}
      onlyChangedSections={onlyChangedSections}
    />
  )
}

export const useResumeDiffStats = (
  rawText: string,
  optimizedText: string,
  usePlainText = true,
) => {
  return useMemo(() => {
    const { raw, optimized } = prepareTextsForDiff(rawText, optimizedText, usePlainText)
    const sections = parseResumeSections(raw, optimized)
    return computeSectionDiffStats(sections)
  }, [rawText, optimizedText, usePlainText])
}

type SectionDiffViewProps = {
  rawText: string
  optimizedText: string
  appearance: DiffAppearance
  onlyChangedSections: boolean
}

const SectionDiffView = ({
  rawText,
  optimizedText,
  appearance,
  onlyChangedSections,
}: SectionDiffViewProps) => {
  const sections = useMemo(() => {
    const all = parseResumeSections(rawText, optimizedText)
    if (!onlyChangedSections) {
      return all
    }
    return all.filter((s) => sectionContentChanged(s.rawContent, s.optimizedContent))
  }, [rawText, optimizedText, onlyChangedSections])

  const isDark = appearance === "dark"

  if (!sections.length) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className={cn("text-sm", isDark ? "text-slate-500" : "text-slate-500")}>
          {onlyChangedSections ? "所有章节与原文一致" : "暂无简历内容"}
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4 sm:p-6">
        {sections.map((section, index) => (
          <SectionBlock key={`${section.title}-${index}`} section={section} appearance={appearance} />
        ))}
      </div>
    </ScrollArea>
  )
}

const SectionBlock = ({
  section,
  appearance,
}: {
  section: ResumeSection
  appearance: DiffAppearance
}) => {
  const isDark = appearance === "dark"
  const changed = sectionContentChanged(section.rawContent, section.optimizedContent)

  return (
    <article className="space-y-3" data-diff-section={section.title}>
      <div className="flex items-center gap-2 border-b pb-2">
        <h3
          className={cn(
            "text-sm font-semibold",
            isDark ? "border-slate-700 text-slate-100" : "text-slate-900",
          )}
        >
          {section.title}
        </h3>
        {changed ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
            已修改
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">无变更</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Column label="原始简历" dotClass="bg-red-400" isDark={isDark}>
          <DiffContent
            content={section.rawContent}
            type="left"
            compareTo={section.optimizedContent}
            appearance={appearance}
          />
        </Column>
        <Column label="AI 优化版" dotClass="bg-green-400" isDark={isDark}>
          <DiffContent
            content={section.optimizedContent}
            type="right"
            originalContent={section.rawContent}
            appearance={appearance}
          />
        </Column>
      </div>
    </article>
  )
}

const Column = ({
  label,
  dotClass,
  isDark,
  children,
}: {
  label: string
  dotClass: string
  isDark: boolean
  children: React.ReactNode
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <div className={cn("h-2 w-2 rounded-full", dotClass)} aria-hidden />
      <span className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-600")}>
        {label}
      </span>
    </div>
    <div
      className={cn(
        "min-h-[80px] rounded-lg border p-4 shadow-sm",
        isDark ? "border-slate-800 bg-slate-950/80" : "border-slate-200 bg-white",
      )}
    >
      {children}
    </div>
  </div>
)

interface DiffContentProps {
  content: string
  type: "left" | "right"
  originalContent?: string
  compareTo?: string
  appearance: DiffAppearance
}

const DiffContent = ({
  content,
  type,
  originalContent,
  compareTo,
  appearance,
}: DiffContentProps) => {
  const isDark = appearance === "dark"

  const leftDiff = useMemo(() => {
    if (type !== "left" || !compareTo) {
      return null
    }
    return diffWords(content, compareTo)
  }, [content, compareTo, type])

  const rightDiff = useMemo(() => {
    if (type !== "right" || !originalContent || !content) {
      return null
    }
    return diffWords(originalContent, content)
  }, [content, type, originalContent])

  const bodyClass = cn(
    "whitespace-pre-wrap break-words text-sm leading-relaxed",
    isDark ? "text-slate-200" : "text-slate-700",
  )

  if (!content?.trim()) {
    return (
      <div className={cn("text-sm italic", isDark ? "text-slate-500" : "text-slate-400")}>
        暂无内容
      </div>
    )
  }

  if (type === "left" && leftDiff) {
    return (
      <div className={bodyClass}>
        {leftDiff.map((part, index) => {
          if (part.added) {
            return null
          }
          const value = part.value
          if (!value) {
            return null
          }
          if (part.removed) {
            return (
              <span
                key={index}
                className={cn(
                  "rounded px-0.5 font-medium line-through",
                  isDark ? "bg-red-500/15 text-red-300" : "bg-red-50 text-red-700",
                )}
              >
                {value}
              </span>
            )
          }
          return <span key={index}>{value}</span>
        })}
      </div>
    )
  }

  if (type === "right" && rightDiff) {
    return (
      <div className={bodyClass}>
        {rightDiff.map((part, index) => {
          const value = part.value
          if (!value || !value.trim()) {
            return null
          }
          if (part.removed) {
            return null
          }
          if (part.added) {
            return (
              <span
                key={index}
                className={cn(
                  "inline-block rounded px-0.5 font-medium",
                  isDark
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-green-50 text-green-700",
                )}
              >
                {value}
              </span>
            )
          }
          return <span key={index}>{value}</span>
        })}
      </div>
    )
  }

  return <div className={bodyClass}>{content}</div>
}

type LineSyncedDiffViewProps = {
  rawText: string
  optimizedText: string
  appearance: DiffAppearance
  syncScroll: boolean
}

const LineSyncedDiffView = ({
  rawText,
  optimizedText,
  appearance,
  syncScroll,
}: LineSyncedDiffViewProps) => {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)

  const rows = useMemo(() => {
    const oldLines = rawText === "" ? [] : rawText.split(/\n/)
    const newLines = optimizedText === "" ? [] : optimizedText.split(/\n/)
    const parts = diffArrays(oldLines, newLines)
    type Row = {
      left: string
      right: string
      leftKind: "equal" | "delete" | "empty"
      rightKind: "equal" | "insert" | "empty"
    }
    const out: Row[] = []

    for (const part of parts) {
      const lines = part.value as string[]
      if (!part.added && !part.removed) {
        for (const line of lines) {
          out.push({ left: line, right: line, leftKind: "equal", rightKind: "equal" })
        }
        continue
      }
      if (part.removed) {
        for (const line of lines) {
          out.push({ left: line, right: "", leftKind: "delete", rightKind: "empty" })
        }
        continue
      }
      if (part.added) {
        for (const line of lines) {
          out.push({ left: "", right: line, leftKind: "empty", rightKind: "insert" })
        }
      }
    }
    return out
  }, [rawText, optimizedText])

  const handleLeftScroll = useCallback(() => {
    if (!syncScroll || syncing.current || !leftRef.current || !rightRef.current) {
      return
    }
    syncing.current = true
    rightRef.current.scrollTop = leftRef.current.scrollTop
    syncing.current = false
  }, [syncScroll])

  const handleRightScroll = useCallback(() => {
    if (!syncScroll || syncing.current || !leftRef.current || !rightRef.current) {
      return
    }
    syncing.current = true
    leftRef.current.scrollTop = rightRef.current.scrollTop
    syncing.current = false
  }, [syncScroll])

  const isDark = appearance === "dark"

  if (rows.length === 0 && !rawText?.trim() && !optimizedText?.trim()) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className={cn("text-sm", isDark ? "text-slate-500" : "text-slate-500")}>
          暂无简历内容
        </p>
      </div>
    )
  }

  const cellBase = cn(
    "min-h-7 border-b px-2 py-1 align-top font-mono text-xs leading-relaxed sm:text-sm",
    "whitespace-pre-wrap break-all",
  )

  const grid = (
    <div
      className={cn(
        "grid min-h-0 flex-1 grid-cols-2 overflow-hidden rounded-lg border",
        isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-white",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-3 py-2 text-xs font-medium",
          isDark
            ? "border-slate-800 bg-slate-900/80 text-slate-300"
            : "border-slate-200 bg-slate-50 text-slate-600",
        )}
      >
        <span className="inline-block h-2 w-2 rounded-full bg-red-400" aria-hidden />
        原始（Plain）
      </div>
      <div
        className={cn(
          "flex items-center gap-2 border-b border-l px-3 py-2 text-xs font-medium",
          isDark
            ? "border-slate-800 bg-slate-900/80 text-slate-300"
            : "border-slate-200 bg-slate-50 text-slate-600",
        )}
      >
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
        优化（Plain）
      </div>

      <div
        ref={leftRef}
        onScroll={handleLeftScroll}
        className="max-h-[min(70vh,720px)] overflow-y-auto scrollbar-thin"
      >
        {rows.map((row, i) => (
          <div
            key={`l-${i}`}
            className={cn(
              cellBase,
              isDark ? "border-slate-800" : "border-slate-100",
              row.leftKind === "delete" &&
                (isDark ? "bg-red-500/10 text-red-200" : "bg-red-50 text-red-800"),
              row.leftKind === "equal" && (isDark ? "text-slate-200" : "text-slate-800"),
              row.leftKind === "empty" && (isDark ? "bg-slate-900/30" : "bg-slate-50/80"),
            )}
          >
            {row.left.length ? row.left : "\u00a0"}
          </div>
        ))}
      </div>

      <div
        ref={rightRef}
        onScroll={handleRightScroll}
        className="max-h-[min(70vh,720px)] overflow-y-auto border-l scrollbar-thin"
      >
        {rows.map((row, i) => (
          <div
            key={`r-${i}`}
            className={cn(
              cellBase,
              isDark ? "border-slate-800" : "border-slate-100",
              row.rightKind === "insert" &&
                (isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-50 text-emerald-900"),
              row.rightKind === "equal" && (isDark ? "text-slate-200" : "text-slate-800"),
              row.rightKind === "empty" && (isDark ? "bg-slate-900/30" : "bg-slate-50/80"),
            )}
          >
            {row.right.length ? row.right : "\u00a0"}
          </div>
        ))}
      </div>
    </div>
  )

  return <div className="flex h-full flex-col p-4">{grid}</div>
}
