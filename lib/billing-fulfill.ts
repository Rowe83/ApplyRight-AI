import type { SupabaseClient } from "@supabase/supabase-js"
import {
  BILLING_PACKAGES,
  PACKAGE_CREDITS_BY_ID,
  type MockPurchasePackageId,
} from "@/lib/billing-packages"

export type BillingFulfillSource = "mock" | "stripe"

export type FulfillPackageResult = {
  credits: number
  packageId: MockPurchasePackageId
  label: string
  alreadyFulfilled: boolean
}

const buildRechargeDescription = (
  label: string,
  delta: number,
  kind: "paygo" | "subscription",
  source: BillingFulfillSource,
) => {
  const prefix = source === "stripe" ? "Stripe 支付" : "模拟套餐充值"
  if (kind === "subscription") {
    return source === "stripe"
      ? `${prefix}：${label}（+${delta} 次/月额度）`
      : `模拟月付开通：${label}（+${delta} 次/月额度）`
  }
  return `${prefix}：${label}（+${delta} 次）`
}

export const fulfillPackagePurchase = async ({
  adminClient,
  userId,
  packageId,
  source,
  stripeSessionId,
  amountCents,
}: {
  adminClient: SupabaseClient
  userId: string
  packageId: MockPurchasePackageId
  source: BillingFulfillSource
  stripeSessionId?: string
  amountCents?: number
}): Promise<FulfillPackageResult> => {
  if (!(packageId in PACKAGE_CREDITS_BY_ID)) {
    throw new Error("Invalid packageId")
  }

  const pack = PACKAGE_CREDITS_BY_ID[packageId]
  const packageDef = BILLING_PACKAGES.find((p) => p.id === packageId)
  if (!packageDef) {
    throw new Error("Package definition not found")
  }

  if (source === "stripe" && packageDef.stripePurchasable === false) {
    throw new Error("Package is not available for Stripe checkout")
  }

  if (source === "stripe" && amountCents != null && amountCents !== packageDef.priceCents) {
    throw new Error("Payment amount does not match package price")
  }

  if (stripeSessionId) {
    const { data: existingOrder } = await adminClient
      .from("payment_orders")
      .select("id, status, credits_granted")
      .eq("provider_session_id", stripeSessionId)
      .maybeSingle<{ id: string; status: string; credits_granted: number | null }>()

    if (existingOrder?.status === "completed") {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .maybeSingle<{ credits: number | null }>()

      return {
        credits: profile?.credits ?? 0,
        packageId,
        label: pack.label,
        alreadyFulfilled: true,
      }
    }
  }

  const delta = pack.credits

  const { data: profile, error: readError } = await adminClient
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .maybeSingle<{ credits: number | null }>()

  if (readError) {
    throw new Error("Failed to read profile")
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
    throw new Error("Failed to update credits")
  }

  const description = buildRechargeDescription(pack.label, delta, pack.kind, source)

  const { error: txError } = await adminClient.from("credit_transactions").insert({
    user_id: userId,
    amount: delta,
    action_type: "recharge",
    description,
  })

  if (txError) {
    console.error("credit_transactions insert failed:", txError)
  }

  if (stripeSessionId) {
    const { error: orderError } = await adminClient.from("payment_orders").upsert(
      {
        user_id: userId,
        package_id: packageId,
        provider: "stripe",
        provider_session_id: stripeSessionId,
        amount_cents: amountCents ?? packageDef.priceCents,
        status: "completed",
        credits_granted: delta,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "provider_session_id" },
    )

    if (orderError) {
      console.error("payment_orders upsert failed:", orderError)
    }
  }

  return {
    credits: next,
    packageId,
    label: pack.label,
    alreadyFulfilled: false,
  }
}
