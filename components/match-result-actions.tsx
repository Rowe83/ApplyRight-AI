"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { buildSaveAsResumeFilename, getOptimizedTextForDiff } from "@/lib/match-analysis"
import type { AnalysisResult } from "@/components/analysis-panel"
import { supabase } from "@/lib/supabase"
import { Check, Copy, FilePlus2, Loader2 } from "lucide-react"

export type AnalysisResultWithMeta = AnalysisResult & {
  historyId?: string
  resumeId?: string | null
  resumeTitle?: string | null
  targetJob?: string | null
}

type MatchResultActionsProps = {
  result: AnalysisResultWithMeta
}

export const MatchResultActions = ({ result }: MatchResultActionsProps) => {
  const router = useRouter()
  const [copiedOptimized, setCopiedOptimized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleCopyOptimized = async () => {
    const text = getOptimizedTextForDiff(result).trim()
    if (!text) {
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopiedOptimized(true)
      toast.success("已复制优化版简历")
      setTimeout(() => setCopiedOptimized(false), 1500)
    } catch {
      toast.error("复制失败")
    }
  }

  const handleSaveAsNewResume = async () => {
    const optimizedText = getOptimizedTextForDiff(result).trim()
    if (!optimizedText) {
      toast.error("优化内容为空，无法保存")
      return
    }

    setIsSaving(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push("/login")
        return
      }

      let fileUrl = ""
      if (result.resumeId) {
        const { data: sourceResume } = await supabase
          .from("resumes")
          .select("file_url")
          .eq("id", result.resumeId)
          .eq("user_id", user.id)
          .maybeSingle<{ file_url: string | null }>()
        fileUrl = sourceResume?.file_url?.trim() ?? ""
      }

      const filename = buildSaveAsResumeFilename(result.resumeTitle, result.targetJob)

      const { error: insertError } = await supabase.from("resumes").insert({
        user_id: user.id,
        file_url: fileUrl,
        raw_text: optimizedText,
        original_filename: filename,
      })

      if (insertError) {
        throw new Error(insertError.message)
      }

      toast.success("已另存为新简历", { description: filename })
      router.push("/dashboard/resumes")
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存失败，请稍后重试"
      toast.error("另存失败", { description: message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => void handleCopyOptimized()}
        aria-label="复制优化版简历全文"
      >
        {copiedOptimized ? (
          <Check className="h-4 w-4 text-emerald-500" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
        复制优化稿
      </Button>
      <Button
        type="button"
        size="sm"
        className="gap-2"
        disabled={isSaving}
        onClick={() => void handleSaveAsNewResume()}
        aria-label="将优化稿另存为新简历"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <FilePlus2 className="h-4 w-4" aria-hidden />
        )}
        另存为新简历
      </Button>
      {result.historyId ? (
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link href="/dashboard/history">查看匹配历史</Link>
        </Button>
      ) : null}
    </div>
  )
}
