"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useCredits } from "@/components/credits-context"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Coins, Bell, User, LogOut, CreditCard, Loader2 } from "lucide-react"

type ProfileData = {
  username: string | null
}

type DashboardHeaderProps = {
  pageTitle: string
}

export const DashboardHeader = ({ pageTitle }: DashboardHeaderProps) => {
  const router = useRouter()
  const { credits, isLoading: creditsLoading } = useCredits()
  const [userEmail, setUserEmail] = useState("")
  const [displayName, setDisplayName] = useState("用户")

  const loadUserProfile = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return
    }

    setUserEmail(user.email ?? "")

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle<ProfileData>()

    const fullName = user.user_metadata?.full_name as string | undefined
    setDisplayName(profile?.username || fullName || user.email?.split("@")[0] || "用户")
  }, [])

  useEffect(() => {
    void loadUserProfile()
  }, [loadUserProfile])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error("退出失败", { description: error.message })
      return
    }
    toast.success("已退出登录")
    router.push("/login")
  }

  const avatarFallback = (displayName || "用户").slice(0, 1).toUpperCase()
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-4">
        <SidebarTrigger />
        <h1 className="truncate text-lg font-medium">{pageTitle}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/dashboard/billing"
          className="rounded-md outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="打开积分与计费中心"
        >
          <Badge
            variant="outline"
            className="flex cursor-pointer items-center gap-1.5 border-primary/30 bg-primary/10 px-3 py-1 text-primary transition-colors hover:bg-primary/15"
          >
            <Coins className="h-3.5 w-3.5" />
            <span className="font-medium">
              {creditsLoading ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  加载中
                </span>
              ) : (
                `${credits} 积分剩余`
              )}
            </span>
          </Badge>
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-border/80 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
          aria-label="退出登录"
        >
          <LogOut className="h-3.5 w-3.5" />
          退出登录
        </Button>
        <Button variant="ghost" size="icon" className="relative" type="button" aria-label="通知">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full" type="button" aria-label="打开用户菜单">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatars/user.png" alt="用户头像" />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{userEmail || "未登录"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="#" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>个人资料</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/billing" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>账单管理</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault()
                void handleSignOut()
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
