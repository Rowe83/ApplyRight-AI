import { parseResumeSections, prepareTextsForDiff } from "@/lib/resume-sections"

const SECTION_KEYWORD_HINTS: Record<string, string[]> = {
  基本信息: ["姓名", "联系", "电话", "邮箱", "contact"],
  专业概述: ["概述", "简介", "summary", "profile", "目标"],
  核心技能: ["技能", "技术", "skill", "stack", "熟悉", "精通"],
  职业经历: ["经历", "工作", "公司", "职位", "experience", "负责"],
  项目经历: ["项目", "project", "github"],
  教育背景: ["教育", "学历", "学校", "education", "大学"],
  证书荣誉: ["证书", "认证", "award", "certification"],
}

export const findSectionTitleForKeyword = (
  keyword: string,
  rawText: string,
  optimizedText: string,
): string | null => {
  const needle = keyword.trim().toLowerCase()
  if (!needle) {
    return null
  }

  const { raw, optimized } = prepareTextsForDiff(rawText, optimizedText, true)
  const sections = parseResumeSections(raw, optimized)

  for (const section of sections) {
    const blob = `${section.title}\n${section.rawContent}\n${section.optimizedContent}`.toLowerCase()
    if (blob.includes(needle)) {
      return section.title
    }
  }

  for (const [title, hints] of Object.entries(SECTION_KEYWORD_HINTS)) {
    if (hints.some((h) => needle.includes(h) || h.includes(needle))) {
      return title
    }
  }

  return sections[0]?.title ?? null
}

export const scrollToDiffSection = (sectionTitle: string, containerSelector?: string) => {
  const selector = `[data-diff-section="${CSS.escape(sectionTitle)}"]`
  const root = containerSelector
    ? document.querySelector(containerSelector)
  : document
  const el = root?.querySelector(selector) ?? document.querySelector(selector)
  if (!el) {
    return false
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" })
  el.classList.add("ring-2", "ring-primary/60", "ring-offset-2", "ring-offset-background")
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-primary/60", "ring-offset-2", "ring-offset-background")
  }, 2200)
  return true
}

export const scrollToKeywordInDiff = (
  keyword: string,
  rawText: string,
  optimizedText: string,
  containerSelector?: string,
) => {
  const section = findSectionTitleForKeyword(keyword, rawText, optimizedText)
  if (section) {
    return scrollToDiffSection(section, containerSelector)
  }
  return false
}
