/** Normalize pasted or imported JD text for consistent matching. */
export const normalizeJdText = (raw: string): string => {
  if (!raw) {
    return ""
  }

  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  text = text.replace(/\u00a0/g, " ")

  const lines = text.split("\n").map((line) => line.replace(/\s+$/g, ""))
  text = lines.join("\n")
  text = text.replace(/\n{3,}/g, "\n\n")

  return text.trim()
}
