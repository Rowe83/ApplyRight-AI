"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadResumeCardProps {
  onUpload: (file: File) => Promise<void>
  isUploading?: boolean
}

export function UploadResumeCard({ onUpload, isUploading = false }: UploadResumeCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (isUploading) return

    const file = e.dataTransfer.files[0]
    if (!file) return

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error("仅支持 PDF 文件")
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error("文件大小超过限制（最大10MB）")
      return
    }

    try {
      setUploadProgress(0)
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      await onUpload(file)

      clearInterval(progressInterval)
      setUploadProgress(100)
      setTimeout(() => setUploadProgress(0), 1000)
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败，请稍后重试"
      toast.error("上传失败", { description: message })
      setUploadProgress(0)
    }
  }, [isUploading, onUpload])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || isUploading) return

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error("仅支持 PDF 文件")
      return
    }

    // Validate file size
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error("文件大小超过限制（最大10MB）")
      return
    }

    try {
      setUploadProgress(0)
      await onUpload(file)
      setUploadProgress(100)
      setTimeout(() => setUploadProgress(0), 1000)
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败，请稍后重试"
      toast.error("上传失败", { description: message })
      setUploadProgress(0)
    }

    // Reset input
    e.target.value = ''
  }, [isUploading, onUpload])

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "border-border bg-card",
        isDragging && "border-primary/50 bg-primary/5",
        !isUploading && "hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent
        className={cn(
          "flex min-h-[200px] cursor-pointer flex-col items-center justify-center p-6",
          isDragging && "bg-primary/10"
        )}
        onClick={() => document.getElementById("resume-upload-input")?.click()}
      >
        <input
          id="resume-upload-input"
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div
                className="absolute inset-0 -z-10 rounded-full border-4 border-primary/20"
                style={{
                  transform: `rotate(${uploadProgress * 3.6}deg)`,
                  opacity: `${uploadProgress / 100}`,
                }}
              />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">正在上传简历...</p>
              <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 transition-all group-hover:scale-105">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
                isDragging
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              )}
            >
              {isDragging ? (
                <FileText className="h-8 w-8" />
              ) : (
                <Upload className="h-8 w-8 transition-transform group-hover:-translate-y-1" />
              )}
            </div>
            <div className="text-center space-y-1">
              <p
                className={cn(
                  "text-lg font-semibold transition-colors",
                  "text-foreground group-hover:text-primary"
                )}
              >
                {isDragging ? "释放文件上传" : "上传新简历"}
              </p>
              <p
                className={cn(
                  "text-sm transition-colors",
                  "text-muted-foreground group-hover:text-primary"
                )}
              >
                拖放PDF文件或点击选择
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}