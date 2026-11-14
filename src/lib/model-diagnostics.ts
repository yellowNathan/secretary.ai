// Only return fixed categories and numeric HTTP statuses. Never expose provider text,
// URLs, request contents, account details, or credentials to the client or logs.
export function modelErrorCode(error: unknown): string {
  const queue: unknown[] = [error]
  const seen = new Set<object>()
  const messages: string[] = []
  const statuses: number[] = []
  const names: string[] = []
  for (let i = 0; i < queue.length && i < 12; i++) {
    const item = queue[i]
    if (typeof item === "string") { messages.push(item); continue }
    if (!item || typeof item !== "object" || seen.has(item)) continue
    seen.add(item)
    const value = item as { message?: unknown; name?: unknown; status?: unknown; statusCode?: unknown; cause?: unknown; errors?: unknown; response?: unknown }
    if (typeof value.message === "string") messages.push(value.message)
    if (typeof value.name === "string") names.push(value.name)
    for (const status of [value.statusCode, value.status]) {
      if (typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599) statuses.push(status)
    }
    if (value.cause) queue.push(value.cause)
    if (Array.isArray(value.errors)) queue.push(...value.errors.slice(0, 5))
    if (value.response && typeof value.response === "object") queue.push(value.response)
  }
  const text = messages.join(" ")
  if (/not available in your region/i.test(text)) return "AI_REGION_UNAVAILABLE"
  if (statuses.includes(429)) return "AI_RATE_LIMIT"
  if (statuses.some((status) => status === 401 || status === 403) || /\bforbidden\b/i.test(text)) return "AI_PROVIDER_DENIED"
  if (statuses.length) return `AI_PROVIDER_HTTP_${statuses[0]}`
  if (names.some((name) => /timeout/i.test(name)) || /\b(?:timed out|timeout)\b/i.test(text)) return "AI_PROVIDER_TIMEOUT"
  if (names.some((name) => /networkerror/i.test(name)) || /\b(?:fetch failed|network error|connection refused|connection reset)\b/i.test(text)) return "AI_PROVIDER_NETWORK"
  return "AI_PROVIDER_UNKNOWN"
}
