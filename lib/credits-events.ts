export const CREDITS_CHANGED_EVENT = "applyright:credits-changed"

export const dispatchCreditsChanged = () => {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(new CustomEvent(CREDITS_CHANGED_EVENT))
}
