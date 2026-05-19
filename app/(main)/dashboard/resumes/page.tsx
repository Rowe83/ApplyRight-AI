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
import { FileText } from "lucide-react"
import { api } from "@/lib/api-client"
import { extractPdfTextFromFile } from "@/lib/extract-pdf-text"
import type { ResumeListItem, ResumeWithScore } from "@/types/resume"

type ResumeData = ResumeWithScore

const toResumeCardModel = (resume: ResumeListItem): ResumeData => ({
  ...resume,
  highest_match_score: resume.last_match_score ?? undefined,
  last_match_date: resume.last_match_at ?? null,
  target_position: resume.target_job?.trim() || "未分类岗位",
})

export default function ResumesPage() {
  const router = useRouter()
  const [resumes, setResumes] = useState<ResumeData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedResume, setSelectedResume] = useState<ResumeData | null>(null)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)

  const fetchResumes = useCallback(async () => {
    try {
      const data = (await api.getResumes()) as ResumeListItem[]
      setResumes((Array.isArray(data) ? data : []).map(toResumeCardModel))
    } catch (error) {
      console.error("Failed to fetch resumes:", error)
      const errorMessage = error instanceof Error ? error.message : "加载简历失败"
      toast.error("加载简历失败", { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchResumes()
  }, [fetchResumes])

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        setIsUploading(true)
        const rawText = await extractPdfTextFromFile(file)
        const formData = new FormData()
        formData.append("file", file)
        formData.append("raw_text", rawText.replace(/\\n/g, "\n"))

        const res = await api.uploadResume(formData)
        const body = (await res.json()) as { error?: string }
        if (!res.ok) {
          throw new Error(body.error ?? "上传失败")
        }

        toast.success("简历上传成功")
        void fetchResumes()
      } catch (error) {
        const message = error instanceof Error ? error.message : "上传失败，请稍后重试"
        toast.error("上传失败", { description: message })
      } finally {
        setIsUploading(false)
      }
    },
    [fetchResumes],
  )

  const handleRename = useCallback(async (resumeId: string, newName: string) => {
    try {
      await api.patchResume(resumeId, { original_filename: newName })
      setResumes((prev) =>
        prev.map((resume) =>
          resume.id === resumeId ? { ...resume, original_filename: newName } : resume,
        ),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "重命名失败"
      toast.error("重命名失败", { description: message })
      throw error
    }
  }, [])

  const handleDelete = useCallback(async (resumeId: string) => {
    await api.deleteResume(resumeId)
    setResumes((prev) => prev.filter((r) => r.id !== resumeId))
  }, [])

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
      if (!found) return
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
            <EmptyContent>
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
          if (!open) setSelectedResume(null)
        }}
        currentName={selectedResume?.original_filename || ""}
        onRename={handleRenameSubmit}
      />
    </div>
  )
}
