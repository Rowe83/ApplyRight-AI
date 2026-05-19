import "server-only"
import { readConfig, type AiProviderId } from "@/lib/storage/config"
import type { OptimizeAiResult } from "@/lib/ai/types"
import { runOpenAiCompatOptimize } from "@/lib/ai/providers/openai-compat"
import { runAnthropicOptimize } from "@/lib/ai/providers/anthropic"

const providerDefaultModels: Record<AiProviderId, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  anthropic: "claude-3-5-haiku-20241022",
  ollama: "llama3.2",
}

export const assertProviderConfigured = (provider: AiProviderId) => {
  switch (provider) {
    case "openai":
      if (!process.env.OPENAI_API_KEY?.trim()) {
        throw new Error("未配置 OPENAI_API_KEY，请在 .env 中设置")
      }
      return
    case "deepseek":
      if (!process.env.DEEPSEEK_API_KEY?.trim() || !process.env.DEEPSEEK_BASE_URL?.trim()) {
        throw new Error("未配置 DEEPSEEK_API_KEY 或 DEEPSEEK_BASE_URL")
      }
      return
    case "anthropic":
      if (!process.env.ANTHROPIC_API_KEY?.trim()) {
        throw new Error("未配置 ANTHROPIC_API_KEY")
      }
      return
    case "ollama":
      return
    default:
      throw new Error(`未知 AI 厂商: ${provider}`)
  }
}

export const runOptimize = async (
  resumeText: string,
  jdText: string,
  focusSuggestions: string[] = [],
): Promise<OptimizeAiResult> => {
  const config = await readConfig()
  const provider = config.provider
  const model = config.model || providerDefaultModels[provider]
  assertProviderConfigured(provider)

  switch (provider) {
    case "openai":
      return runOpenAiCompatOptimize({
        apiKey: process.env.OPENAI_API_KEY!.trim(),
        baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
        model,
        resumeText,
        jdText,
        focusSuggestions,
      })
    case "deepseek":
      return runOpenAiCompatOptimize({
        apiKey: process.env.DEEPSEEK_API_KEY!.trim(),
        baseURL: process.env.DEEPSEEK_BASE_URL!.trim(),
        model,
        resumeText,
        jdText,
        focusSuggestions,
      })
    case "ollama":
      return runOpenAiCompatOptimize({
        apiKey: process.env.OLLAMA_API_KEY?.trim() || "ollama",
        baseURL: `${(process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434").replace(/\/$/, "")}/v1`,
        model,
        resumeText,
        jdText,
        focusSuggestions,
      })
    case "anthropic":
      return runAnthropicOptimize({
        apiKey: process.env.ANTHROPIC_API_KEY!.trim(),
        model,
        resumeText,
        jdText,
        focusSuggestions,
      })
    default:
      throw new Error(`不支持的 AI 厂商: ${provider}`)
  }
}

export const runOptimizeHealthCheck = async (): Promise<string> => {
  const config = await readConfig()
  assertProviderConfigured(config.provider)

  if (config.provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model || providerDefaultModels.anthropic,
        max_tokens: 16,
        messages: [{ role: "user", content: "Reply with OK only." }],
      }),
    })
    if (!response.ok) {
      throw new Error(await response.text())
    }
    return "ok"
  }

  const { default: OpenAI } = await import("openai")
  let client: InstanceType<typeof OpenAI>
  switch (config.provider) {
    case "openai":
      client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!.trim(),
        baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
      })
      break
    case "deepseek":
      client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY!.trim(),
        baseURL: process.env.DEEPSEEK_BASE_URL!.trim(),
      })
      break
    case "ollama":
      client = new OpenAI({
        apiKey: "ollama",
        baseURL: `${(process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434").replace(/\/$/, "")}/v1`,
      })
      break
    default:
      throw new Error("unsupported")
  }

  const completion = await client.chat.completions.create({
    model: config.model || providerDefaultModels[config.provider],
    max_tokens: 8,
    messages: [{ role: "user", content: "Reply OK only." }],
  })
  return completion.choices[0]?.message?.content?.trim() || "ok"
}
