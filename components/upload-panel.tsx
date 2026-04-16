"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, X, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadPanelProps {
  onAnalyze: (resumeFile: File | null, jobDescription: string) => void
  isAnalyzing: boolean
}

export function UploadPanel({ onAnalyze, isAnalyzing }: UploadPanelProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState("")
  const [isDragging, setIsDragging] = useState(false)

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
    if (file && (file.type === "application/pdf" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
      setResumeFile(file)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setResumeFile(file)
    }
  }, [])

  const handleRemoveFile = useCallback(() => {
    setResumeFile(null)
  }, [])

  const canAnalyze = resumeFile && jobDescription.trim().length > 0

  return (
    <div className="flex h-full flex-col gap-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">上传简历</CardTitle>
          <CardDescription>支持 PDF 或 Word 格式</CardDescription>
        </CardHeader>
        <CardContent>
          {!resumeFile ? (
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
            >
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className={cn(
                "mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                isDragging ? "bg-primary/20" : "bg-muted"
              )}>
                <Upload className={cn(
                  "h-6 w-6 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <p className="text-sm font-medium">拖放简历文件到此处</p>
              <p className="mt-1 text-xs text-muted-foreground">或点击浏览本地文件</p>
            </div>
          ) : (
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
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">目标职位描述</CardTitle>
          <CardDescription>粘贴您想申请的职位描述（JD）</CardDescription>
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
          <Button
            size="lg"
            className={cn(
              "relative w-full overflow-hidden transition-all",
              canAnalyze && !isAnalyzing && "shadow-[0_0_20px_rgba(124,58,237,0.3)]"
            )}
            disabled={!canAnalyze || isAnalyzing}
            onClick={() => onAnalyze(resumeFile, jobDescription)}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                分析并优化
              </>
            )}
            {canAnalyze && !isAnalyzing && (
              <span className="absolute inset-0 -z-10 animate-pulse bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0" />
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
