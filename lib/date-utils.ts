const pad2 = (n: number) => String(n).padStart(2, "0")

const toValidDate = (input: string | number | Date | null | undefined): Date | null => {
  if (input === null || input === undefined) {
    return null
  }

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input
  }

  if (typeof input === "number" && Number.isFinite(input)) {
    const ms = input < 1e12 ? input * 1000 : input
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const s = String(input).trim()
  if (!s) {
    return null
  }

  const d = new Date(s)
  if (Number.isNaN(d.getTime())) {
    return null
  }

  return d
}

const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/**
 * 相对时间展示：今天显示「今天 HH:mm」；近 6 天显示「X天前」；更早显示「YYYY-MM-DD」。
 * 非法或缺失输入统一返回「未知时间」，不会出现 NaN。
 */
export const formatRelativeTime = (input: string | number | Date | null | undefined): string => {
  const date = toValidDate(input)
  if (!date) {
    return "未知时间"
  }

  const now = new Date()
  const dayDiff = Math.round((startOfLocalDay(now) - startOfLocalDay(date)) / (24 * 60 * 60 * 1000))

  if (dayDiff === 0) {
    return `今天 ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  }

  if (dayDiff >= 1 && dayDiff < 7) {
    return `${dayDiff}天前`
  }

  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  return `${y}-${m}-${day}`
}

/**
 * @param dateString - ISO date string to format
 * @returns Formatted date string (e.g., "2024年1月15日")
 */
export const formatDate = (dateString: string): string => {
  const date = toValidDate(dateString)
  if (!date) {
    return "未知日期"
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * @param dateString - ISO date string to format
 * @returns Formatted date and time string (e.g., "2024年1月15日 14:30")
 */
export const formatDateTime = (dateString: string): string => {
  const date = toValidDate(dateString)
  if (!date) {
    return "未知时间"
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Local wall-clock style for tables, e.g. 2026-05-13 14:30
 */
export const formatCompactLocalDateTime = (
  input: string | number | Date | null | undefined,
): string => {
  const date = toValidDate(input)
  if (!date) {
    return "—"
  }

  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  return `${y}-${m}-${day} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}
