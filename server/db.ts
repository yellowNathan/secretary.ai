import { better } from "better-drizzle"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import { db } from "@omg-dev/server"
import { drizzleSchema } from "../src/db.drizzle"

type BetterClient = ReturnType<typeof createBetterClient>
type ReadMethod =
  | "count"
  | "exists"
  | "findFirst"
  | "findMany"
  | "findOne"
  | "findUnique"
  | "paginate"
type ReadOnlyDelegate<T> = Pick<T, Extract<keyof T, ReadMethod>>
type ReadOnlyBetterClient<T> = {
  readonly [K in keyof T as K extends string
    ? K extends `$${string}` | "repository" | "transaction"
      ? never
      : T[K] extends object
        ? K
        : never
    : never]: ReadOnlyDelegate<T[K]>
}

const READ_METHODS = new Set<string>([
  "count",
  "exists",
  "findFirst",
  "findMany",
  "findOne",
  "findUnique",
  "paginate",
])

let drizzleClient: ReturnType<typeof createDrizzleClient> | null = null
let betterClient: ReturnType<typeof createBetterClient> | null = null
let betterReadClient: ReadOnlyBetterClient<BetterClient> | null = null

// sqlite-proxy runs every query through @omg-dev/server's async driver, so
// the same code works when the published app's database lives on its home box
// (no synchronous connection there) and when it is a local file.
function createDrizzleClient() {
  return drizzle(db.drizzleQuery, { schema: drizzleSchema })
}

function createBetterClient() {
  return better(getDrizzleDb(), { schema: drizzleSchema })
}

function getDrizzleDb() {
  drizzleClient ??= createDrizzleClient()
  return drizzleClient
}

function getBetterDb() {
  betterClient ??= createBetterClient()
  return betterClient
}

function readOnlyDelegate(delegate: Record<string, unknown>, tableName: string) {
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined
      if (!READ_METHODS.has(prop)) {
        throw new Error(
          `[vibes] Better Drizzle helper is read-only. Use @omg-dev/server db or auto-CRUD for ${tableName}.${prop} mutations so auth scoping, timestamps, and live updates stay consistent.`,
        )
      }

      const value = delegate[prop]
      return typeof value === "function" ? value.bind(delegate) : value
    },
  })
}

function createBetterReadClient(): ReadOnlyBetterClient<BetterClient> {
  const client = getBetterDb() as Record<string, unknown>
  const delegates = new Map<string, object>()

  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined
      if (prop.startsWith("$") || prop === "repository" || prop === "transaction") {
        throw new Error(`[vibes] Better Drizzle helper only exposes table read delegates.`)
      }

      const value = client[prop]
      if (!value || typeof value !== "object") return undefined

      let delegate = delegates.get(prop)
      if (!delegate) {
        delegate = readOnlyDelegate(value as Record<string, unknown>, prop)
        delegates.set(prop, delegate)
      }
      return delegate
    },
  }) as ReadOnlyBetterClient<BetterClient>
}

export function getBetterReadDb() {
  betterReadClient ??= createBetterReadClient()
  return betterReadClient
}

export { drizzleSchema }
