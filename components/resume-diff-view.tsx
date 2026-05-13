"use client"

import { Fragment, useMemo } from "react"
import { diffArrays, diffWords } from "diff"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type DiffAppearance = "light" | "dark"
type DiffMode = "sections" | "lines"

interface ResumeSection {
  title: string
  rawContent: string
  optimizedContent: string
}

interface ResumeDiffViewProps {
  rawText: string
  optimizedText: string
  /** Structured resume sections (default) vs full-document line-aligned diff */
  mode?: DiffMode
  appearance?: DiffAppearance
}

export function ResumeDiffView({
  rawText,
  optimizedText,
  mode = "sections",
  appearance = "light",
}: ResumeDiffViewProps) {
  if (mode === "lines") {
    return (
      <LineSyncedDiffView
        rawText={rawText}
        optimizedText={optimizedText}
        appearance={appearance}
      />
    )
  }

  const sections = useMemo(() => {
    return parseResumeSections(rawText, optimizedText)
  }, [rawText, optimizedText])

  if (!sections || sections.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <p
            className={cn(
              "text-sm",
              appearance === "dark" ? "text-slate-500" : "text-slate-500",
            )}
          >
            暂无简历内容
          </p>
        </div>
      </div>
    )
  }

  const isDark = appearance === "dark"

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6">
        {sections.map((section, index) => (
          <div key={index} className="space-y-3">
            <h3
              className={cn(
                "border-b pb-2 text-sm font-semibold",
                isDark
                  ? "border-slate-700 text-slate-100"
                  : "border-slate-100 text-slate-900",
              )}
            >
              {section.title}
            </h3>

            <div className="grid grid-cols-2 items-stretch gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-400" />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isDark ? "text-slate-400" : "text-slate-600",
                    )}
                  >
                    原始简历
                  </span>
                </div>
                <div
                  className={cn(
                    "min-h-[100px] rounded-lg border p-6 shadow-sm",
                    isDark
                      ? "border-slate-800 bg-slate-950/80"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <DiffContent
                    content={section.rawContent}
                    type="left"
                    compareTo={section.optimizedContent}
                    appearance={appearance}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isDark ? "text-slate-400" : "text-slate-600",
                    )}
                  >
                    AI 优化版
                  </span>
                </div>
                <div
                  className={cn(
                    "min-h-[100px] rounded-lg border p-6 shadow-sm",
                    isDark
                      ? "border-slate-800 bg-slate-950/80"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <DiffContent
                    content={section.optimizedContent}
                    type="right"
                    originalContent={section.rawContent}
                    appearance={appearance}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

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
      <div
        className={cn(
          "text-sm italic",
          isDark ? "text-slate-500" : "text-slate-400",
        )}
      >
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
}

const LineSyncedDiffView = ({
  rawText,
  optimizedText,
  appearance,
}: LineSyncedDiffViewProps) => {
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
          out.push({
            left: line,
            right: line,
            leftKind: "equal",
            rightKind: "equal",
          })
        }
        continue
      }
      if (part.removed) {
        for (const line of lines) {
          out.push({
            left: line,
            right: "",
            leftKind: "delete",
            rightKind: "empty",
          })
        }
        continue
      }
      if (part.added) {
        for (const line of lines) {
          out.push({
            left: "",
            right: line,
            leftKind: "empty",
            rightKind: "insert",
          })
        }
      }
    }

    return out
  }, [rawText, optimizedText])

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

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div
          className={cn(
            "grid grid-cols-2 overflow-hidden rounded-lg border",
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
            原始快照
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
            优化快照
          </div>

          {rows.map((row, i) => (
            <Fragment key={`row-${i}`}>
              <div
                className={cn(
                  cellBase,
                  isDark ? "border-slate-800" : "border-slate-100",
                  row.leftKind === "delete" &&
                    (isDark
                      ? "bg-red-500/10 text-red-200"
                      : "bg-red-50 text-red-800"),
                  row.leftKind === "equal" &&
                    (isDark ? "text-slate-200" : "text-slate-800"),
                  row.leftKind === "empty" && (isDark ? "bg-slate-900/30" : "bg-slate-50/80"),
                )}
              >
                {row.left.length ? row.left : "\u00a0"}
              </div>
              <div
                className={cn(
                  cellBase,
                  "border-l",
                  isDark ? "border-slate-800" : "border-slate-100",
                  row.rightKind === "insert" &&
                    (isDark
                      ? "bg-emerald-500/10 text-emerald-200"
                      : "bg-emerald-50 text-emerald-900"),
                  row.rightKind === "equal" &&
                    (isDark ? "text-slate-200" : "text-slate-800"),
                  row.rightKind === "empty" && (isDark ? "bg-slate-900/30" : "bg-slate-50/80"),
                )}
              >
                {row.right.length ? row.right : "\u00a0"}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}

function parseResumeSections(rawText: string, optimizedText: string): ResumeSection[] {
  if (!rawText?.trim() && !optimizedText?.trim()) {
    return []
  }

  const sectionPatterns = [
    { priority: 1, title: "基本信息", pattern: /(?:^|\n)(?:基本信息|个人信息|姓名|联系方式|Contact Information|Basic Information)\s*[:：]?\s*\n/i },
    { priority: 2, title: "专业概述", pattern: /(?:^|\n)(?:专业概述|个人简介|自我评价|职业总结|Professional Summary|Summary|Profile|About Me?|职业目标)\s*[:：]?\s*\n/i },
    { priority: 3, title: "核心技能", pattern: /(?:^|\n)(?:核心技能|专业技能|技术栈|技能特长?|Core Skills|Skills|Technical Skills|Technologies|技能)\s*[:：]?\s*\n/i },
    { priority: 4, title: "职业经历", pattern: /(?:^|\n)(?:职业经历|工作经历|工作经验|实习经历|Professional Experience|Work Experience|Experience|工作)\s*[:：]?\s*\n/i },
    { priority: 5, title: "项目经历", pattern: /(?:^|\n)(?:项目经历|项目经验|Projects?|Project Experience)\s*[:：]?\s*\n/i },
    { priority: 6, title: "教育背景", pattern: /(?:^|\n)(?:教育背景|学历|教育|Education|Educational Background)\s*[:：]?\s*\n/i },
    { priority: 7, title: "证书荣誉", pattern: /(?:^|\n)(?:证书|荣誉|奖项|资格|Certifications?|Awards?|Honors?)\s*[:：]?\s*\n/i },
  ]

  const parseText = (text: string) => {
    if (!text?.trim()) {
      return []
    }

    const sections: { title: string; content: string; startIndex: number }[] = []
    const cleanText = text.trim()

    const matches: { title: string; startIndex: number; endIndex: number; content: string }[] = []

    for (const { title, pattern } of sectionPatterns) {
      const regex = new RegExp(pattern.source.replace("^", "").replace("$", ""), "gi")
      let match

      while ((match = regex.exec(cleanText)) !== null) {
        matches.push({
          title,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          content: "",
        })
      }
    }

    matches.sort((a, b) => a.startIndex - b.startIndex)

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i]
      const nextMatch = matches[i + 1]

      const contentStart = currentMatch.endIndex
      const contentEnd = nextMatch ? nextMatch.startIndex : cleanText.length

      const sectionContent = cleanText.substring(contentStart, contentEnd).trim()

      if (sectionContent) {
        sections.push({
          title: currentMatch.title,
          content: sectionContent,
          startIndex: currentMatch.startIndex,
        })
      }
    }

    if (sections.length === 0) {
      const paragraphs = cleanText.split(/\n\s*\n/).filter((p) => p.trim())
      return paragraphs.map((p, i) => ({
        title: `段落 ${i + 1}`,
        content: p.trim(),
        startIndex: i * 1000,
      }))
    }

    return sections
  }

  const rawSections = parseText(rawText || "")
  const optimizedSections = parseText(optimizedText || "")

  if (rawSections.length === 0 && optimizedSections.length === 0) {
    return [
      {
        title: "简历内容",
        rawContent: rawText || "",
        optimizedContent: optimizedText || "",
      },
    ]
  }

  const rawMap = new Map(rawSections.map((s) => [s.title, s.content]))
  const optimizedMap = new Map(optimizedSections.map((s) => [s.title, s.content]))

  const seenTitles = new Set<string>()
  const allTitles: string[] = []

  for (const section of [...rawSections, ...optimizedSections]) {
    if (!seenTitles.has(section.title)) {
      seenTitles.add(section.title)
      allTitles.push(section.title)
    }
  }

  const mergedSections: ResumeSection[] = []

  for (const title of allTitles) {
    const rawContent = rawMap.get(title) || ""
    const optimizedContent = optimizedMap.get(title) || ""

    if (!rawContent && !optimizedContent) {
      continue
    }

    mergedSections.push({
      title,
      rawContent,
      optimizedContent,
    })
  }

  return mergedSections.length > 0
    ? mergedSections
    : [
        {
          title: "简历内容",
          rawContent: rawText || "",
          optimizedContent: optimizedText || "",
        },
      ]
}
