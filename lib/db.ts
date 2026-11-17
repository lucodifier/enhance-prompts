import { Pool, QueryResultRow } from "pg"

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("The POSTGRES_URL environment variable is required.")
}

declare global {
  var __promptManagerPgPool: Pool | undefined
}

const pool = globalThis.__promptManagerPgPool ?? new Pool({ connectionString })

if (!globalThis.__promptManagerPgPool) {
  globalThis.__promptManagerPgPool = pool
}

export async function query<T extends QueryResultRow = any>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params)
}
