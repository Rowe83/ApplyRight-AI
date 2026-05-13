"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { ResumeCard } from "@/components/resume-card"
import { UploadResumeCard } from "@/components/upload-resume-card"
import { RenameDialog, DeleteDialog } from "@/components/resume-dialogs"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Loader2, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { extractPdfTextFromFile } from "@/lib/extract-pdf-text"
import { MatchWithJobDescription, ResumeWithDetails } from "@/types/resume"

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
  const [authReady, setAuthReady] = useState(false)
  const [resumes, setResumes] = useState<ResumeData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedResume, setSelectedResume] = useState<ResumeData | null>(null)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Authentication check
  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      try {
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
      } catch (error) {
        console.error("Authentication check failed:", error)
        router.push("/login")
      }
    }

    void checkSession()

    return () => {
      cancelled = true
    }
  }, [router])

  // Fetch resumes
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

      // Fetch resumes first
      const { data: resumesData, error: resumesError } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (resumesError) {
        throw resumesError
      }

      // Fetch matches for each resume
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

      // Process resumes to add highest match score and target position
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
    if (authReady) {
      void fetchResumes()
    }
  }, [authReady, fetchResumes])

  // Upload resume
  const handleUpload = useCallback(async (file: File) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("请先登录")
      }

      setIsUploading(true)

      // Upload to Supabase Storage
      const filePath = `${user.id}/${Date.now()}_${crypto.randomUUID()}.pdf`
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, { upsert: false })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath)
      const fileUrl = publicUrlData.publicUrl

      // Extract PDF text
      const rawText = await extractPdfTextFromFile(file)
      const cleanedText = rawText.replace(/\\n/g, "\n")

      // Insert into resumes table
      const { error: insertError } = await supabase
        .from("resumes")
        .insert({
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

      // Refresh resumes list
      void fetchResumes()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "上传失败，请稍后重试"
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
  }, [router, fetchResumes])

  // Rename resume
  const handleRename = useCallback(async (resumeId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from("resumes")
        .update({ original_filename: newName })
        .eq("id", resumeId)

      if (error) {
        throw error
      }

      // Update local state
      setResumes((prev) =>
        prev.map((resume) =>
          resume.id === resumeId
            ? { ...resume, original_filename: newName }
            : resume
        )
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "重命名失败"
      toast.error("重命名失败", {
        description: message,
      })
      throw error
    }
  }, [])

  // Delete resume
  const handleDelete = useCallback(async (resumeId: string) => {
    try {
      // Get resume file URL for storage deletion
      const resume = resumes.find((r) => r.id === resumeId)
      if (!resume) {
        throw new Error("简历不存在")
      }

      // Extract file path from URL
      const urlParts = resume.file_url.split("/")
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `${resume.user_id}/${fileName}`

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("resumes")
        .remove([filePath])

      if (storageError) {
        console.error("Storage deletion error:", storageError)
      }

      // Delete from database (cascade will handle matches)
      const { error: dbError } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resumeId)

      if (dbError) {
        throw dbError
      }

      // Update local state
      setResumes((prev) => prev.filter((r) => r.id !== resumeId))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "删除失败"
      toast.error("删除失败", {
        description: message,
      })
      throw error
    }
  }, [resumes])

  // Copy resume content
  const handleCopy = useCallback(async (resumeId: string) => {
    try {
      const resume = resumes.find((r) => r.id === resumeId)
      if (!resume || !resume.raw_text) {
        throw new Error("简历内容为空")
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(resume.raw_text)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "复制失败"

      // Fallback: select text for manual copy
      const resumeForCopy = resumes.find((r) => r.id === resumeId)
      if (resumeForCopy?.raw_text) {
        try {
          await navigator.clipboard.writeText(resumeForCopy.raw_text)
        } catch (clipboardError) {
          console.error("Clipboard API failed:", clipboardError)
          throw new Error("无法访问剪贴板，请手动复制")
        }
      }

      toast.error("复制失败", {
        description: message,
      })
      throw error
    }
  }, [resumes])

  // Navigate to dashboard with resume
  const handleNavigate = useCallback((resumeId: string) => {
    router.push(`/dashboard?id=${encodeURIComponent(resumeId)}`)
  }, [router])

  // Handle rename dialog submit
  const handleRenameSubmit = useCallback(async (newName: string) => {
    if (!selectedResume) return
    await handleRename(selectedResume.id, newName)
    setIsRenameDialogOpen(false)
    setSelectedResume(null)
  }, [selectedResume, handleRename])

  // Handle delete dialog submit
  const handleDeleteSubmit = useCallback(async () => {
    if (!selectedResume) return
    await handleDelete(selectedResume.id)
    setIsDeleteDialogOpen(false)
    setSelectedResume(null)
  }, [selectedResume, handleDelete])

  // Loading state
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-hidden p-4">
          <div className="flex h-full flex-col gap-6">
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-medium">我的简历</h1>
              <p className="text-sm text-muted-foreground">
                共 {resumes.length} 份简历
              </p>
            </div>

            {/* Content Area */}
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : resumes.length === 0 ? (
              /* Empty State */
              <div className="flex-1">
                <Empty className="border-dashed">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileText className="h-8 w-8" />
                    </EmptyMedia>
                  </EmptyHeader>
                  <div className="text-center space-y-2">
                    <EmptyTitle>还没有简历</EmptyTitle>
                    <EmptyDescription>
                      上传您的第一份简历开始使用AI优化功能
                    </EmptyDescription>
                  </div>
                </Empty>
              </div>
            ) : (
              /* Resume Grid */
              <div className="flex flex-col gap-6 overflow-hidden">
                {/* Upload Card */}
                <UploadResumeCard onUpload={handleUpload} isUploading={isUploading} />

                {/* Resume Cards Grid */}
                <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto pb-4 md:grid-cols-2 lg:grid-cols-3">
                  {resumes.map((resume) => (
                    <ResumeCard
                      key={resume.id}
                      resume={resume}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onCopy={handleCopy}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>

      {/* Dialogs */}
      <RenameDialog
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        currentName={selectedResume?.original_filename || ""}
        onRename={handleRenameSubmit}
      />
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        resumeName={selectedResume?.original_filename || ""}
        onDelete={handleDeleteSubmit}
      />
    </SidebarProvider>
  )
}