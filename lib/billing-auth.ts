import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const createBillingAdminClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export const resolveBillingUserId = async (req: NextRequest): Promise<string | null> => {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return null
  }

  const adminClient = createBillingAdminClient()
  if (!adminClient) {
    return null
  }

  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null

  if (token) {
    const {
      data: { user: tokenUser },
    } = await adminClient.auth.getUser(token)
    if (tokenUser?.id) {
      return tokenUser.id
    }
  }

  const cookieStore = await cookies()
  const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 })
      },
    },
  })

  const {
    data: { user: cookieUser },
  } = await serverClient.auth.getUser()

  return cookieUser?.id ?? null
}
