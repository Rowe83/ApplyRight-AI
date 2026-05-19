import { NextRequest, NextResponse } from "next/server"
import { listHistories } from "@/lib/storage/history"

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit")
  const limit = limitParam ? Number(limitParam) : undefined
  const rows = await listHistories(
    typeof limit === "number" && Number.isFinite(limit) ? limit : undefined,
  )
  return NextResponse.json(rows)
}
