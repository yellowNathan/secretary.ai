type Message = { role: "user" | "assistant"; content: string }

const bots: Record<string, string> = {
  organiser: "You are the Organiser, a helpful work assistant. Help the user organise tasks, make decisions, and make steady progress. Be clear and practical.",
  planner: "You are the Planner, a practical project planning assistant. Break goals into actionable steps, identify dependencies, and suggest realistic priorities. Ask for missing details when needed.",
  writer: "You are the Writer, a thoughtful writing assistant. Help draft and improve emails, documents, and messages. Match the user's requested tone and do not invent facts.",
  brainstormer: "You are the Brainstormer, a creative thinking partner. Offer varied, useful ideas, explore alternatives, and help the user select a practical next step.",
}

export async function POST(req: Request) {
  let payload: { bot?: unknown; messages?: unknown }
  try { payload = await req.json() as typeof payload } catch { return new Response("Invalid request", { status: 400 }) }
  const bot = typeof payload.bot === "string" ? payload.bot : "organiser"
  if (!Object.hasOwn(bots, bot) || !Array.isArray(payload.messages) || payload.messages.length === 0 || payload.messages.length > 30) {
    return new Response("Invalid conversation", { status: 400 })
  }
  const messages: Message[] = []
  for (const message of payload.messages) {
    if (!message || (message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string" || !message.content.trim() || message.content.length > 8000) {
      return new Response("Invalid conversation", { status: 400 })
    }
    messages.push({ role: message.role, content: message.content })
  }
  if (messages[messages.length - 1].role !== "user") return new Response("Invalid conversation", { status: 400 })

  const base = process.env.ANTHROPIC_BASE_URL?.replace(/\/+$/, "") ??
    (process.env.OMG_AI_URL ? `${process.env.OMG_AI_URL.replace(/\/+$/, "")}/v1` : undefined) ??
    (process.env.ANTHROPIC_API_KEY ? "https://api.anthropic.com/v1" : undefined)
  if (!base) return new Response("AI service is not configured", { status: 503 })
  try {
    const res = await fetch(`${base}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "omg-sandbox", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1024, system: bots[bot], messages }),
    })
    if (!res.ok) return new Response("AI service could not respond", { status: 502 })
    const data = await res.json() as { content?: { type: string; text?: string }[] }
    const reply = (data.content ?? []).map((c) => c.type === "text" ? c.text ?? "" : "").join("").trim()
    if (!reply) return new Response("AI service returned an empty response", { status: 502 })
    return new Response(reply, { headers: { "content-type": "text/plain; charset=utf-8" } })
  } catch {
    return new Response("AI service could not be reached", { status: 502 })
  }
}
