/** Strip Markdown noise so Diff compares semantic text, not formatting. */
export const toPlainResumeText = (text: string): string => {
  if (!text?.trim()) {
    return ""
  }

  let plain = text.replace(/\\n/g, "\n")

  plain = plain.replace(/```[\s\S]*?```/g, "")
  plain = plain.replace(/^#{1,6}\s+/gm, "")
  plain = plain.replace(/\*\*([^*]+)\*\*/g, "$1")
  plain = plain.replace(/\*([^*]+)\*/g, "$1")
  plain = plain.replace(/__([^_]+)__/g, "$1")
  plain = plain.replace(/_([^_]+)_/g, "$1")
  plain = plain.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  plain = plain.replace(/^\s*[-*+]\s+/gm, "• ")
  plain = plain.replace(/^\s*\d+\.\s+/gm, "")
  plain = plain.replace(/\n{3,}/g, "\n\n")

  return plain.trim()
}

export const normalizeForDiffCompare = (text: string): string =>
  text.replace(/\s+/g, " ").trim()
