"use client"

import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

type DashboardHeaderProps = {
  pageTitle: string
}

export const DashboardHeader = ({ pageTitle }: DashboardHeaderProps) => {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-4">
        <SidebarTrigger />
        <h1 className="truncate text-lg font-medium">{pageTitle}</h1>
      </div>
      <Button variant="outline" size="sm" className="gap-1.5" asChild>
        <Link href="/dashboard/settings" aria-label="打开 AI 设置">
          <Settings className="h-3.5 w-3.5" />
          AI 设置
        </Link>
      </Button>
    </header>
  )
}
