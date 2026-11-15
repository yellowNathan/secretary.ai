import { sql } from "drizzle-orm"

// A single statement checks current policy and task/column state at deletion.
export function doneTaskCleanupQuery(owner: string) {
  return sql`
      DELETE FROM tasks
      WHERE _owner = ${owner}
        AND EXISTS (
          SELECT 1 FROM columns c, task_cleanup_settings s
          WHERE c.id = tasks.status AND c._owner = ${owner} AND c.done = 1
            AND s._owner = ${owner}
            AND (SELECT COUNT(*) FROM task_cleanup_settings WHERE _owner = ${owner}) = 1
            AND s.days >= 1 AND s.days <= 3650 AND s.days = CAST(s.days AS INTEGER)
            AND julianday(s.enabled_at) IS NOT NULL
            AND julianday(tasks.updated_at) IS NOT NULL
            AND julianday(c.updated_at) IS NOT NULL
            AND julianday('now') - MAX(julianday(s.enabled_at), julianday(tasks.updated_at), julianday(c.updated_at)) >= s.days
        )
      RETURNING id
    `
}
