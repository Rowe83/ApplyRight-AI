import { NextRequest, NextResponse } from "next/server"
import { readResumePdf } from "@/lib/storage/resumes"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const buffer = await readResumePdf(id)
  if (!buffer) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 })
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
    },
  })
}
