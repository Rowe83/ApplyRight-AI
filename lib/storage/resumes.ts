import "server-only"
import { randomUUID } from "crypto"
import { access, readdir, readFile, rm, writeFile } from "fs/promises"
import path from "path"
import type { Resume, ResumeListItem } from "@/types/resume"
import {
  ensureDataDirs,
  resumeDir,
  resumeMetaPath,
  resumePdfPath,
} from "@/lib/storage/paths"

const writeJsonAtomic = async (filePath: string, data: unknown) => {
  const tmp = `${filePath}.tmp`
  const body = JSON.stringify(data, null, 2)
  await writeFile(tmp, body, "utf8")
  const { rename } = await import("fs/promises")
  await rename(tmp, filePath)
}

const fileExists = async (filePath: string) => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export const listResumes = async (): Promise<ResumeListItem[]> => {
  const root = await ensureDataDirs()
  const resumesRoot = path.join(root, "resumes")
  let dirs: string[] = []
  try {
    dirs = await readdir(resumesRoot)
  } catch {
    return []
  }

  const items: ResumeListItem[] = []
  for (const id of dirs) {
    const metaFile = resumeMetaPath(id)
    if (!(await fileExists(metaFile))) continue
    try {
      const raw = await readFile(metaFile, "utf8")
      const meta = JSON.parse(raw) as Resume
      items.push({
        ...meta,
        has_pdf: await fileExists(resumePdfPath(id)),
      })
    } catch (err) {
      console.error("listResumes parse failed:", id, err)
    }
  }

  return items.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export const getResume = async (id: string): Promise<ResumeListItem | null> => {
  const metaFile = resumeMetaPath(id)
  if (!(await fileExists(metaFile))) return null
  try {
    const raw = await readFile(metaFile, "utf8")
    const meta = JSON.parse(raw) as Resume
    return {
      ...meta,
      has_pdf: await fileExists(resumePdfPath(id)),
    }
  } catch {
    return null
  }
}

export const createResume = async (input: {
  original_filename: string
  raw_text: string
  pdfBuffer?: Buffer
}): Promise<ResumeListItem> => {
  const id = randomUUID()
  const now = new Date().toISOString()
  const meta: Resume = {
    id,
    original_filename: input.original_filename.slice(0, 2048),
    raw_text: input.raw_text,
    created_at: now,
    updated_at: now,
  }

  await ensureDataDirs()
  const dir = resumeDir(id)
  const { mkdir } = await import("fs/promises")
  await mkdir(dir, { recursive: true })
  await writeJsonAtomic(resumeMetaPath(id), meta)

  if (input.pdfBuffer?.length) {
    await writeFile(resumePdfPath(id), input.pdfBuffer)
  }

  return {
    ...meta,
    has_pdf: Boolean(input.pdfBuffer?.length),
  }
}

export const updateResume = async (
  id: string,
  patch: Partial<
    Pick<
      Resume,
      | "original_filename"
      | "raw_text"
      | "parsed_name"
      | "target_job"
      | "last_match_score"
      | "last_match_at"
    >
  >,
): Promise<Resume | null> => {
  const existing = await getResume(id)
  if (!existing) return null

  const next: Resume = {
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
  }
  await writeJsonAtomic(resumeMetaPath(id), next)
  return next
}

export const deleteResume = async (id: string): Promise<boolean> => {
  const dir = resumeDir(id)
  if (!(await fileExists(dir))) return false
  await rm(dir, { recursive: true, force: true })
  return true
}

export const readResumePdf = async (id: string): Promise<Buffer | null> => {
  const pdfFile = resumePdfPath(id)
  if (!(await fileExists(pdfFile))) return null
  return readFile(pdfFile)
}
