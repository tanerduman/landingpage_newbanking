import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { isIntent, type VisitStats, type WaitlistRow } from './types.ts'

const { Pool } = pg

type StoreKind = 'postgres' | 'memory'

type Store = {
  kind: StoreKind
  recordVisit(visitorId: string, sessionId: string): Promise<VisitStats>
  getStats(): Promise<VisitStats>
  addWaitlist(input: { name: string; email: string; intent: string }): Promise<WaitlistRow>
  listWaitlist(): Promise<WaitlistRow[]>
}

type Memory = {
  visitors: Map<string, { firstSeen: string; lastSeen: string }>
  sessions: Map<string, { visitorId: string; createdAt: string }>
  waitlist: WaitlistRow[]
}

const globalStore = globalThis as typeof globalThis & { __aureStore?: Store }

function statsFromMemory(data: Memory): VisitStats {
  let lastVisit: string | null = null
  for (const session of data.sessions.values()) {
    if (!lastVisit || session.createdAt > lastVisit) lastVisit = session.createdAt
  }
  return {
    unique: data.visitors.size,
    views: data.sessions.size,
    lastVisit,
  }
}

function memoryStore(): Store {
  const data: Memory = { visitors: new Map(), sessions: new Map(), waitlist: [] }
  return {
    kind: 'memory',
    async recordVisit(visitorId, sessionId) {
      const now = new Date().toISOString()
      const existing = data.visitors.get(visitorId)
      if (existing) existing.lastSeen = now
      else data.visitors.set(visitorId, { firstSeen: now, lastSeen: now })
      if (!data.sessions.has(sessionId)) {
        data.sessions.set(sessionId, { visitorId, createdAt: now })
      }
      return statsFromMemory(data)
    },
    async getStats() {
      return statsFromMemory(data)
    },
    async addWaitlist(input) {
      const item: WaitlistRow = {
        id: randomUUID(),
        name: input.name,
        email: input.email,
        intent: input.intent,
        createdAt: new Date().toISOString(),
      }
      data.waitlist.unshift(item)
      return item
    },
    async listWaitlist() {
      return data.waitlist
    },
  }
}

function schemaSql() {
  const here = dirname(fileURLToPath(import.meta.url))
  return readFileSync(join(here, '../migrations/001_init.sql'), 'utf8')
}

function postgresStore(url: string): Store {
  const pool = new Pool({ connectionString: url, max: 4 })
  let ready: Promise<void> | null = null

  async function ensure() {
    if (!ready) {
      ready = (async () => {
        const statements = schemaSql()
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
        for (const statement of statements) {
          await pool.query(statement)
        }
      })()
    }
    await ready
  }

  async function getStats(): Promise<VisitStats> {
    await ensure()
    const unique = await pool.query<{ n: string }>('SELECT COUNT(*)::text AS n FROM visitors')
    const views = await pool.query<{ n: string }>('SELECT COUNT(*)::text AS n FROM sessions')
    const last = await pool.query<{ created_at: Date | null }>(
      'SELECT MAX(created_at) AS created_at FROM sessions',
    )
    const lastAt = last.rows[0]?.created_at
    return {
      unique: Number(unique.rows[0]?.n ?? 0),
      views: Number(views.rows[0]?.n ?? 0),
      lastVisit: lastAt ? new Date(lastAt).toISOString() : null,
    }
  }

  return {
    kind: 'postgres',
    async recordVisit(visitorId, sessionId) {
      await ensure()
      await pool.query(
        `INSERT INTO visitors (id) VALUES ($1)
         ON CONFLICT (id) DO UPDATE SET last_seen = NOW()`,
        [visitorId],
      )
      await pool.query(
        `INSERT INTO sessions (id, visitor_id) VALUES ($1, $2)
         ON CONFLICT (id) DO NOTHING`,
        [sessionId, visitorId],
      )
      return getStats()
    },
    getStats,
    async addWaitlist(input) {
      await ensure()
      const id = randomUUID()
      const result = await pool.query<{
        id: string
        name: string
        email: string
        intent: string
        created_at: Date
      }>(
        `INSERT INTO waitlist (id, name, email, intent)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, intent, created_at`,
        [id, input.name, input.email, input.intent],
      )
      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        intent: row.intent,
        createdAt: new Date(row.created_at).toISOString(),
      }
    },
    async listWaitlist() {
      await ensure()
      const result = await pool.query<{
        id: string
        name: string
        email: string
        intent: string
        created_at: Date
      }>('SELECT id, name, email, intent, created_at FROM waitlist ORDER BY created_at DESC LIMIT 2000')
      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        intent: row.intent,
        createdAt: new Date(row.created_at).toISOString(),
      }))
    },
  }
}

export function getStore(): Store {
  if (!globalStore.__aureStore) {
    const url = process.env.DATABASE_URL
    globalStore.__aureStore = url ? postgresStore(url) : memoryStore()
  }
  return globalStore.__aureStore
}

export function validateWaitlistInput(body: unknown) {
  if (!body || typeof body !== 'object') return 'Geçersiz istek.'
  const data = body as { name?: unknown; email?: unknown; intent?: unknown }
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''
  const intent = typeof data.intent === 'string' ? data.intent : ''
  if (name.length < 2 || name.length > 80) return 'Lütfen adını yaz.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return 'Geçerli bir e-posta gir.'
  if (!isIntent(intent)) return 'Geçersiz paket.'
  return { name, email, intent }
}

