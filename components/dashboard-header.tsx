"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
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
  credits: number | null
}

export function DashboardHeader() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [displayName, setDisplayName] = useState("用户")
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadUserProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (userError || !user) {
        setIsLoading(false)
        return
      }

      setUserEmail(user.email ?? "")

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, credits")
        .eq("id", user.id)
        .maybeSingle<ProfileData>()

      if (cancelled) return

      const fullName = user.user_metadata?.full_name as string | undefined
      setDisplayName(profile?.username || fullName || user.email?.split("@")[0] || "用户")
      setCredits(profile?.credits ?? 0)
      setIsLoading(false)
    }

    void loadUserProfile()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error("退出失败", { description: error.message })
      return
    }
    toast.success("已退出登录")
    router.push("/login")
    router.refresh()
  }

  const avatarFallback = (displayName || "用户").slice(0, 1).toUpperCase()

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-lg font-medium">仪表盘</h1>
      </div>
      <div className="flex items-center gap-3">
        <Badge 
          variant="outline" 
          className="flex items-center gap-1.5 border-primary/30 bg-primary/10 px-3 py-1 text-primary"
        >
          <Coins className="h-3.5 w-3.5" />
          <span className="font-medium">
            {isLoading ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                加载中
              </span>
            ) : (
              `${credits} 积分剩余`
            )}
          </span>
        </Badge>
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
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
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>个人资料</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>账单管理</span>
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
