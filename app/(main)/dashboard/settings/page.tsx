"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

type ProviderOption = {
  id: string
  label: string
  configured: boolean
}

type SettingsResponse = {
  provider: string
  model: string
  providers: ProviderOption[]
}

export default function SettingsPage() {
  const [provider, setProvider] = useState("deepseek")
  const [model, setModel] = useState("")
  const [providers, setProviders] = useState<ProviderOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = (await api.getSettings()) as SettingsResponse
      setProvider(data.provider)
      setModel(data.model)
      setProviders(data.providers ?? [])
    } catch (error) {
      toast.error("加载设置失败", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const data = (await api.patchSettings({ provider, model })) as SettingsResponse
      setProvider(data.provider)
      setModel(data.model)
      toast.success("设置已保存")
      void loadSettings()
    } catch (error) {
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleHealthCheck = async () => {
    setIsTesting(true)
    try {
      const result = (await api.healthCheck()) as { ok?: boolean; reply?: string }
      if (result.ok) {
        toast.success("连接成功", { description: result.reply ?? "AI 服务可用" })
      } else {
        toast.error("连接失败")
      }
    } catch (error) {
      toast.error("连接失败", {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-lg font-medium">AI 设置</h1>
        <p className="text-sm text-muted-foreground">
          选择模型厂商与模型名称。API Key 请在项目根目录 `.env.local` 中配置。
        </p>
      </div>

      <Alert>
        <AlertTitle>API Key 配置</AlertTitle>
        <AlertDescription>
          密钥不会保存在应用内，仅通过环境变量读取。请参考 README 中的各厂商配置说明。
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">模型</CardTitle>
          <CardDescription>保存到本地 data/config.json</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">厂商</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider" aria-label="选择 AI 厂商">
                <SelectValue placeholder="选择厂商" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                    {!item.configured ? "（未配置 Key）" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">模型名称</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="例如 deepseek-chat"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中
                </>
              ) : (
                "保存"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleHealthCheck}
              disabled={isTesting}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  测试中
                </>
              ) : (
                "测试连接"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
