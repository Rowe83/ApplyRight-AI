"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, X, Sparkles, Loader2, Library } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { extractPdfTextFromFile } from "@/lib/extract-pdf-text"
import { readRefineSuggestions, type RefineSuggestionsPayload } from "@/lib/refine-suggestions-storage"
import { WorkbenchStepChecklist } from "@/components/workbench-step-checklist"
import {
  ANALYZE_BLOCKER_MESSAGES,
  deriveWorkbenchStepStatus,
  getAnalyzeBlocker,
  JD_MIN_LENGTH,
} from "@/lib/workbench-onboarding"

interface UploadPanelProps {
  onAnalyze: (payload: { resumeId: string; jdText: string }) => void
  isAnalyzing: boolean
  preloadedResume?: { id: string; name: string } | null
  hasCompletedFirstAnalysis?: boolean
}

/** Storage keys must be ASCII-only; Unicode filenames (e.g. 中文) cause Invalid key */
const buildResumeStoragePath = (userId: string) =>
  `${userId}/${Date.now()}_${crypto.randomUUID()}.pdf`

export const UploadPanel = ({
  onAnalyze,
  isAnalyzing,
  preloadedResume,
  hasCompletedFirstAnalysis = false,
}: UploadPanelProps) => {
  const searchParams = useSearchParams()
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preloadedDismissed, setPreloadedDismissed] = useState(false)
  const [refineHints, setRefineHints] = useState<RefineSuggestionsPayload | null>(null)

  useEffect(() => {
    setPreloadedDismissed(false)
  }, [preloadedResume?.id])

  useEffect(() => {
    if (searchParams.get("refine") !== "1") {
      setRefineHints(null)
      return
    }
    const stored = readRefineSuggestions()
    if (!stored) {
      setRefineHints(null)
      return
    }
    setRefineHints(stored)
    if (stored.targetJob?.trim()) {
      setJobDescription((prev) => (prev.trim() ? prev : stored.targetJob!.trim()))
    }
  }, [searchParams])

  const libraryResumeActive = Boolean(
    preloadedResume && !preloadedDismissed && !resumeFile
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === "application/pdf") {
      setResumeFile(file)
    } else {
      toast.error("仅支持 PDF 文件")
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file?.type === "application/pdf") {
      setResumeFile(file)
    } else if (file) {
      toast.error("仅支持 PDF 文件")
    }
  }, [])

  const handleRemoveFile = useCallback(() => {
    setResumeFile(null)
  }, [])

  const handleDismissPreloaded = useCallback(() => {
    setPreloadedDismissed(true)
  }, [])

  const handleAnalyzeClick = useCallback(async () => {
    const jdText = jobDescription.trim()
    if (jdText.length < JD_MIN_LENGTH) {
      toast.error(`请填写职位描述（至少 ${JD_MIN_LENGTH} 个字符）`)
      return
    }

    if (libraryResumeActive && preloadedResume) {
      onAnalyze({ resumeId: preloadedResume.id, jdText })
      return
    }

    if (!resumeFile) {
      toast.error("请上传 PDF 简历，或从「我的简历」进入以使用已有简历")
      return
    }

    setIsUploading(true)

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      const user = session?.user
      if (!user) {
        throw new Error("请先登录后再上传简历")
      }

      const extractedJobTitle =
        jdText
          .split("\n")
          .map((line) => line.trim())
          .find((line) => line.length > 0) ?? "未命名岗位"

      const { data: insertedJd, error: jdInsertError } = await supabase
        .from("job_descriptions")
        .insert({
          user_id: user.id,
          job_title: extractedJobTitle,
          full_text: jdText,
        })
        .select("id")
        .single()

      if (jdInsertError) {
        throw jdInsertError
      }

      const filePath = buildResumeStoragePath(user.id)

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, resumeFile, { upsert: false })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage.from("resumes").getPublicUrl(filePath)
      const rawText = await extractPdfTextFromFile(resumeFile)
      const cleanedText = rawText.replace(/\\n/g, "\n")
      console.log("Raw text to be stored:", JSON.stringify(cleanedText))

      const { data: insertedResume, error: insertError } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_url: publicUrlData.publicUrl,
          raw_text: cleanedText,
          original_filename: resumeFile.name.slice(0, 2048),
        })
        .select("id")
        .single<{ id: string }>()

      if (insertError || !insertedResume) {
        throw insertError
      }

      toast.success("简历上传成功", {
        description: `已完成 PDF 解析并写入 resumes 表，JD ID: ${insertedJd.id}`,
      })

      onAnalyze({ resumeId: insertedResume.id, jdText })
    } catch (error) {
      let message =
        error instanceof Error ? error.message : "上传失败，请稍后重试"
      if (message.includes("Auth session missing")) {
        message = "请先登录后再上传简历"
      }
      toast.error("上传失败", { description: message })
    } finally {
      setIsUploading(false)
    }
  }, [jobDescription, onAnalyze, resumeFile, libraryResumeActive, preloadedResume])

  const hasResume = Boolean(resumeFile) || libraryResumeActive
  const stepStatus = deriveWorkbenchStepStatus({
    hasResume,
    jdText: jobDescription,
    hasCompletedFirstAnalysis,
  })
  const analyzeBlocker = getAnalyzeBlocker({ hasResume, jdText: jobDescription })
  const canAnalyze = jobDescription.trim().length >= JD_MIN_LENGTH && hasResume

  const refineItemCount = refineHints?.items.length ?? 0

  return (
    <div className="flex h-full flex-col gap-4">
      <WorkbenchStepChecklist status={stepStatus} />

      {refineItemCount > 0 ? (
        <div
          className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
          role="status"
          aria-label="定向优化提示"
        >
          <p className="font-medium text-primary">定向再分析</p>
          <p className="mt-1 text-muted-foreground">
            已带入 {refineItemCount} 条选中建议，点击「分析并优化」将优先围绕这些点改写简历。
          </p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
            {refineHints!.items.slice(0, 4).map((item) => (
              <li key={item} className="truncate">
                {item}
              </li>
            ))}
            {refineItemCount > 4 ? <li>…另有 {refineItemCount - 4} 条</li> : null}
          </ul>
        </div>
      ) : null}

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">① 上传简历</CardTitle>
          <CardDescription>仅支持 PDF 格式，或从「我的简历」带入</CardDescription>
        </CardHeader>
        <CardContent>
          {resumeFile ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{resumeFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(resumeFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={handleRemoveFile}
                type="button"
                aria-label="移除已选简历文件"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : libraryResumeActive && preloadedResume ? (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Library className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-primary">已从简历库加载</p>
                <p className="truncate text-sm font-medium text-foreground">{preloadedResume.name}</p>
                <p className="text-xs text-muted-foreground">无需再次上传，填写 JD 后即可分析</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={handleDismissPreloaded}
                type="button"
                aria-label="取消使用简历库中的简历"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("resume-upload")?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  document.getElementById("resume-upload")?.click()
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="选择或拖放 PDF 简历"
            >
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div
                className={cn(
                  "mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                  isDragging ? "bg-primary/20" : "bg-muted"
                )}
              >
                <Upload
                  className={cn(
                    "h-6 w-6 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )}
                  aria-hidden
                />
              </div>
              <p className="text-sm font-medium">拖放简历文件到此处</p>
              <p className="mt-1 text-xs text-muted-foreground">或点击浏览本地文件</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex flex-1 flex-col border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">② 目标职位描述</CardTitle>
          <CardDescription>粘贴您想申请的职位描述（JD，建议不少于 {JD_MIN_LENGTH} 字）</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Textarea
            placeholder="粘贴职位描述内容...

例如：
- 职位名称：高级前端工程师
- 职责要求：负责产品前端开发...
- 任职资格：3年以上前端开发经验..."
            className="min-h-[200px] resize-none bg-muted/30 text-sm"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          {analyzeBlocker && !isAnalyzing && !isUploading ? (
            <p className="text-center text-xs text-muted-foreground" role="status">
              {ANALYZE_BLOCKER_MESSAGES[analyzeBlocker]}
            </p>
          ) : null}
          <Button
            size="lg"
            className={cn(
              "relative w-full overflow-hidden transition-all",
              canAnalyze && !isAnalyzing && "shadow-[0_0_20px_rgba(124,58,237,0.3)]"
            )}
            disabled={!canAnalyze || isAnalyzing || isUploading}
            onClick={handleAnalyzeClick}
            type="button"
            aria-label="③ 分析并优化简历"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                上传并解析中...
              </>
            ) : isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                ③ 分析并优化
              </>
            )}
            {canAnalyze && !isAnalyzing && !isUploading && (
              <span className="absolute inset-0 -z-10 animate-pulse bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0" />
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
