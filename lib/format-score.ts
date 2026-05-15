/**
 * 匹配度展示：未完成、null 或非数字时统一为「--」
 */
export const formatMatchScoreDisplay = (score: unknown): string => {
  if (score === null || score === undefined) {
    return "--"
  }
  const n = Number(score)
  if (!Number.isFinite(n)) {
    return "--"
  }
  return `${Math.round(n)}`
}
