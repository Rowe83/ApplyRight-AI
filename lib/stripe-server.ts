import Stripe from "stripe"

let stripeClient: Stripe | null = null

export const isStripeConfigured = (): boolean => {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export const isBillingMockAllowed = (): boolean => {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_BILLING_MOCK === "true"
  )
}

export const getStripe = (): Stripe => {
  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secret, {
      typescript: true,
    })
  }

  return stripeClient
}
