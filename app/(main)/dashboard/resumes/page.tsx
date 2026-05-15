"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ResumeCard } from "@/components/resume-card"
import { UploadResumeCard } from "@/components/upload-resume-card"
import { RenameDialog } from "@/components/resume-dialogs"
import { ResumeGridSkeleton } from "@/components/dashboard-skeletons"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { FileText, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { extractPdfTextFromFile } from "@/lib/extract-pdf-text"
import { MatchWithJobDescription, ResumeWithDetails, type ResumeWithScore } from "@/types/resume"

const pickJobTitleFromEmbed = (embed: unknown): string | undefined => {
  if (!embed || typeof embed !== "object") {
    return undefined
  }
  if (Array.isArray(embed)) {
    const first = embed[0] as { job_title?: string } | undefined
    return first?.job_title?.trim() || undefined
  }
  return (embed as { job_title?: string }).job_title?.trim() || undefined
}

type ResumeData = ResumeWithDetails & {
  highest_match_score?: number
  target_position?: string
  last_match_date?: string | null
}

export default function ResumesPage() {
  const router = useRouter()
  const [resumes, setResumes] = useState<ResumeData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedResume, setSelectedResume] = useState<ResumeData | null>(null)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)

  const fetchResumes = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push("/login")
        return
      }

      const { data: resumesData, error: resumesError } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (resumesError) {
        throw resumesError
      }

      const resumeIds = (resumesData ?? []).map((r) => r.id).filter(Boolean)

      let matchesData: {
        id: string
        resume_id: string
        match_score: number
        created_at: string
        job_descriptions: unknown
      }[] = []

      if (resumeIds.length > 0) {
        const { data: fetchedMatches, error: matchesError } = await supabase
          .from("matches")
          .select(`
          id,
          resume_id,
          match_score,
          created_at,
          job_descriptions (
            id,
            job_title
          )
        `)
          .in("resume_id", resumeIds)

        if (matchesError) {
          throw matchesError
        }

        matchesData = fetchedMatches ?? []
      }

      const processedResumes: ResumeData[] = (resumesData || []).map((resume) => {
        const resumeMatches = (matchesData ?? []).filter((m) => m.resume_id === resume.id)
        const sortedMatches = [...resumeMatches].sort((a, b) => b.match_score - a.match_score)
        const highestMatch = sortedMatches[0]
        const jdTitle = pickJobTitleFromEmbed(highestMatch?.job_descriptions)
        const tableTargetJob =
          typeof resume.target_job === "string" ? resume.target_job.trim() : ""
        const parsedNameTrimmed =
          typeof resume.parsed_name === "string" ? resume.parsed_name.trim() : ""

        return {
          ...resume,
          matches: resumeMatches as unknown as MatchWithJobDescription[],
          highest_match_score: highestMatch?.match_score,
          target_position: tableTargetJob || jdTitle || "未分类岗位",
          parsed_name: parsedNameTrimmed || null,
          last_match_date: highestMatch?.created_at ?? null,
        }
      })

      setResumes(processedResumes)
    } catch (error) {
      console.error("Failed to fetch resumes:", error)
      const errorMessage = error instanceof Error ? error.message : "加载简历失败"
      toast.error("加载简历失败", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    void fetchResumes()
  }, [fetchResumes])

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          throw new Error("请先登录")
        }

        setIsUploading(true)

        const filePath = `${user.id}/${Date.now()}_${crypto.randomUUID()}.pdf`
        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, file, { upsert: false })

        if (uploadError) {
          throw uploadError
        }

        const { data: publicUrlData } = supabase.storage.from("resumes").getPublicUrl(filePath)
        const fileUrl = publicUrlData.publicUrl

        const rawText = await extractPdfTextFromFile(file)
        const cleanedText = rawText.replace(/\\n/g, "\n")

        const { error: insertError } = await supabase.from("resumes").insert({
          user_id: user.id,
          file_url: fileUrl,
          raw_text: cleanedText,
          original_filename: file.name.slice(0, 2048),
        })

        if (insertError) {
          throw insertError
        }

        toast.success("简历上传成功", {
          description: "您的简历已成功上传",
        })

        void fetchResumes()
      } catch (error) {
        const message = error instanceof Error ? error.message : "上传失败，请稍后重试"
        if (message.includes("Auth session missing")) {
          toast.error("请先登录", {
            description: "登录后才能上传简历",
          })
          router.push("/login")
        } else {
          toast.error("上传失败", {
            description: message,
          })
        }
      } finally {
        setIsUploading(false)
      }
    },
    [router, fetchResumes],
  )

  const handleRename = useCallback(async (resumeId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from("resumes")
        .update({ original_filename: newName })
        .eq("id", resumeId)

      if (error) {
        throw error
      }

      setResumes((prev) =>
        prev.map((resume) =>
          resume.id === resumeId ? { ...resume, original_filename: newName } : resume,
        ),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "重命名失败"
      toast.error("重命名失败", {
        description: message,
      })
      throw error
    }
  }, [])

  const handleDelete = useCallback(async (resumeId: string) => {
    const resume = resumes.find((r) => r.id === resumeId)
    if (!resume) {
      throw new Error("简历不存在")
    }

    const urlParts = resume.file_url.split("/")
    const fileName = urlParts[urlParts.length - 1]
    const filePath = `${resume.user_id}/${fileName}`

    const { error: storageError } = await supabase.storage.from("resumes").remove([filePath])

    if (storageError) {
      console.error("Storage deletion error:", storageError)
    }

    const { error: dbError } = await supabase.from("resumes").delete().eq("id", resumeId)

    if (dbError) {
      throw dbError
    }

    setResumes((prev) => prev.filter((r) => r.id !== resumeId))
  }, [resumes])

  const handleCopy = useCallback(
    async (resumeId: string) => {
      const resume = resumes.find((r) => r.id === resumeId)
      if (!resume || !resume.raw_text) {
        throw new Error("简历内容为空")
      }

      await navigator.clipboard.writeText(resume.raw_text)
    },
    [resumes],
  )

  const handleNavigate = useCallback(
    (resumeId: string) => {
      router.push(`/dashboard?id=${encodeURIComponent(resumeId)}`)
    },
    [router],
  )

  const handleRenameSubmit = useCallback(
    async (newName: string) => {
      if (!selectedResume) return
      await handleRename(selectedResume.id, newName)
      setIsRenameDialogOpen(false)
      setSelectedResume(null)
    },
    [selectedResume, handleRename],
  )

  const handleRenameRequest = useCallback(
    (resume: ResumeWithScore) => {
      const found = resumes.find((r) => r.id === resume.id)
      if (!found) {
        return
      }
      setSelectedResume(found)
      setIsRenameDialogOpen(true)
    },
    [resumes],
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-medium">我的简历</h1>
        <p className="text-sm text-muted-foreground tabular-nums">共 {resumes.length} 份简历</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <UploadResumeCard onUpload={handleUpload} isUploading={isUploading} />
          <ResumeGridSkeleton />
        </div>
      ) : resumes.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <UploadResumeCard onUpload={handleUpload} isUploading={isUploading} />
          <Empty className="border border-dashed border-slate-700/80 bg-slate-950/35 py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText className="h-8 w-8 text-slate-400" />
              </EmptyMedia>
            </EmptyHeader>
            <EmptyTitle>还没有简历</EmptyTitle>
            <EmptyDescription>
              上传第一份 PDF 简历，即可在仪表盘对照 JD 进行 AI 深度优化与匹配诊断。
            </EmptyDescription>
            <EmptyContent className="flex flex-wrap justify-center gap-2">
              <Button type="button" asChild variant="secondary">
                <Link href="/dashboard/templates" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  从简历库导入模板
                </Link>
              </Button>
              <Button type="button" asChild className="gap-2">
                <Link href="/" aria-label="前往仪表盘">
                  前往仪表盘
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
          <UploadResumeCard onUpload={handleUpload} isUploading={isUploading} />

          <div className="scrollbar-dark grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto pb-4 md:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onRenameRequest={handleRenameRequest}
                onDelete={handleDelete}
                onCopy={handleCopy}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </div>
      )}

      <RenameDialog
        key={selectedResume?.id ?? "closed"}
        open={isRenameDialogOpen}
        onOpenChange={(open) => {
          setIsRenameDialogOpen(open)
          if (!open) {
            setSelectedResume(null)
          }
        }}
        currentName={selectedResume?.original_filename || ""}
        onRename={handleRenameSubmit}
      />
    </div>
  )
}
