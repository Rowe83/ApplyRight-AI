import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { getResumeTemplateById } from "@/lib/resume-templates"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/** 无 PDF 的模板克隆占位，满足非空 file_url 的常见约束 */
const TEMPLATE_CLONE_FILE_URL = "https://applyright.ai/library/template-clone"

type CloneBody = {
  templateId?: string
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables for clone-template" },
        { status: 500 },
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const authHeader = req.headers.get("authorization")
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null

    let userId: string | null = null

    if (token) {
      const {
        data: { user: tokenUser },
      } = await adminClient.auth.getUser(token)
      userId = tokenUser?.id ?? null
    }

    if (!userId) {
      const cookieStore = await cookies()
      const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 })
          },
        },
      })
      const {
        data: { user: cookieUser },
      } = await serverClient.auth.getUser()
      userId = cookieUser?.id ?? null
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as CloneBody
    const templateId = typeof body.templateId === "string" ? body.templateId.trim() : ""
    if (!templateId) {
      return NextResponse.json({ error: "Missing templateId" }, { status: 400 })
    }

    const template = getResumeTemplateById(templateId)
    if (!template) {
      return NextResponse.json({ error: "Invalid templateId" }, { status: 400 })
    }

    const originalFilename = `[克隆] ${template.roleTitle}`.slice(0, 2048)
    const rawText = template.markdownBody.trim()
    if (!rawText) {
      return NextResponse.json({ error: "Template has no content" }, { status: 500 })
    }

    const { data: inserted, error: insertError } = await adminClient
      .from("resumes")
      .insert({
        user_id: userId,
        file_url: TEMPLATE_CLONE_FILE_URL,
        raw_text: rawText,
        original_filename: originalFilename,
      })
      .select("id")
      .single<{ id: string }>()

    if (insertError || !inserted) {
      console.error("clone-template insert failed:", insertError)
      return NextResponse.json(
        { error: insertError?.message || "Failed to create resume" },
        { status: 500 },
      )
    }

    return NextResponse.json({ resumeId: inserted.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
