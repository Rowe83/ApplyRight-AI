const parseJson = async <T>(res: Response): Promise<T> => {
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data && data.error
        ? String(data.error)
        : `Request failed (${res.status})`,
    )
  }
  return data
}

export const api = {
  getResumes: async () => parseJson<unknown[]>(await fetch("/api/resumes")),
  uploadResume: (formData: FormData) =>
    fetch("/api/resumes", { method: "POST", body: formData }),
  getResume: async (id: string) =>
    parseJson(await fetch(`/api/resumes/${id}`)),
  patchResume: async (id: string, body: object) =>
    parseJson(
      await fetch(`/api/resumes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  deleteResume: async (id: string) =>
    parseJson(await fetch(`/api/resumes/${id}`, { method: "DELETE" })),
  getRecentJds: async (limit = 10) =>
    parseJson(await fetch(`/api/job-descriptions?limit=${limit}`)),
  getHistories: async (limit = 50) =>
    parseJson(await fetch(`/api/history?limit=${limit}`)),
  getHistory: async (id: string) =>
    parseJson(await fetch(`/api/history/${id}`)),
  deleteHistory: async (id: string) =>
    parseJson(await fetch(`/api/history/${id}`, { method: "DELETE" })),
  optimize: async (body: object) =>
    parseJson(
      await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  getSettings: async () => parseJson(await fetch("/api/settings")),
  patchSettings: async (body: object) =>
    parseJson(
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  healthCheck: async () =>
    parseJson(await fetch("/api/settings/health", { method: "POST" })),
}
