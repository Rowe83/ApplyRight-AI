import { normalizeForDiffCompare, toPlainResumeText } from "@/lib/plain-resume-text"

export type ResumeSection = {
  title: string
  rawContent: string
  optimizedContent: string
}

export type ResumeSectionDiffStats = {
  total: number
  changed: number
  lineAdds: number
  lineDeletes: number
}

export const sectionContentChanged = (raw: string, optimized: string): boolean =>
  normalizeForDiffCompare(raw) !== normalizeForDiffCompare(optimized)

export const prepareTextsForDiff = (
  rawText: string,
  optimizedText: string,
  usePlainText: boolean,
  optimizedPlainOverride?: string,
): { raw: string; optimized: string } => {
  const raw = usePlainText ? toPlainResumeText(rawText) : rawText
  if (optimizedPlainOverride?.trim()) {
    return { raw, optimized: optimizedPlainOverride.trim() }
  }
  if (!usePlainText) {
    return { raw, optimized: optimizedText }
  }
  return {
    raw,
    optimized: toPlainResumeText(optimizedText),
  }
}

export const parseResumeSections = (rawText: string, optimizedText: string): ResumeSection[] => {
  if (!rawText?.trim() && !optimizedText?.trim()) {
    return []
  }

  const sectionPatterns = [
    {
      title: "基本信息",
      pattern:
        /(?:^|\n)(?:基本信息|个人信息|姓名|联系方式|Contact Information|Basic Information)\s*[:：]?\s*\n/i,
    },
    {
      title: "专业概述",
      pattern:
        /(?:^|\n)(?:专业概述|个人简介|自我评价|职业总结|Professional Summary|Summary|Profile|About Me?|职业目标)\s*[:：]?\s*\n/i,
    },
    {
      title: "核心技能",
      pattern:
        /(?:^|\n)(?:核心技能|专业技能|技术栈|技能特长?|Core Skills|Skills|Technical Skills|Technologies|技能)\s*[:：]?\s*\n/i,
    },
    {
      title: "职业经历",
      pattern:
        /(?:^|\n)(?:职业经历|工作经历|工作经验|实习经历|Professional Experience|Work Experience|Experience|工作)\s*[:：]?\s*\n/i,
    },
    {
      title: "项目经历",
      pattern:
        /(?:^|\n)(?:项目经历|项目经验|Projects?|Project Experience)\s*[:：]?\s*\n/i,
    },
    {
      title: "教育背景",
      pattern:
        /(?:^|\n)(?:教育背景|学历|教育|Education|Educational Background)\s*[:：]?\s*\n/i,
    },
    {
      title: "证书荣誉",
      pattern:
        /(?:^|\n)(?:证书|荣誉|奖项|资格|Certifications?|Awards?|Honors?)\s*[:：]?\s*\n/i,
    },
  ]

  const parseText = (text: string) => {
    if (!text?.trim()) {
      return [] as { title: string; content: string }[]
    }

    const sections: { title: string; content: string }[] = []
    const cleanText = text.trim()
    const matches: { title: string; startIndex: number; endIndex: number }[] = []

    for (const { title, pattern } of sectionPatterns) {
      const regex = new RegExp(pattern.source.replace("^", "").replace("$", ""), "gi")
      let match: RegExpExecArray | null
      while ((match = regex.exec(cleanText)) !== null) {
        matches.push({
          title,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        })
      }
    }

    matches.sort((a, b) => a.startIndex - b.startIndex)

    for (let i = 0; i < matches.length; i += 1) {
      const current = matches[i]
      const next = matches[i + 1]
      const contentStart = current.endIndex
      const contentEnd = next ? next.startIndex : cleanText.length
      const sectionContent = cleanText.substring(contentStart, contentEnd).trim()
      if (sectionContent) {
        sections.push({ title: current.title, content: sectionContent })
      }
    }

    if (sections.length === 0) {
      const paragraphs = cleanText.split(/\n\s*\n/).filter((p) => p.trim())
      return paragraphs.map((p, i) => ({
        title: `段落 ${i + 1}`,
        content: p.trim(),
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

  const merged: ResumeSection[] = []
  for (const title of allTitles) {
    const rawContent = rawMap.get(title) || ""
    const optimizedContent = optimizedMap.get(title) || ""
    if (!rawContent && !optimizedContent) {
      continue
    }
    merged.push({ title, rawContent, optimizedContent })
  }

  return merged.length > 0
    ? merged
    : [
        {
          title: "简历内容",
          rawContent: rawText || "",
          optimizedContent: optimizedText || "",
        },
      ]
}

export const computeSectionDiffStats = (sections: ResumeSection[]): ResumeSectionDiffStats => {
  let changed = 0
  let lineAdds = 0
  let lineDeletes = 0

  for (const section of sections) {
    if (!sectionContentChanged(section.rawContent, section.optimizedContent)) {
      continue
    }
    changed += 1
    const rawLines = section.rawContent ? section.rawContent.split(/\n/) : []
    const optLines = section.optimizedContent ? section.optimizedContent.split(/\n/) : []
    lineAdds += Math.max(0, optLines.length - rawLines.length)
    lineDeletes += Math.max(0, rawLines.length - optLines.length)
  }

  return { total: sections.length, changed, lineAdds, lineDeletes }
}
