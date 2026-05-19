import "server-only"
import path from "path"
import { mkdir } from "fs/promises"

export const getDataDir = () => {
  const raw = process.env.DATA_DIR?.trim() || "./data"
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
}

export const ensureDataDirs = async () => {
  const root = getDataDir()
  await mkdir(path.join(root, "resumes"), { recursive: true })
  await mkdir(path.join(root, "job-descriptions"), { recursive: true })
  await mkdir(path.join(root, "history"), { recursive: true })
  return root
}

export const resumeDir = (id: string) => path.join(getDataDir(), "resumes", id)
export const resumeMetaPath = (id: string) => path.join(resumeDir(id), "meta.json")
export const resumePdfPath = (id: string) => path.join(resumeDir(id), "source.pdf")
export const jdPath = (id: string) => path.join(getDataDir(), "job-descriptions", `${id}.json`)
export const historyPath = (id: string) => path.join(getDataDir(), "history", `${id}.json`)
export const configPath = () => path.join(getDataDir(), "config.json")
