export const extractPdfTextFromFile = async (file: File): Promise<string> => {
  if (typeof window === "undefined") {
    return ""
  }

  const { getDocument, GlobalWorkerOptions, version } = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  )

  GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const pageTexts: string[] = []

  type TextItem = {
    str?: string
    transform?: number[]
    width?: number
  }

  const buildPageText = (items: TextItem[]) => {
    const tokens = items
      .map((item) => ({
        text: String(item.str ?? "").trim(),
        x: Array.isArray(item.transform) ? Number(item.transform[4] ?? 0) : 0,
        y: Array.isArray(item.transform) ? Number(item.transform[5] ?? 0) : 0,
      }))
      .filter((item) => item.text.length > 0)

    if (tokens.length === 0) return ""

    tokens.sort((a, b) => {
      const yDiff = b.y - a.y
      if (Math.abs(yDiff) > 1.5) return yDiff
      return a.x - b.x
    })

    const lines: string[] = []
    let currentLineY = tokens[0].y
    let currentLine: string[] = []

    const pushCurrentLine = () => {
      const line = currentLine.join(" ").replace(/\s+/g, " ").trim()
      if (line.length > 0) lines.push(line)
      currentLine = []
    }

    for (const token of tokens) {
      if (Math.abs(token.y - currentLineY) > 4) {
        pushCurrentLine()
        currentLineY = token.y
      }
      currentLine.push(token.text)
    }
    pushCurrentLine()

    return lines.join("\n").trim()
  }

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const pageText = buildPageText(textContent.items as TextItem[])
    pageTexts.push(pageText)
  }

  return pageTexts.filter(Boolean).join("\n\n").trim()
}
