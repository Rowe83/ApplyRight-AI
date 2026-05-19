import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { createBillingAdminClient } from "@/lib/billing-auth"
import { fulfillPackagePurchase } from "@/lib/billing-fulfill"
import type { MockPurchasePackageId } from "@/lib/billing-packages"
import { getStripe, isStripeConfigured } from "@/lib/stripe-server"

export const runtime = "nodejs"

const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  const userId = session.metadata?.userId
  const packageId = session.metadata?.packageId as MockPurchasePackageId | undefined

  if (!userId || !packageId || !session.id) {
    console.error("Stripe webhook missing metadata", session.id)
    return
  }

  if (session.payment_status !== "paid") {
    return
  }

  const adminClient = createBillingAdminClient()
  if (!adminClient) {
    throw new Error("Missing Supabase service configuration")
  }

  await fulfillPackagePurchase({
    adminClient,
    userId,
    packageId,
    source: "stripe",
    stripeSessionId: session.id,
    amountCents: session.amount_total ?? undefined,
  })
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  const body = await req.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutCompleted(session)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed"
    console.error("Stripe webhook error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
