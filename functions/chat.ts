// The chat endpoint moved to /api/ai; avoid keeping a second model gateway.
export async function POST() {
  return new Response("Use /api/ai", { status: 410 })
}
