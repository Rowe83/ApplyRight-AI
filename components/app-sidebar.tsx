"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  FileText,
  FolderArchive,
  History,
  Coins,
  Settings,
  Sparkles,
  GitCompare,
} from "lucide-react"

const navItems = [
  {
    title: "仪表盘",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    title: "我的简历",
    icon: FileText,
    href: "/dashboard/resumes",
  },
  {
    title: "简历库",
    icon: FolderArchive,
    href: "/dashboard/templates",
  },
  {
    title: "匹配结果",
    icon: GitCompare,
    href: "/dashboard/match-result",
  },
  {
    title: "匹配历史",
    icon: History,
    href: "/dashboard/history",
  },
  {
    title: "积分使用",
    icon: Coins,
    href: "/dashboard/billing",
  },
]

const isNavActive = (pathname: string, href: string) => {
  if (!href.startsWith("/")) {
    return false
  }
  if (href === "/") {
    return pathname === "/"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export const AppSidebar = () => {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            ApplyRight AI
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavActive(pathname, item.href)}
                    tooltip={item.title}
                  >
                    {item.href.startsWith("/") ? (
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    ) : (
                      <a href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="设置">
              <a href="#">
                <Settings className="h-4 w-4" />
                <span>设置</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
