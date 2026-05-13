"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Pencil, Trash2, Loader2 } from "lucide-react"

interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onRename: (newName: string) => Promise<void>
}

export function RenameDialog({
  open,
  onOpenChange,
  currentName,
  onRename,
}: RenameDialogProps) {
  const [newName, setNewName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    // Validation
    if (!newName.trim()) {
      toast.error("简历名称不能为空")
      return
    }

    if (newName.trim() === currentName) {
      onOpenChange(false)
      return
    }

    // Limit length to 200 characters
    if (newName.length > 200) {
      toast.error("简历名称不能超过200个字符")
      return
    }

    setIsSubmitting(true)
    try {
      await onRename(newName.trim())
      toast.success("简历名称已更新")
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "重命名失败"
      toast.error("重命名失败", { description: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false)
      setNewName("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            重命名简历
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rename-input">新名称</Label>
            <Input
              id="rename-input"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={currentName}
              disabled={isSubmitting}
              maxLength={200}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSubmitting) {
                  void handleSubmit()
                }
                if (e.key === "Escape") {
                  handleClose()
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {newName.length}/200 字符
            </p>
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !newName.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resumeName: string
  onDelete: () => Promise<void>
}

export function DeleteDialog({
  open,
  onOpenChange,
  resumeName,
  onDelete,
}: DeleteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onDelete()
      toast.success("简历已删除")
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败"
      toast.error("删除失败", { description: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            确认删除简历
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <DialogDescription>
            您确定要删除 "<span className="font-medium">{resumeName}</span>" 这份简历吗？
            此操作无法撤销，同时会删除相关的存储文件和分析记录。
          </DialogDescription>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="hover:bg-destructive/90 hover:text-destructive-foreground"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}