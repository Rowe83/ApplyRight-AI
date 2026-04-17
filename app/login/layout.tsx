import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "登录 · ApplyRight AI",
  description: "登录或注册 ApplyRight AI 账号",
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
