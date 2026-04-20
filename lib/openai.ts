import "server-only"
import OpenAI from "openai"

const deepseekApiKey = process.env.DEEPSEEK_API_KEY
const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL

if (!deepseekApiKey) {
  throw new Error("Missing DEEPSEEK_API_KEY")
}

if (!deepseekBaseUrl) {
  throw new Error("Missing DEEPSEEK_BASE_URL")
}

const globalForOpenAI = globalThis as unknown as {
  openai?: OpenAI
}

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: deepseekApiKey,
    baseURL: deepseekBaseUrl,
  })

if (process.env.NODE_ENV !== "production") {
  globalForOpenAI.openai = openai
}
