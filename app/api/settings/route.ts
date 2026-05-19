import { NextRequest, NextResponse } from "next/server"
import {
  isProviderConfigured,
  readConfig,
  writeConfig,
  type AiProviderId,
} from "@/lib/storage/config"

const PROVIDER_LABELS: Record<AiProviderId, string> = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
  anthropic: "Anthropic",
  ollama: "Ollama (local)",
}

export async function GET() {
  const config = await readConfig()
  const providers = (Object.keys(PROVIDER_LABELS) as AiProviderId[]).map((id) => ({
    id,
    label: PROVIDER_LABELS[id],
    configured: isProviderConfigured(id),
  }))

  return NextResponse.json({
    provider: config.provider,
    model: config.model,
    providers,
  })
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { provider?: AiProviderId; model?: string }
  const config = await writeConfig({
    provider: body.provider,
    model: body.model,
  })
  return NextResponse.json({
    provider: config.provider,
    model: config.model,
  })
}
