"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  RESUME_TEMPLATE_CATALOG,
  type ResumeLibraryTemplate,
  type ResumeTemplateCategoryId,
} from "@/lib/resume-templates"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { ArrowLeft, Eye, FileStack, Loader2, Sparkles, Wand2 } from "lucide-react"

const CATEGORY_TABS: { value: ResumeTemplateCategoryId; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "frontend", label: "前端开发" },
  { value: "fullstack", label: "全栈开发" },
  { value: "product", label: "产品经理" },
  { value: "finance", label: "证券金融" },
]

export default function ResumeTemplatesPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [category, setCategory] = useState<ResumeTemplateCategoryId>("all")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<ResumeLibraryTemplate | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (cancelled) return

      if (error || !session) {
        router.push("/login")
        return
      }

      setAuthReady(true)
    }

    void boot()

    return () => {
      cancelled = true
    }
  }, [router])

  const filteredTemplates = useMemo(() => {
    if (category === "all") {
      return RESUME_TEMPLATE_CATALOG
    }
    return RESUME_TEMPLATE_CATALOG.filter((t) => t.category === category)
  }, [category])

  const handleOpenPreview = useCallback((template: ResumeLibraryTemplate) => {
    setPreviewTemplate(template)
    setPreviewOpen(true)
  }, [])

  const handleCloneFromTemplate = useCallback(
    async (template: ResumeLibraryTemplate) => {
      if (cloningId) {
        return
      }

      setCloningId(template.id)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        let token = session?.access_token
        if (!token) {
          const {
            data: { session: refreshed },
          } = await supabase.auth.refreshSession()
          token = refreshed?.access_token
        }

        if (!token) {
          toast.error("请先登录")
          router.push("/login")
          return
        }

        const response = await fetch("/api/resumes/clone-template", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ templateId: template.id }),
        })

        const data = (await response.json()) as { error?: string; resumeId?: string }

        if (!response.ok) {
          throw new Error(data.error || "克隆失败")
        }

        if (!data.resumeId) {
          throw new Error("未返回简历 ID")
        }

        toast.success("已导入简历库", {
          description: `「${template.roleTitle}」已写入「我的简历」，即将进入仪表盘`,
          duration: 4000,
        })

        setPreviewOpen(false)

        window.setTimeout(() => {
          router.push(`/dashboard?id=${encodeURIComponent(data.resumeId!)}`)
        }, 1000)
      } catch (e) {
        const message = e instanceof Error ? e.message : "克隆失败，请稍后重试"
        toast.error("克隆未完成", { description: message })
      } finally {
        setCloningId(null)
      }
    },
    [cloningId, router],
  )

  if (!authReady) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        role="status"
        aria-label="正在验证登录状态"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <DashboardHeader />
        <main className="flex flex-1 flex-col gap-6 overflow-auto p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
              <Link href="/dashboard" aria-label="返回仪表盘">
                <ArrowLeft className="h-4 w-4" />
                返回仪表盘
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <FileStack className="h-6 w-6 text-primary drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]" />
              <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">简历库</h1>
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-xs font-normal text-primary"
              >
                模板中心
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              按行业与岗位浏览精选范文（Markdown），支持一键克隆到「我的简历」，回到仪表盘即可对照 JD 开始优化。
            </p>
          </div>

          <Tabs
            value={category}
            onValueChange={(v) => setCategory(v as ResumeTemplateCategoryId)}
            className="w-full gap-4"
          >
            <TabsList
              className={cn(
                "inline-flex h-auto w-full max-w-full flex-wrap justify-start gap-1 rounded-xl border border-border/80",
                "bg-card/40 p-1.5 shadow-[0_0_24px_-8px_rgba(56,189,248,0.2)] backdrop-blur-sm",
              )}
            >
              {CATEGORY_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs sm:text-sm data-[state=active]:border-primary/40 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            role="list"
            aria-label="简历模板列表"
          >
            {filteredTemplates.map((template) => {
              const isCloning = cloningId === template.id
              return (
                <Card
                  key={template.id}
                  role="listitem"
                  className={cn(
                    "relative flex flex-col overflow-hidden border-primary/20 bg-gradient-to-br from-slate-950/90 via-card/80 to-primary/5",
                    "shadow-[0_0_32px_-12px_rgba(56,189,248,0.25)] transition-shadow hover:shadow-[0_0_40px_-8px_rgba(56,189,248,0.35)]",
                  )}
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
                  <CardHeader className="relative z-10 space-y-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold leading-snug text-foreground md:text-lg">
                        {template.roleTitle}
                      </CardTitle>
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {template.highlightTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="border border-border/60 bg-background/50 text-[10px] font-medium text-muted-foreground sm:text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <CardDescription
                      className={cn(
                        "line-clamp-3 text-xs leading-relaxed text-muted-foreground/80 sm:text-sm",
                        "blur-[0.35px] selection:blur-none",
                      )}
                    >
                      {template.summaryExcerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 flex-1 pb-2">
                    <div
                      className="pointer-events-none select-none rounded-md border border-dashed border-border/50 bg-muted/20 px-3 py-2"
                      aria-hidden
                    >
                      <p className="line-clamp-4 text-[10px] leading-relaxed text-muted-foreground/50 blur-[1.5px] sm:text-xs">
                        {`${template.markdownBody.slice(0, 220)}…`}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="relative z-10 mt-auto flex flex-wrap gap-2 border-t border-border/40 bg-black/10 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border/80 min-[400px]:flex-none"
                      onClick={() => handleOpenPreview(template)}
                      aria-label={`预览模板：${template.roleTitle}`}
                    >
                      <Eye className="mr-1.5 h-4 w-4" />
                      预览
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 min-[400px]:flex-none"
                      disabled={Boolean(cloningId)}
                      aria-busy={isCloning}
                      onClick={() => void handleCloneFromTemplate(template)}
                      aria-label={`以此模板创建简历：${template.roleTitle}`}
                    >
                      {isCloning ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          导入中…
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-1.5 h-4 w-4" />
                          以此模板创建简历
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>

          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-h-[90vh] max-w-3xl border-primary/20 bg-card/95 p-0 backdrop-blur-md">
              <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-6">
                <DialogTitle className="pr-8 text-left text-lg">
                  {previewTemplate?.roleTitle ?? "模板预览"}
                </DialogTitle>
                <DialogDescription className="text-left text-sm text-muted-foreground">
                  以下为完整 Markdown 范文预览。确认后可点击「以此模板创建简历」写入您的账户。
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[55vh] px-6 pb-4">
                <div className="prose prose-sm max-w-none pb-4 dark:prose-invert">
                  {previewTemplate ? <ReactMarkdown>{previewTemplate.markdownBody}</ReactMarkdown> : null}
                </div>
              </ScrollArea>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 bg-background/40 px-6 py-4">
                <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
                  关闭
                </Button>
                {previewTemplate ? (
                  <Button
                    type="button"
                    disabled={Boolean(cloningId)}
                    aria-busy={cloningId === previewTemplate.id}
                    onClick={() => void handleCloneFromTemplate(previewTemplate)}
                  >
                    {cloningId === previewTemplate.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        导入中…
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        以此模板创建简历
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
