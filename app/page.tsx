"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { UploadPanel } from "@/components/upload-panel"
import { AnalysisPanel, AnalysisResult } from "@/components/analysis-panel"
import { CheckCircle2, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function DashboardPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
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

    void checkSession()

    return () => {
      cancelled = true
    }
  }, [router])

  const handleAnalyze = async (payload: { resumeId: string; jdText: string }) => {
    setIsAnalyzing(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      let token = session?.access_token
      if (!token) {
        const {
          data: { session: refreshedSession },
        } = await supabase.auth.refreshSession()
        token = refreshedSession?.access_token
      }

      if (!token) {
        toast.error("请先登录")
        router.push("/login")
        return
      }

      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeId: payload.resumeId,
          jdText: payload.jdText,
        }),
      })

      const data = (await response.json()) as {
        error?: string
        match_score?: number
        score?: number
        strengths?: string[]
        weaknesses?: string[]
        missing_keywords?: string[]
        original_content?: string
        optimized_content?: string
        revised_summary?: string
        suggestions?: string[]
        top_3_suggestions?: string[]
      }
      console.log("optimize api raw response:", data)

      if (!response.ok) {
        if (data.error?.includes("余额不足")) {
          toast.error("余额不足", {
            description: "当前积分不足，请先充值后再分析",
          })
          return
        }
        throw new Error(data.error || "分析失败，请稍后重试")
      }

      const strengths = Array.isArray(data.strengths)
        ? data.strengths.filter(Boolean).slice(0, 5)
        : []
      const weaknesses = Array.isArray(data.weaknesses)
        ? data.weaknesses.filter(Boolean).slice(0, 5)
        : []
      const missingKeywords = Array.isArray(data.missing_keywords)
        ? data.missing_keywords.filter(Boolean)
        : []
      const suggestions = Array.isArray(data.suggestions)
        ? data.suggestions.filter(Boolean)
        : Array.isArray(data.top_3_suggestions)
          ? data.top_3_suggestions.filter(Boolean)
          : []
      const originalContent = data.original_content || ""
      const optimizedContent = data.optimized_content || data.revised_summary || ""
      const score = Number(data.match_score ?? data.score ?? 0)

      setAnalysisResult({
        matchScore: Number.isFinite(score) ? score : 0,
        strengths: strengths.length >= 3 ? strengths : suggestions.slice(0, 5),
        weaknesses: weaknesses.length >= 3 ? weaknesses : suggestions.slice(0, 5),
        missingKeywords,
        suggestions: [
          {
            category: "核心优化建议",
            items: suggestions,
          },
        ],
        originalContent: originalContent || payload.jdText,
        optimizedContent,
      })

      toast.success("简历优化成功！", {
        description: `您的简历匹配度为 ${Math.round(score)}%`,
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        duration: 5000,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "分析失败，请稍后重试"
      toast.error("分析失败", { description: message })
    } finally {
      setIsAnalyzing(false)
    }
  }

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
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-hidden p-4">
          <div className="grid h-full gap-6 lg:grid-cols-3">
            {/* Left Panel - Upload & Input (33%) */}
            <div className="lg:col-span-1 flex flex-col overflow-hidden">
              <UploadPanel onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
            </div>

            {/* Right Panel - Analysis Results (67%) */}
            <div className="lg:col-span-2 overflow-hidden rounded-lg border border-border bg-card/50 p-4">
              <AnalysisPanel result={analysisResult} isAnalyzing={isAnalyzing} />
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
