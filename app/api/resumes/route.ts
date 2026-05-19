import { NextRequest, NextResponse } from "next/server"
import { createResume, listResumes } from "@/lib/storage/resumes"

const MAX_PDF_BYTES = 10 * 1024 * 1024

export async function GET() {
  try {
    const resumes = await listResumes()
    return NextResponse.json(resumes)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list resumes"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")
    const rawText = String(formData.get("raw_text") ?? "").trim()
    const filenameFromForm = String(formData.get("original_filename") ?? "").trim()

    if (!rawText) {
      return NextResponse.json({ error: "Missing raw_text" }, { status: 400 })
    }

    let pdfBuffer: Buffer | undefined
    let originalFilename = filenameFromForm || "resume.txt"

    if (file instanceof File) {
      if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })
      }
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json({ error: "PDF exceeds 10MB limit" }, { status: 400 })
      }
      pdfBuffer = Buffer.from(await file.arrayBuffer())
      originalFilename = file.name
    }

    const resume = await createResume({
      original_filename: originalFilename,
      raw_text: rawText.replace(/\\n/g, "\n"),
      pdfBuffer,
    })

    return NextResponse.json(resume, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload resume"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
