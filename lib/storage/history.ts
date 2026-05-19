import "server-only"
import { readdir, readFile, rm, writeFile } from "fs/promises"
import path from "path"
import type { MatchingHistoryRow } from "@/types/matching-history"
import { ensureDataDirs, historyPath } from "@/lib/storage/paths"

const writeHistoryAtomic = async (row: MatchingHistoryRow) => {
  const file = historyPath(row.id)
  const tmp = `${file}.tmp`
  const body = JSON.stringify(row, null, 2)
  await writeFile(tmp, body, "utf8")
  const { rename } = await import("fs/promises")
  await rename(tmp, file)
}

export const listHistories = async (limit?: number): Promise<MatchingHistoryRow[]> => {
  const root = await ensureDataDirs()
  const dir = path.join(root, "history")
  const files = (await readdir(dir)).filter((name) => name.endsWith(".json"))
  const rows: MatchingHistoryRow[] = []

  for (const file of files) {
    try {
      const raw = await readFile(`${dir}/${file}`, "utf8")
      rows.push(JSON.parse(raw) as MatchingHistoryRow)
    } catch (err) {
      console.error("listHistories parse failed:", file, err)
    }
  }

  const sorted = rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted
}

export const getHistory = async (id: string): Promise<MatchingHistoryRow | null> => {
  try {
    const raw = await readFile(historyPath(id), "utf8")
    return JSON.parse(raw) as MatchingHistoryRow
  } catch {
    return null
  }
}

export const appendHistory = async (row: MatchingHistoryRow): Promise<MatchingHistoryRow> => {
  await ensureDataDirs()
  await writeHistoryAtomic(row)
  return row
}

export const deleteHistory = async (id: string): Promise<boolean> => {
  try {
    await rm(historyPath(id), { force: true })
    return true
  } catch {
    return false
  }
}
