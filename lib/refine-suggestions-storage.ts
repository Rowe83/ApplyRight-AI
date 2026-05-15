export const REFINE_SUGGESTIONS_KEY = "applyright:v1:refineSuggestions"

export type RefineSuggestionsPayload = {
  items: string[]
  resumeId?: string
  targetJob?: string
}

export const persistRefineSuggestions = (payload: RefineSuggestionsPayload) => {
  if (typeof window === "undefined") {
    return
  }
  try {
    sessionStorage.setItem(REFINE_SUGGESTIONS_KEY, JSON.stringify(payload))
  } catch (err) {
    console.error("persistRefineSuggestions failed:", err)
  }
}

export const readRefineSuggestions = (): RefineSuggestionsPayload | null => {
  if (typeof window === "undefined") {
    return null
  }
  try {
    const raw = sessionStorage.getItem(REFINE_SUGGESTIONS_KEY)
    if (!raw?.trim()) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<RefineSuggestionsPayload>
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return null
    }
    return {
      items: parsed.items.filter(Boolean).map(String),
      resumeId: typeof parsed.resumeId === "string" ? parsed.resumeId : undefined,
      targetJob: typeof parsed.targetJob === "string" ? parsed.targetJob : undefined,
    }
  } catch {
    return null
  }
}

export const clearRefineSuggestions = () => {
  if (typeof window === "undefined") {
    return
  }
  sessionStorage.removeItem(REFINE_SUGGESTIONS_KEY)
}
