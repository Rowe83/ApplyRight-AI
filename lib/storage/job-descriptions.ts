import "server-only"
import { randomUUID } from "crypto"
import { readdir, readFile, writeFile } from "fs/promises"
import type { JobDescriptionRecord } from "@/types/resume"
import { ensureDataDirs, jdPath } from "@/lib/storage/paths"

const jdDir = async () => {
  const root = await ensureDataDirs()
  return `${root}/job-descriptions`
}

export const listJobDescriptions = async (
  limit = 20,
): Promise<JobDescriptionRecord[]> => {
  const dir = await jdDir()
  const files = (await readdir(dir)).filter((name) => name.endsWith(".json"))
  const rows: JobDescriptionRecord[] = []

  for (const file of files) {
    try {
      const raw = await readFile(`${dir}/${file}`, "utf8")
      rows.push(JSON.parse(raw) as JobDescriptionRecord)
    } catch (err) {
      console.error("listJobDescriptions parse failed:", file, err)
    }
  }

  return rows
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
}

export const getJobDescription = async (
  id: string,
): Promise<JobDescriptionRecord | null> => {
  try {
    const raw = await readFile(jdPath(id), "utf8")
    return JSON.parse(raw) as JobDescriptionRecord
  } catch {
    return null
  }
}

export const createJobDescription = async (input: {
  job_title?: string
  full_text: string
}): Promise<JobDescriptionRecord> => {
  const fullText = input.full_text.trim()
  const firstLine =
    fullText
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "未命名岗位"

  const record: JobDescriptionRecord = {
    id: randomUUID(),
    job_title: input.job_title?.trim() || firstLine,
    full_text: fullText,
    created_at: new Date().toISOString(),
  }

  await ensureDataDirs()
  await writeFile(jdPath(record.id), JSON.stringify(record, null, 2), "utf8")
  return record
}
