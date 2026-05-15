"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { supabase } from "@/lib/supabase"
import { CREDITS_CHANGED_EVENT } from "@/lib/credits-events"

type CreditsContextValue = {
  credits: number
  isLoading: boolean
  refreshCredits: () => Promise<void>
  setCreditsKnown: (n: number) => void
}

const CreditsContext = createContext<CreditsContextValue | null>(null)

export const CreditsProvider = ({ children }: { children: ReactNode }) => {
  const [credits, setCredits] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const setCreditsKnown = useCallback((n: number) => {
    if (!Number.isFinite(n)) {
      return
    }
    const rounded = Math.max(0, Math.floor(n))
    setCredits(rounded)
  }, [])

  const refreshCredits = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setIsLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle<{ credits: number | null }>()

    setCreditsKnown(profile?.credits ?? 0)
    setIsLoading(false)
  }, [setCreditsKnown])

  useEffect(() => {
    void refreshCredits()
  }, [refreshCredits])

  useEffect(() => {
    const handleCreditsEvent = (e: Event) => {
      const ce = e as CustomEvent<number | undefined>
      if (typeof ce.detail === "number" && Number.isFinite(ce.detail)) {
        setCreditsKnown(ce.detail)
        return
      }
      void refreshCredits()
    }

    window.addEventListener(CREDITS_CHANGED_EVENT, handleCreditsEvent)
    return () => window.removeEventListener(CREDITS_CHANGED_EVENT, handleCreditsEvent)
  }, [refreshCredits, setCreditsKnown])

  const value = useMemo(
    () => ({
      credits,
      isLoading,
      refreshCredits,
      setCreditsKnown,
    }),
    [credits, isLoading, refreshCredits, setCreditsKnown],
  )

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>
}

export const useCredits = () => {
  const ctx = useContext(CreditsContext)
  if (!ctx) {
    throw new Error("useCredits must be used within CreditsProvider")
  }
  return ctx
}
