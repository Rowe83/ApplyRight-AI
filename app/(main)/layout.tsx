import { DashboardAppShell } from "@/components/dashboard-app-shell"

export default function MainAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <DashboardAppShell>{children}</DashboardAppShell>
}
