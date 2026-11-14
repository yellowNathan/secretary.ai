import { useEffect, useRef, useState } from "react"
import { useCollection } from "@omg-dev/sdk"
import { extractActions } from "@/lib/assistant-actions"
import { apiFetch } from "@/lib/api-fetch"
import { botIds, retentionValue, type BotId, type HistoryRow, type SecretarySettings } from "@/lib/secretary"

type Message = { role: string; parts: Array<{ type: string; text?: string }> }
type Conversation = { messages: Message[]; status: string }
type Slot = { bot: BotId; id?: string; title?: string; desired: string; saved: string; working: boolean; failed: boolean }

/** Serialises writes per conversation so a slower old snapshot cannot overwrite a newer one. */
export function useConversationAutosave(chats: Record<BotId, Conversation>, proposedLabel: string, fallbackTitle: string, enabled: boolean) {
  const history = useCollection<HistoryRow>({ collection: "secretary_history", api: "/api/secretary_history" })
  const store = useRef(history)
  store.current = history
  const slots = useRef<Partial<Record<BotId, Slot>>>({})
  // Keep old slots alive while their final writes finish after Clear.
  const allSlots = useRef<Slot[]>([])
  const mounted = useRef(true)
  const [state, setState] = useState<"saved" | "saving" | "error">("saved")
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  function report() {
    if (!mounted.current) return
    const pending = allSlots.current
    setState(pending.some((s) => s.failed) ? "error" : pending.some((s) => s.working || s.desired !== s.saved) ? "saving" : "saved")
  }
  async function flush(slot: Slot, bot: BotId) {
    if (slot.working || slot.failed || !slot.desired || slot.desired === slot.saved) return
    slot.working = true
    report()
    try {
      while (slot.desired && slot.desired !== slot.saved) {
        // Recheck account policy before every write, including retries and
        // queued snapshots, so another tab disabling history is respected.
        const response = await apiFetch("/api/secretary_settings", { cache: "no-store" })
        if (!response.ok) throw new Error("settings unavailable")
        const settings = await response.json() as SecretarySettings[]
        if (!Array.isArray(settings)) throw new Error("invalid settings")
        if (retentionValue(settings[0]?.history_retention) === "off") {
          slot.saved = slot.desired
          window.dispatchEvent(new Event("secretary-history-disabled"))
          break
        }
        const snapshot = slot.desired
        const parsed = JSON.parse(snapshot) as { title: string; messages: string }
        if (slot.id) await store.current.update(slot.id, parsed)
        else {
          const row = await store.current.create({ bot, ...parsed })
          slot.id = row.id
        }
        slot.saved = snapshot
      }
    } catch {
      // Do not create another row on a failed update; retry the same slot.
      slot.failed = true
    } finally {
      slot.working = false
      report()
    }
  }

  const snapshots = botIds.map((bot) => {
    const chat = chats[bot]
    const busy = chat.status === "submitted" || chat.status === "streaming"
    const items = chat.messages.flatMap((message, index) => {
      // The final assistant message is incomplete while streaming. Save the
      // user's message immediately, and the response once the stream ends.
      if (busy && index === chat.messages.length - 1 && message.role === "assistant") return []
      const content = message.parts.filter((part) => part.type === "text").map((part) => part.text || "").join("")
      if (message.role === "user") return content.trim() ? [{ role: "user", text: content }] : []
      if (message.role !== "assistant") return []
      const parsed = extractActions(content)
      // Never persist unfinished action JSON (e.g. an interrupted stream).
      const unfinished = parsed.text.includes("```secretary-action")
      const visible = parsed.text.split("```secretary-action")[0].trim()
      const text = [visible, ...(parsed.actions.length || parsed.invalid || unfinished ? [proposedLabel] : [])].filter(Boolean).join("\n\n")
      return text.trim() ? [{ role: "assistant", text }] : []
    }).slice(-60)
    if (!items.length) return ""
    const title = items.find((m) => m.role === "user")?.text.slice(0, 100) || fallbackTitle
    return JSON.stringify({ title, messages: JSON.stringify(items) })
  })
  const snapshotKey = JSON.stringify(snapshots)
  useEffect(() => {
    if (!enabled) return
    const values = JSON.parse(snapshotKey) as string[]
    botIds.forEach((bot, index) => {
      const value = values[index]
      if (!value) return
      let slot = slots.current[bot]
      if (!slot) {
        slot = { bot, desired: "", saved: "", working: false, failed: false }
        slots.current[bot] = slot
        allSlots.current.push(slot)
      }
      const snapshot = JSON.parse(value) as { title: string; messages: string }
      if (slot.title) snapshot.title = slot.title
      slot.desired = JSON.stringify(snapshot)
      void flush(slot, bot)
    })
    report()
  }, [snapshotKey, enabled])

  function resume(bot: BotId, row: HistoryRow, messages: Array<{ role: string; text: string }>) {
    // Adopt an existing row without writing on open. The first follow-up updates
    // that row rather than creating a duplicate.
    const baseline = JSON.stringify({ title: row.title, messages: JSON.stringify(messages) })
    const slot: Slot = { bot, id: row.id, title: row.title, desired: baseline, saved: baseline, working: false, failed: false }
    slots.current[bot] = slot
    allSlots.current.push(slot)
  }
  function startNew(bot: BotId) { delete slots.current[bot] }
  function retry() {
    // Retained slots remember their bot even after the visible conversation changes.
    for (const slot of allSlots.current) {
      if (!slot.failed) continue
      slot.failed = false
      void flush(slot, slot.bot)
    }
    report()
  }
  return { state, resume, startNew, retry }
}
