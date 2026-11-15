import { describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { doneTaskCleanupQuery } from "./done-task-cleanup-query"

// Protects saved work: only expired tasks in currently-done columns under an
// unambiguous active policy may be deleted, and only for the requesting owner.
describe("done task cleanup", () => {
  test("deletes only eligible tasks and fails closed for disabled or ambiguous policies", () => {
    const db = new Database(":memory:")
    db.run("CREATE TABLE tasks (id TEXT, _owner TEXT, status TEXT, updated_at TEXT)")
    db.run("CREATE TABLE columns (id TEXT, _owner TEXT, done INTEGER, updated_at TEXT)")
    db.run("CREATE TABLE task_cleanup_settings (_owner TEXT, days REAL, enabled_at TEXT)")
    db.run("INSERT INTO columns VALUES ('done','a',1,'2020-01-01'),('open','a',0,'2020-01-01'),('foreign','b',1,'2020-01-01'),('changed','a',1,datetime('now'))")
    db.run("INSERT INTO tasks VALUES ('expired','a','done','2020-01-01'),('recent','a','done',datetime('now')),('open-task','a','open','2020-01-01'),('other-owner','b','foreign','2020-01-01'),('column-changed','a','changed','2020-01-01'),('missing-date','a','done',NULL)")
    db.run("INSERT INTO task_cleanup_settings VALUES ('a', 7, '2020-01-01')")
    const query = new SQLiteSyncDialect().sqlToQuery(doneTaskCleanupQuery("a"))
    const sweep = () => db.query(query.sql).all(...query.params as string[]) as { id: string }[]
    expect(sweep().map(x => x.id)).toEqual(["expired"])
    expect((db.query("SELECT id FROM tasks ORDER BY id").all() as {id:string}[]).map(x => x.id)).toEqual(["column-changed", "missing-date", "open-task", "other-owner", "recent"])
    db.run("INSERT INTO tasks VALUES ('new-expired','a','done','2020-01-01')")
    db.run("UPDATE task_cleanup_settings SET days=0")
    expect(sweep()).toEqual([])
    db.run("UPDATE task_cleanup_settings SET days=7, enabled_at=datetime('now')")
    expect(sweep()).toEqual([])
    db.run("UPDATE task_cleanup_settings SET enabled_at='2020-01-01'")
    db.run("INSERT INTO task_cleanup_settings VALUES ('a',7,'2020-01-01')")
    expect(sweep()).toEqual([])
    db.close()
  })
})
