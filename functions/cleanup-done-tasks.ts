import { ctx, db } from "@omg-dev/server"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import { doneTaskCleanupQuery } from "../src/lib/done-task-cleanup-query"

export async function POST() {
  if (!ctx.userId) return new Response("Sign in required", { status: 401 })
  try {
    const client = drizzle(db.drizzleQuery)
    const rows = await client.all<{ id: string }>(doneTaskCleanupQuery(ctx.userId))
    return Response.json({ deleted: rows.length })
  } catch {
    console.error("Done task cleanup failed")
    return new Response("Cleanup unavailable", { status: 503 })
  }
}
