import { NextRequest, NextResponse } from "next/server"
import { deleteResume, getResume, updateResume } from "@/lib/storage/resumes"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const resume = await getResume(id)
  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 })
  }
  return NextResponse.json(resume)
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const body = (await req.json()) as {
    original_filename?: string
    raw_text?: string
    parsed_name?: string | null
    target_job?: string | null
  }

  const updated = await updateResume(id, {
    original_filename: body.original_filename,
    raw_text: body.raw_text,
    parsed_name: body.parsed_name,
    target_job: body.target_job,
  })

  if (!updated) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 })
  }
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const ok = await deleteResume(id)
  if (!ok) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
