import type { NextRequest } from "next/server"

export const getSiteUrl = (req?: NextRequest): string => {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "")
  }

  if (req) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
    const proto = req.headers.get("x-forwarded-proto") ?? "http"
    if (host) {
      return `${proto}://${host}`
    }
  }

  return "http://localhost:3000"
}
