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

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim()
    pageTexts.push(pageText)
  }

  return pageTexts.join("\n").trim()
}
