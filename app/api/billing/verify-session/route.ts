import { NextRequest, NextResponse } from "next/server"
import { createBillingAdminClient, resolveBillingUserId } from "@/lib/billing-auth"
import { fulfillPackagePurchase } from "@/lib/billing-fulfill"
import type { MockPurchasePackageId } from "@/lib/billing-packages"
import { getStripe, isStripeConfigured } from "@/lib/stripe-server"

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 })
    }

    const userId = await resolveBillingUserId(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as { sessionId?: string }
    const sessionId = body.sessionId?.trim()
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.metadata?.userId !== userId) {
      return NextResponse.json({ error: "Session does not belong to current user" }, { status: 403 })
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 })
    }

    const packageId = session.metadata?.packageId as MockPurchasePackageId | undefined
    if (!packageId) {
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 })
    }

    const adminClient = createBillingAdminClient()
    if (!adminClient) {
      return NextResponse.json({ error: "Missing Supabase service configuration" }, { status: 500 })
    }

    const result = await fulfillPackagePurchase({
      adminClient,
      userId,
      packageId,
      source: "stripe",
      stripeSessionId: session.id,
      amountCents: session.amount_total ?? undefined,
    })

    return NextResponse.json({
      credits: result.credits,
      label: result.label,
      alreadyFulfilled: result.alreadyFulfilled,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
