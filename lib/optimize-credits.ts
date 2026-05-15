import type { SupabaseClient } from "@supabase/supabase-js"

const RPC_NOT_FOUND = "PGRST202"
const MAX_RESERVE_RETRIES = 5

const isRpcMissing = (error: { code?: string } | null) => error?.code === RPC_NOT_FOUND

type ReserveResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: "insufficient" | "error"; message?: string }

const reserveWithOptimisticUpdate = async (
  adminClient: SupabaseClient,
  userId: string,
): Promise<ReserveResult> => {
  for (let attempt = 0; attempt < MAX_RESERVE_RETRIES; attempt += 1) {
    const { data: profile, error: readError } = await adminClient
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .maybeSingle<{ credits: number | null }>()

    if (readError) {
      return { ok: false, reason: "error", message: readError.message }
    }

    const current = profile?.credits ?? 0
    if (current <= 0) {
      return { ok: false, reason: "insufficient" }
    }

    const next = current - 1
    const { data: updated, error: updateError } = await adminClient
      .from("profiles")
      .update({ credits: next })
      .eq("id", userId)
      .eq("credits", current)
      .select("credits")
      .maybeSingle<{ credits: number }>()

    if (updateError) {
      return { ok: false, reason: "error", message: updateError.message }
    }

    if (updated?.credits !== undefined) {
      return { ok: true, remaining: updated.credits }
    }
  }

  return { ok: false, reason: "insufficient" }
}

const refundWithReadUpdate = async (
  adminClient: SupabaseClient,
  userId: string,
): Promise<void> => {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .maybeSingle<{ credits: number | null }>()

  const current = profile?.credits ?? 0
  await adminClient
    .from("profiles")
    .upsert({ id: userId, credits: current + 1 }, { onConflict: "id" })
}

/** Reserve 1 optimize credit. Uses DB RPC when present; falls back to optimistic row update. */
export const tryReserveOptimizeCredit = async (
  adminClient: SupabaseClient,
  userId: string,
): Promise<ReserveResult> => {
  const { data: reservedBalance, error: reserveError } = await adminClient.rpc(
    "try_reserve_optimize_credit",
    { p_user_id: userId },
  )

  if (!reserveError) {
    if (reservedBalance === null || reservedBalance === undefined) {
      return { ok: false, reason: "insufficient" }
    }
    const remaining =
      typeof reservedBalance === "number" ? reservedBalance : Number(reservedBalance)
    if (!Number.isFinite(remaining)) {
      return { ok: false, reason: "insufficient" }
    }
    return { ok: true, remaining }
  }

  if (!isRpcMissing(reserveError)) {
    return { ok: false, reason: "error", message: reserveError.message }
  }

  console.warn(
    "try_reserve_optimize_credit RPC missing; using optimistic profiles update. " +
      "Run: npm run db:apply-credits-billing",
  )
  return reserveWithOptimisticUpdate(adminClient, userId)
}

/** Refund 1 optimize credit after a failed run. */
export const refundOptimizeCredit = async (
  adminClient: SupabaseClient,
  userId: string,
): Promise<void> => {
  const { error: refundError } = await adminClient.rpc("refund_optimize_credit", {
    p_user_id: userId,
  })

  if (!refundError) {
    return
  }

  if (!isRpcMissing(refundError)) {
    console.error("refund_optimize_credit failed:", refundError)
    return
  }

  try {
    await refundWithReadUpdate(adminClient, userId)
  } catch (err) {
    console.error("refund optimize credit fallback failed:", err)
  }
}
