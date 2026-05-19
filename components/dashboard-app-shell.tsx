"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"

const resolvePageTitle = (pathname: string) => {
  if (pathname === "/" || pathname === "/dashboard") {
    return "仪表盘"
  }
  if (pathname.startsWith("/dashboard/resumes")) {
    return "我的简历"
  }
  if (pathname.startsWith("/dashboard/history")) {
    return "匹配历史"
  }
  if (pathname.startsWith("/dashboard/match-result")) {
    return "匹配结果"
  }
  if (pathname.startsWith("/dashboard/settings")) {
    return "AI 设置"
  }
  return "仪表盘"
}

export const DashboardAppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname() ?? ""
  const pageTitle = resolvePageTitle(pathname)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader pageTitle={pageTitle} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
