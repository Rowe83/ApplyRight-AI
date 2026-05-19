import "server-only"
import OpenAI from "openai"
import {
  OPTIMIZE_SYSTEM_PROMPT,
  buildOptimizeUserPrompt,
  extractJson,
  normalizeResult,
} from "@/lib/ai/optimize-prompt"
import type { OptimizeAiResult } from "@/lib/ai/types"

export const runOpenAiCompatOptimize = async (options: {
  apiKey: string
  baseURL?: string
  model: string
  resumeText: string
  jdText: string
  focusSuggestions?: string[]
}): Promise<OptimizeAiResult> => {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseURL,
  })

  const completion = await client.chat.completions.create({
    model: options.model,
    temperature: 0.4,
    messages: [
      { role: "system", content: OPTIMIZE_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildOptimizeUserPrompt(
          options.resumeText,
          options.jdText,
          options.focusSuggestions,
        ),
      },
    ],
    response_format: { type: "json_object" },
  })

  const text = completion.choices[0]?.message?.content ?? ""
  const jsonText = extractJson(text)
  const parsed = JSON.parse(jsonText)
  return normalizeResult(parsed)
}
