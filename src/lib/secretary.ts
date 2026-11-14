export type BotId = "general" | "organiser" | "planner" | "writer" | "brainstormer"
export const botNames: Record<BotId, string> = { general: "All-round secretary", organiser: "Organiser", planner: "Planner", writer: "Writer", brainstormer: "Brainstormer" }
export const botIds = Object.keys(botNames) as BotId[]
export type SecretarySettings = { id: string; tone: string; length: string; default_bot: string; instructions: string; history_retention?: string }
export const defaultSecretarySettings = { tone: "friendly", length: "balanced", default_bot: "general", instructions: "", history_retention: "forever" }
export function retentionValue(value?: string | null): string {
  if (!value || value === "forever") return "forever"
  if (value === "off") return value
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 3650 ? String(n) : "forever"
}
export function historyExpired(row: HistoryRow, retention: string, now = Date.now()): boolean {
  if (retention === "off" || retention === "forever") return false
  const lastActivity = Date.parse(row.updated_at || row.created_at || "")
  return Number.isFinite(lastActivity) && lastActivity <= now - Number(retention) * 86400000
}
export type HistoryRow = { id: string; bot: string; title: string; messages: string; created_at?: string; updated_at?: string }
export type SavedMessage = { role: "user" | "assistant"; text: string }
export function readHistory(raw: string): SavedMessage[] {
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string").slice(0, 60)
  } catch { return [] }
}
