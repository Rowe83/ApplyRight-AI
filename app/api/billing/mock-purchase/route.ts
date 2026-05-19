import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

import { PACKAGE_CREDITS_BY_ID, type MockPurchasePackageId } from "@/lib/billing-packages"

export type { MockPurchasePackageId } from "@/lib/billing-packages"

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables for /api/billing/mock-purchase" },
        { status: 500 },
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const authHeader = req.headers.get("authorization")
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null

    let userId: string | null = null

    if (token) {
      const {
        data: { user: tokenUser },
      } = await adminClient.auth.getUser(token)
      userId = tokenUser?.id ?? null
    }

    if (!userId) {
      const cookieStore = await cookies()
      const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 })
          },
        },
      })
      const {
        data: { user: cookieUser },
      } = await serverClient.auth.getUser()
      userId = cookieUser?.id ?? null
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as { packageId?: string }
    const packageId = body.packageId as MockPurchasePackageId | undefined
    if (!packageId || !(packageId in PACKAGE_CREDITS_BY_ID)) {
      return NextResponse.json({ error: "Invalid packageId" }, { status: 400 })
    }

    const pack = PACKAGE_CREDITS_BY_ID[packageId]
    const delta = pack.credits

    const { data: profile, error: readError } = await adminClient
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .maybeSingle<{ credits: number | null }>()

    if (readError) {
      return NextResponse.json({ error: "Failed to read profile" }, { status: 500 })
    }

    const previous = profile?.credits ?? 0
    const next = previous + delta

    const { error: upsertError } = await adminClient.from("profiles").upsert(
      {
        id: userId,
        credits: next,
      },
      { onConflict: "id" },
    )

    if (upsertError) {
      return NextResponse.json({ error: "Failed to update credits" }, { status: 500 })
    }

    const { error: txError } = await adminClient.from("credit_transactions").insert({
      user_id: userId,
      amount: delta,
      action_type: "recharge",
      description:
        pack.kind === "subscription"
          ? `模拟月付开通：${pack.label}（+${delta} 次/月额度）`
          : `模拟套餐充值：${pack.label}（+${delta} 次）`,
    })

    if (txError) {
      console.error("credit_transactions insert failed:", txError)
    }

    return NextResponse.json({
      credits: next,
      packageId,
      label: pack.label,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
