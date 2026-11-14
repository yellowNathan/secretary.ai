import { apiFetch } from "@/lib/api-fetch"
import { assistantHttpError } from "@/lib/assistant-errors"

/** Decode only the app's UI-message SSE stream, reporting safe diagnostic categories. */
export async function requestAssistant(body: unknown, signal?: AbortSignal) {
  let response: Response
  try {
    response = await apiFetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error("AI_NETWORK")
  }
  if (!response.ok) throw new Error(assistantHttpError(response.status))
  if (!response.body || !response.headers.get("content-type")?.toLowerCase().includes("text/event-stream")) throw new Error("AI_RESPONSE_FORMAT")
  let buffer = ""
  let finished = false
  let sawError = false
  function parse(event: string, controller: TransformStreamDefaultController<unknown>) {
    const data = event.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n")
    if (!data) return
    if (data === "[DONE]") { finished = true; return }
    let value: { type?: unknown; errorText?: unknown }
    try { value = JSON.parse(data) } catch { throw new Error("AI_STREAM_FORMAT") }
    if (!value || typeof value !== "object" || typeof value.type !== "string") throw new Error("AI_STREAM_FORMAT")
    if (value.type === "finish") finished = true
    if (value.type === "error") {
      sawError = true
      const allowed = /^(AI_REGION_UNAVAILABLE|AI_RATE_LIMIT|AI_PROVIDER_DENIED|AI_PROVIDER_UNKNOWN|AI_PROVIDER_TIMEOUT|AI_PROVIDER_NETWORK|AI_PROVIDER_HTTP_[45][0-9]{2}|AI_UNAVAILABLE)$/
      value.errorText = typeof value.errorText === "string" && allowed.test(value.errorText) ? value.errorText : "AI_STREAM_ERROR"
    }
    controller.enqueue(value)
  }
  return response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new TransformStream({
    transform(chunk, controller) {
      buffer += chunk
      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop() ?? ""
      for (const event of events) parse(event, controller)
    },
    flush(controller) {
      if (buffer.trim()) parse(buffer, controller)
      if (!finished && !sawError) throw new Error("AI_STREAM_INTERRUPTED")
    },
  }))
}
