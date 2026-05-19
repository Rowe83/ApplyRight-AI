import { NextRequest, NextResponse } from "next/server"
import { deleteHistory, getHistory } from "@/lib/storage/history"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const row = await getHistory(id)
  if (!row) {
    return NextResponse.json({ error: "History not found" }, { status: 404 })
  }
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const ok = await deleteHistory(id)
  if (!ok) {
    return NextResponse.json({ error: "History not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
