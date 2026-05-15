export const CREDITS_CHANGED_EVENT = "applyright:credits-changed"

/**
 * 通知全站刷新积分。若传入服务端已确认的剩余次数，将立即写入，避免二次请求竞态。
 */
export const dispatchCreditsChanged = (nextKnownCredits?: number) => {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(
    new CustomEvent<number | undefined>(CREDITS_CHANGED_EVENT, {
      detail: nextKnownCredits,
    }),
  )
}
