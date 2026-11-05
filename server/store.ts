import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto'
import pg from 'pg'
import { normalizeEmail } from './email.ts'
import { isIntent, type VisitStats, type WaitlistRow } from './types.ts'

const { Pool } = pg

type StoreKind = 'postgres' | 'memory'

export type WaitlistRequest = {
  status: 'pending' | 'updated'
  email: string
  code?: string
  token?: string
}

type Store = {
  kind: StoreKind
  recordVisit(visitorId: string, sessionId: string): Promise<VisitStats>
  getStats(): Promise<VisitStats>
  requestWaitlist(input: { name: string; email: string; emailNorm: string; intent: string }): Promise<WaitlistRequest>
  confirmWaitlist(input: { token?: string; email?: string; code?: string }): Promise<WaitlistRow | string>
  listWaitlist(): Promise<WaitlistRow[]>
}

type WaitlistRecord = WaitlistRow & {
  emailNorm: string
  confirmed: boolean
  confirmTokenHash: string | null
  confirmCodeHash: string | null
  confirmExpires: string | null
}

type Memory = {
  visitors: Map<string, { firstSeen: string; lastSeen: string }>
  sessions: Map<string, { visitorId: string; createdAt: string }>
  waitlist: WaitlistRecord[]
}

const CONFIRM_TTL_MS = 30 * 60_000

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function issueChallenge() {
  const token = randomBytes(24).toString('hex')
  const code = String(randomInt(100000, 1000000))
  return {
    token,
    code,
    tokenHash: sha256(token),
    codeHash: sha256(code),
    expires: new Date(Date.now() + CONFIRM_TTL_MS).toISOString(),
  }
}

