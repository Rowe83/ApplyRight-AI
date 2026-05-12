"use client"

import { useMemo } from "react"
import { diffWords } from "diff"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ResumeSection {
  title: string
  rawContent: string
  optimizedContent: string
}

interface ResumeDiffViewProps {
  rawText: string
  optimizedText: string
}

export function ResumeDiffView({ rawText, optimizedText }: ResumeDiffViewProps) {
  // 结构化拆分为模块
  const sections = useMemo(() => {
    return parseResumeSections(rawText, optimizedText)
  }, [rawText, optimizedText])

  // 处理空内容
  if (!sections || sections.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm text-slate-500">暂无简历内容</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6">
        {sections.map((section, index) => (
          <div key={index} className="space-y-3">
            {/* 模块标题 */}
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              {section.title}
            </h3>

            {/* 左右双栏对比 */}
            <div className="grid grid-cols-2 gap-6 items-stretch">
              {/* 左栏 - 原始版本 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="text-xs font-medium text-slate-600">原始简历</span>
                </div>
                <div className="bg-white shadow-sm p-6 rounded-lg border border-slate-200 min-h-[100px]">
                  <DiffContent
                    content={section.rawContent}
                    type="left"
                  />
                </div>
              </div>

              {/* 右栏 - 优化版本 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-xs font-medium text-slate-600">AI 优化版</span>
                </div>
                <div className="bg-white shadow-sm p-6 rounded-lg border border-slate-200 min-h-[100px]">
                  <DiffContent
                    content={section.optimizedContent}
                    type="right"
                    originalContent={section.rawContent}
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
}

function DiffContent({ content, type, originalContent }: DiffContentProps) {
  const diffResult = useMemo(() => {
    if (type === "right" && originalContent && content) {
      return diffWords(originalContent, content)
    }
    return null
  }, [content, type, originalContent])

  // 处理空内容
  if (!content?.trim()) {
    return (
      <div className="text-sm text-slate-400 italic">
        暂无内容
      </div>
    )
  }

  // 左侧直接显示原始文本，右侧进行 diff 处理
  if (type === "left" || !diffResult) {
    return (
      <div className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
        {content}
      </div>
    )
  }

  // 右侧显示 diff 结果
  return (
    <div className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
      {diffResult.map((part, index) => {
        const isAdded = part.added
        const isRemoved = part.removed
        const value = part.value

        // 跳过空内容
        if (!value || !value.trim()) {
          return null
        }

        if (isRemoved) {
          return null // 右侧不显示删除的内容
        }

        if (isAdded) {
          return (
            <span
              key={index}
              className="bg-green-50 text-green-700 font-medium rounded px-0.5 py-0.5 inline-block"
            >
              {value}
            </span>
          )
        }

        // 未变化的内容
        return <span key={index}>{value}</span>
      })}
    </div>
  )
}

// 简历解析器 - 将文本拆分为结构化模块
function parseResumeSections(rawText: string, optimizedText: string): ResumeSection[] {
  // 处理空内容
  if (!rawText?.trim() && !optimizedText?.trim()) {
    return []
  }

  // 定义常见的简历模块模式（按优先级排序）
  const sectionPatterns = [
    { priority: 1, title: "基本信息", pattern: /(?:^|\n)(?:基本信息|个人信息|姓名|联系方式|Contact Information|Basic Information)\s*[:：]?\s*\n/i },
    { priority: 2, title: "专业概述", pattern: /(?:^|\n)(?:专业概述|个人简介|自我评价|职业总结|Professional Summary|Summary|Profile|About Me?|职业目标)\s*[:：]?\s*\n/i },
    { priority: 3, title: "核心技能", pattern: /(?:^|\n)(?:核心技能|专业技能|技术栈|技能特长?|Core Skills|Skills|Technical Skills|Technologies|技能)\s*[:：]?\s*\n/i },
    { priority: 4, title: "职业经历", pattern: /(?:^|\n)(?:职业经历|工作经历|工作经验|实习经历|Professional Experience|Work Experience|Experience|工作)\s*[:：]?\s*\n/i },
    { priority: 5, title: "项目经历", pattern: /(?:^|\n)(?:项目经历|项目经验|Projects?|Project Experience)\s*[:：]?\s*\n/i },
    { priority: 6, title: "教育背景", pattern: /(?:^|\n)(?:教育背景|学历|教育|Education|Educational Background)\s*[:：]?\s*\n/i },
    { priority: 7, title: "证书荣誉", pattern: /(?:^|\n)(?:证书|荣誉|奖项|资格|Certifications?|Awards?|Honors?)\s*[:：]?\s*\n/i },
  ]

  // 智能解析单个文本为模块
  const parseText = (text: string) => {
    if (!text?.trim()) {
      return []
    }

    const sections: { title: string; content: string; startIndex: number }[] = []
    const cleanText = text.trim()

    // 查找所有匹配的模块标题及其位置
    const matches: { title: string; startIndex: number; endIndex: number; content: string }[] = []

    for (const { title, pattern } of sectionPatterns) {
      const regex = new RegExp(pattern.source.replace('^', '').replace('$', ''), 'gi')
      let match

      while ((match = regex.exec(cleanText)) !== null) {
        matches.push({
          title,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          content: ""
        })
      }
    }

    // 按起始位置排序
    matches.sort((a, b) => a.startIndex - b.startIndex)

    // 提取每个模块的内容
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i]
      const nextMatch = matches[i + 1]

      const contentStart = currentMatch.endIndex
      const contentEnd = nextMatch ? nextMatch.startIndex : cleanText.length

      const content = cleanText.substring(contentStart, contentEnd).trim()

      if (content) {
        sections.push({
          title: currentMatch.title,
          content,
          startIndex: currentMatch.startIndex
        })
      }
    }

    // 如果没有找到标准模块，尝试按空行分割为段落
    if (sections.length === 0) {
      const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim())
      return paragraphs.map((p, i) => ({
        title: `段落 ${i + 1}`,
        content: p.trim(),
        startIndex: i * 1000
      }))
    }

    return sections
  }

  // 解析两个文本
  const rawSections = parseText(rawText || "")
  const optimizedSections = parseText(optimizedText || "")

  // 如果都是空的，返回默认单个模块
  if (rawSections.length === 0 && optimizedSections.length === 0) {
    return [{
      title: "简历内容",
      rawContent: rawText || "",
      optimizedContent: optimizedText || ""
    }]
  }

  // 创建标题到内容的映射（保留原始顺序）
  const rawMap = new Map(rawSections.map(s => [s.title, s.content]))
  const optimizedMap = new Map(optimizedSections.map(s => [s.title, s.content]))

  // 收集所有唯一标题，保持原始顺序
  const seenTitles = new Set<string>()
  const allTitles: string[] = []

  for (const section of [...rawSections, ...optimizedSections]) {
    if (!seenTitles.has(section.title)) {
      seenTitles.add(section.title)
      allTitles.push(section.title)
    }
  }

  // 合并对齐模块
  const mergedSections: ResumeSection[] = []

  for (const title of allTitles) {
    const rawContent = rawMap.get(title) || ""
    const optimizedContent = optimizedMap.get(title) || ""

    // 如果两边都为空，跳过
    if (!rawContent && !optimizedContent) {
      continue
    }

    mergedSections.push({
      title,
      rawContent,
      optimizedContent
    })
  }

  return mergedSections.length > 0 ? mergedSections : [{
    title: "简历内容",
    rawContent: rawText || "",
    optimizedContent: optimizedText || ""
  }]
}
