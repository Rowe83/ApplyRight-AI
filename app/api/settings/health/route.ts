import { NextResponse } from "next/server"
import { runOptimizeHealthCheck } from "@/lib/ai/registry"

export async function POST() {
  try {
    const reply = await runOptimizeHealthCheck()
    return NextResponse.json({ ok: true, reply })
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI health check failed"
    return NextResponse.json({ ok: false, error: message }, { status: 503 })
  }
}
