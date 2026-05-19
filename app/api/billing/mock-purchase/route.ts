import { NextRequest, NextResponse } from "next/server"
import { createBillingAdminClient, resolveBillingUserId } from "@/lib/billing-auth"
import { fulfillPackagePurchase } from "@/lib/billing-fulfill"
import { isBillingMockAllowed } from "@/lib/stripe-server"
import { PACKAGE_CREDITS_BY_ID, type MockPurchasePackageId } from "@/lib/billing-packages"

export type { MockPurchasePackageId } from "@/lib/billing-packages"

export async function POST(req: NextRequest) {
  try {
    if (!isBillingMockAllowed()) {
      return NextResponse.json(
        { error: "Mock purchase is disabled in this environment" },
        { status: 403 },
      )
    }

    const adminClient = createBillingAdminClient()
    if (!adminClient) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables for /api/billing/mock-purchase" },
        { status: 500 },
      )
    }

    const userId = await resolveBillingUserId(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as { packageId?: string }
    const packageId = body.packageId as MockPurchasePackageId | undefined
    if (!packageId || !(packageId in PACKAGE_CREDITS_BY_ID)) {
      return NextResponse.json({ error: "Invalid packageId" }, { status: 400 })
    }

    const result = await fulfillPackagePurchase({
      adminClient,
      userId,
      packageId,
      source: "mock",
    })

    return NextResponse.json({
      credits: result.credits,
      packageId,
      label: result.label,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
