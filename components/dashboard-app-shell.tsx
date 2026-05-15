"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { CreditsProvider } from "@/components/credits-context"
import { supabase } from "@/lib/supabase"

const resolvePageTitle = (pathname: string) => {
  if (pathname === "/" || pathname === "/dashboard") {
    return "仪表盘"
  }
  if (pathname.startsWith("/dashboard/resumes")) {
    return "我的简历"
  }
  if (pathname.startsWith("/dashboard/templates")) {
    return "简历库"
  }
  if (pathname.startsWith("/dashboard/history")) {
    return "匹配历史"
  }
  if (pathname.startsWith("/dashboard/match-result")) {
    return "匹配结果"
  }
  if (pathname.startsWith("/dashboard/billing")) {
    return "积分与计费"
  }
  return "仪表盘"
}

export const DashboardAppShell = ({ children }: { children: ReactNode }) => {
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (cancelled) {
        return
      }

      if (error || !session) {
        router.push("/login")
        return
      }

      setAuthReady(true)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [router])

  if (!authReady) {
    return (
      <div
        className="flex min-h-svh items-center justify-center bg-background"
        role="status"
        aria-label="正在验证登录状态"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }

  const pageTitle = resolvePageTitle(pathname)

  return (
    <CreditsProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset className="flex min-h-svh min-w-0 flex-col">
          <DashboardHeader pageTitle={pageTitle} />
          <main className="dashboard-main-scroll scrollbar-dark min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 transition-opacity duration-200 ease-in-out">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </CreditsProvider>
  )
}
