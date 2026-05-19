import { NextRequest, NextResponse } from "next/server"
import { createJobDescription, listJobDescriptions } from "@/lib/storage/job-descriptions"

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20")
  const rows = await listJobDescriptions(Number.isFinite(limit) ? limit : 20)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { job_title?: string; full_text?: string }
  const fullText = body.full_text?.trim()
  if (!fullText) {
    return NextResponse.json({ error: "Missing full_text" }, { status: 400 })
  }
  const row = await createJobDescription({
    job_title: body.job_title,
    full_text: fullText,
  })
  return NextResponse.json(row, { status: 201 })
}
