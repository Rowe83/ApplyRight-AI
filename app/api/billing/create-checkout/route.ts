import { NextRequest, NextResponse } from "next/server"
import {
  BILLING_PACKAGES,
  isPackageStripePurchasable,
  type MockPurchasePackageId,
} from "@/lib/billing-packages"
import { createBillingAdminClient, resolveBillingUserId } from "@/lib/billing-auth"
import { getSiteUrl } from "@/lib/site-url"
import { getStripe, isStripeConfigured } from "@/lib/stripe-server"

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured. Set STRIPE_SECRET_KEY." },
        { status: 503 },
      )
    }

    const userId = await resolveBillingUserId(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as { packageId?: string }
    const packageId = body.packageId as MockPurchasePackageId | undefined
    const pack = BILLING_PACKAGES.find((p) => p.id === packageId)

    if (!pack || !isPackageStripePurchasable(pack)) {
      return NextResponse.json({ error: "Invalid or non-purchasable packageId" }, { status: 400 })
    }

    const adminClient = createBillingAdminClient()
    if (!adminClient) {
      return NextResponse.json({ error: "Missing Supabase service configuration" }, { status: 500 })
    }

    const siteUrl = getSiteUrl(req)
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "cny",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cny",
            unit_amount: pack.priceCents,
            product_data: {
              name: pack.title,
              description: pack.blurb,
            },
          },
        },
      ],
      metadata: {
        userId,
        packageId: pack.id,
      },
      client_reference_id: userId,
      success_url: `${siteUrl}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/billing?checkout=cancelled`,
      automatic_payment_methods: { enabled: true },
    })

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout session URL" }, { status: 500 })
    }

    const { error: pendingError } = await adminClient.from("payment_orders").insert({
      user_id: userId,
      package_id: pack.id,
      provider: "stripe",
      provider_session_id: session.id,
      amount_cents: pack.priceCents,
      status: "pending",
    })

    if (pendingError) {
      console.error("payment_orders pending insert failed:", pendingError)
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
