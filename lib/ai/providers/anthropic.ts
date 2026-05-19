import "server-only"
import {
  OPTIMIZE_SYSTEM_PROMPT,
  buildOptimizeUserPrompt,
  extractJson,
  normalizeResult,
} from "@/lib/ai/optimize-prompt"
import type { OptimizeAiResult } from "@/lib/ai/types"

export const runAnthropicOptimize = async (options: {
  apiKey: string
  model: string
  resumeText: string
  jdText: string
  focusSuggestions?: string[]
}): Promise<OptimizeAiResult> => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: 8192,
      system: OPTIMIZE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildOptimizeUserPrompt(
            options.resumeText,
            options.jdText,
            options.focusSuggestions,
          ),
        },
      ],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Anthropic API error: ${response.status} ${errText}`)
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[]
  }
  const text =
    data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("") ?? ""

  const jsonText = extractJson(text)
  const parsed = JSON.parse(jsonText)
  return normalizeResult(parsed)
}
