"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AuthMode = "signin" | "signup"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      toast.error("请填写邮箱和密码")
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
        if (error) throw error
        toast.success("登录成功")
        router.push("/")
        router.refresh()
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      })
      if (error) throw error

      if (data.session) {
        toast.success("注册成功")
        router.push("/")
        router.refresh()
        return
      }

      toast.success("注册成功", {
        description: "若项目开启了邮箱验证，请查收邮件中的确认链接后再登录",
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "操作失败，请稍后重试"
      toast.error(mode === "signin" ? "登录失败" : "注册失败", {
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-[380px]">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← ApplyRight AI
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            {mode === "signin" ? "欢迎回来" : "创建账号"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "使用邮箱与密码登录"
              : "填写信息完成注册"}
          </p>
        </div>

        <Card className="border-border/60 bg-card/80 shadow-none backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-medium">
              {mode === "signin" ? "登录" : "注册"}
            </CardTitle>
            <CardDescription className="text-xs">
              {mode === "signin"
                ? "尚未有账号？可切换到注册"
                : "已有账号？可切换到登录"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            <div
              className="flex rounded-lg border border-border/80 bg-muted/30 p-0.5"
              role="tablist"
              aria-label="登录或注册"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                className={
                  mode === "signin"
                    ? "flex-1 rounded-md bg-background py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-border/50 transition-all"
                    : "flex-1 rounded-md py-2 text-sm text-muted-foreground transition-all hover:text-foreground"
                }
                onClick={() => setMode("signin")}
              >
                登录
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={
                  mode === "signup"
                    ? "flex-1 rounded-md bg-background py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-border/50 transition-all"
                    : "flex-1 rounded-md py-2 text-sm text-muted-foreground transition-all hover:text-foreground"
                }
                onClick={() => setMode("signup")}
              >
                注册
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-xs font-medium">
                  邮箱
                </Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 bg-background/50"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-xs font-medium">
                  密码
                </Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 bg-background/50"
                  disabled={isSubmitting}
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                className="h-10 w-full font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "处理中…"
                  : mode === "signin"
                    ? "登录"
                    : "注册"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          继续即表示你同意平台的服务条款与隐私政策
        </p>
      </div>
    </div>
  )
}
