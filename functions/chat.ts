// POST /api/chat — sends the conversation to Claude through the platform's AI
// endpoint and returns the reply as plain text. Uses fetch directly because
// importing @omg-dev/ai breaks the preview build.

type Msg = { role: "user" | "assistant"; content: string }

const SYSTEM = `You are secretary.ai, a concise assistant that helps the user organise their work.
You can also create automated tasks ("auto-tasks") for the user. When the user asks for an
automation, reply with one short sentence and then exactly one block like this:
<autotask>{"name":"...","trigger":"file_uploaded|task_created|task_done|schedule","condition":{...},"action":"convert_file|set_reminder|set_priority|create_task|notify","params":{...}}</autotask>
Conditions: file_uploaded -> {"ext":"docx|doc|pdf|png|jpg|txt|md|csv|any"}; task_created/task_done ->
{"project":"optional","priority":"optional low|medium|high"}; schedule -> {"every":"day|week|month","weekday":0-6 (week only),"day":1-28 (month only)}.
Params: convert_file -> {"to":"pdf|txt|html|png|jpg|webp|json|csv"}; set_reminder -> {"days":0-30};
set_priority -> {"priority":"low|medium|high"}; create_task -> {"title":"...","priority":"low|medium|high","due_in_days":number};
notify -> {"message":"..."}. Only output the block when the user asks for an automation.`

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Msg[] }
  const base =
    process.env.ANTHROPIC_BASE_URL?.replace(/\/+$/, "") ??
    (process.env.OMG_AI_URL ? `${process.env.OMG_AI_URL.replace(/\/+$/, "")}/v1` : undefined)
  if (!base) return new Response("AI is not configured for this app", { status: 503 })

  const res = await fetch(`${base}/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "omg-sandbox",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM,
      messages: messages.slice(-20),
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return new Response(`AI request failed (${res.status}) ${text.slice(0, 200)}`, { status: 502 })
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  const reply = (data.content ?? []).map((c) => (c.type === "text" ? c.text ?? "" : "")).join("")
  return new Response(reply, { headers: { "content-type": "text/plain; charset=utf-8" } })
}
