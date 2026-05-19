import "server-only"
import { readFile, writeFile } from "fs/promises"
import { configPath, ensureDataDirs } from "@/lib/storage/paths"

export type AiProviderId = "openai" | "deepseek" | "anthropic" | "ollama"

export type AppConfig = {
  provider: AiProviderId
  model: string
}

const PROVIDERS: AiProviderId[] = ["openai", "deepseek", "anthropic", "ollama"]

const DEFAULT_CONFIG: AppConfig = {
  provider: "deepseek",
  model: "deepseek-chat",
}

const parseProvider = (value: string | undefined): AiProviderId | null => {
  if (!value) return null
  return PROVIDERS.includes(value as AiProviderId) ? (value as AiProviderId) : null
}

const readConfigFile = async (): Promise<Partial<AppConfig>> => {
  await ensureDataDirs()
  try {
    const raw = await readFile(configPath(), "utf8")
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    return parsed
  } catch {
    return {}
  }
}

export const readConfig = async (): Promise<AppConfig> => {
  const file = await readConfigFile()
  const envProvider = parseProvider(process.env.AI_PROVIDER?.trim())
  const envModel = process.env.AI_MODEL?.trim()

  const provider =
    parseProvider(file.provider) ?? envProvider ?? DEFAULT_CONFIG.provider
  const model = file.model?.trim() || envModel || DEFAULT_CONFIG.model

  return { provider, model }
}

export const writeConfig = async (patch: Partial<AppConfig>): Promise<AppConfig> => {
  const current = await readConfig()
  const next: AppConfig = {
    provider: parseProvider(patch.provider) ?? current.provider,
    model: patch.model?.trim() || current.model,
  }
  await ensureDataDirs()
  await writeFile(configPath(), JSON.stringify(next, null, 2), "utf8")
  return next
}

export const isProviderConfigured = (provider: AiProviderId): boolean => {
  switch (provider) {
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY?.trim())
    case "deepseek":
      return Boolean(
        process.env.DEEPSEEK_API_KEY?.trim() && process.env.DEEPSEEK_BASE_URL?.trim(),
      )
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
    case "ollama":
      return Boolean(process.env.OLLAMA_BASE_URL?.trim() || true)
    default:
      return false
  }
}