function publicRow(row: WaitlistRecord): WaitlistRow {
  return { id: row.id, name: row.name, email: row.email, intent: row.intent, createdAt: row.createdAt }
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
    async requestWaitlist(input) {
      const existing = data.waitlist.find((row) => row.emailNorm === input.emailNorm)
      if (existing?.confirmed) {
        existing.name = input.name
        existing.email = input.email
        existing.intent = input.intent
        return { status: 'updated', email: existing.email }
      }
      const challenge = issueChallenge()
      if (existing) {
        existing.name = input.name
        existing.email = input.email
        existing.intent = input.intent
        existing.confirmTokenHash = challenge.tokenHash
        existing.confirmCodeHash = challenge.codeHash
        existing.confirmExpires = challenge.expires
        return { status: 'pending', email: existing.email, code: challenge.code, token: challenge.token }
      }
      const item: WaitlistRecord = {
        id: randomUUID(),
        name: input.name,
        email: input.email,
        emailNorm: input.emailNorm,
        intent: input.intent,
        createdAt: new Date().toISOString(),
        confirmed: false,
        confirmTokenHash: challenge.tokenHash,
        confirmCodeHash: challenge.codeHash,
        confirmExpires: challenge.expires,
      }
      data.waitlist.unshift(item)
      return { status: 'pending', email: item.email, code: challenge.code, token: challenge.token }
    },
    async confirmWaitlist(input) {
      const now = Date.now()
      const tokenHash = input.token ? sha256(input.token) : null
      const emailNorm = input.email ? normalizeEmail(input.email) : ''
      const codeHash = input.code ? sha256(input.code.trim()) : null
      const row = data.waitlist.find((item) => {
        if (item.confirmed) return false
        if (!item.confirmExpires || Date.parse(item.confirmExpires) < now) return false
        if (tokenHash && item.confirmTokenHash === tokenHash) return true
        if (codeHash && emailNorm && item.emailNorm === emailNorm && item.confirmCodeHash === codeHash) return true
        return false
      })
      if (!row) return 'Onay kodu veya bağlantı geçersiz.'
      row.confirmed = true
      row.confirmTokenHash = null
      row.confirmCodeHash = null
      row.confirmExpires = null
      return publicRow(row)
    },
    async listWaitlist() {
      return data.waitlist.filter((row) => row.confirmed).map(publicRow)
    },
  }
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES visitors (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_norm TEXT,
  intent TEXT NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  confirm_token_hash TEXT,
  confirm_code_hash TEXT,
  confirm_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON waitlist (created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON sessions (created_at DESC);
`

const WAITLIST_MIGRATE = `
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS email_norm TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS confirmed BOOLEAN;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS confirm_token_hash TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS confirm_code_hash TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS confirm_expires TIMESTAMPTZ;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE waitlist SET email_norm = LOWER(email) WHERE email_norm IS NULL OR email_norm = '';
UPDATE waitlist SET confirmed = TRUE WHERE confirmed IS NULL;
ALTER TABLE waitlist ALTER COLUMN confirmed SET DEFAULT FALSE;
ALTER TABLE waitlist ALTER COLUMN confirmed SET NOT NULL;
`

function databaseUrl() {
  return (
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_BLOCKING ||
    process.env.DATABASE_URL ||
    ''
  )
}

function postgresStore(url: string): Store {
  const pool = new Pool({
    connectionString: url,
    max: 1,
  })
  let ready: Promise<void> | null = null

  async function ensure() {
    if (!ready) {
      ready = (async () => {
        const statements = SCHEMA_SQL.split(';')
          .map((part) => part.trim())
          .filter(Boolean)
        for (const statement of statements) {
          await pool.query(statement)
        }
        const migrate = WAITLIST_MIGRATE.split(';')
          .map((part) => part.trim())
          .filter(Boolean)
        for (const statement of migrate) {
          await pool.query(statement)
        }
        try {
          await pool.query(
            'CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_norm_uidx ON waitlist (email_norm)',
          )
        } catch {
          /* duplicate historical emails: upsert still matches by email_norm */
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
    async requestWaitlist(input) {
      await ensure()
      const found = await pool.query<{
        id: string
        email: string
        confirmed: boolean
      }>('SELECT id, email, confirmed FROM waitlist WHERE email_norm = $1 LIMIT 1', [input.emailNorm])
      const existing = found.rows[0]
      if (existing?.confirmed) {
        await pool.query(
          `UPDATE waitlist
           SET name = $2, email = $3, intent = $4, updated_at = NOW()
           WHERE id = $1`,
          [existing.id, input.name, input.email, input.intent],
        )
        return { status: 'updated', email: input.email }
      }
      const challenge = issueChallenge()
      if (existing) {
        await pool.query(
          `UPDATE waitlist
           SET name = $2, email = $3, intent = $4, confirm_token_hash = $5, confirm_code_hash = $6,
               confirm_expires = $7, updated_at = NOW()
           WHERE id = $1`,
          [
            existing.id,
            input.name,
            input.email,
            input.intent,
            challenge.tokenHash,
            challenge.codeHash,
            challenge.expires,
          ],
        )
        return { status: 'pending', email: input.email, code: challenge.code, token: challenge.token }
      }
      await pool.query(
        `INSERT INTO waitlist
           (id, name, email, email_norm, intent, confirmed, confirm_token_hash, confirm_code_hash, confirm_expires)
         VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7, $8)`,
        [
          randomUUID(),
          input.name,
          input.email,
          input.emailNorm,
          input.intent,
          challenge.tokenHash,
          challenge.codeHash,
          challenge.expires,
        ],
      )
      return { status: 'pending', email: input.email, code: challenge.code, token: challenge.token }
    },
    async confirmWaitlist(input) {
      await ensure()
      const tokenHash = input.token ? sha256(input.token) : null
      const emailNorm = input.email ? normalizeEmail(input.email) : ''
      const codeHash = input.code ? sha256(input.code.trim()) : null
      const result = await pool.query<{
        id: string
        name: string
        email: string
        intent: string
        created_at: Date
      }>(
        `UPDATE waitlist SET
           confirmed = TRUE,
           confirm_token_hash = NULL,
           confirm_code_hash = NULL,
           confirm_expires = NULL,
           updated_at = NOW()
         WHERE confirmed = FALSE
           AND confirm_expires > NOW()
           AND (
             ($1::text IS NOT NULL AND confirm_token_hash = $1)
             OR ($2::text IS NOT NULL AND $3::text <> '' AND email_norm = $3 AND confirm_code_hash = $2)
           )
         RETURNING id, name, email, intent, created_at`,
        [tokenHash, codeHash, emailNorm],
      )
      const row = result.rows[0]
      if (!row) return 'Onay kodu veya bağlantı geçersiz.'
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
      }>(
        `SELECT id, name, email, intent, created_at
         FROM waitlist
         WHERE confirmed = TRUE
         ORDER BY created_at DESC
         LIMIT 2000`,
      )
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
    const url = databaseUrl()
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
  return { name, email, emailNorm: normalizeEmail(email), intent }
}

