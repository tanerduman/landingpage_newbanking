import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import pg from 'pg'
import { normalizeEmail } from './email.ts'
import {
  isBillingCycle,
  isIntent,
  isSupportKind,
  type BillingCycle,
  type SupportKind,
  type SupportRow,
  type VisitStats,
  type WaitlistRow,
} from './types.ts'

const { Pool } = pg

type StoreKind = 'postgres' | 'memory'

export type WaitlistRequest = {
  status: 'pending' | 'updated'
  email: string
  code?: string
  token?: string
  statusToken?: string
}

export type AdminSessionInput = {
  user: string
  passwordHash: string
  idHash: string
  expiresAt: string
}

type Store = {
  kind: StoreKind
  recordVisit(visitorId: string, sessionId: string): Promise<VisitStats>
  getStats(): Promise<VisitStats>
  requestWaitlist(input: {
    name: string
    email: string
    emailNorm: string
    intent: string
    cycle: BillingCycle
  }): Promise<WaitlistRequest>
  confirmWaitlist(input: { token?: string; email?: string; code?: string }): Promise<WaitlistRow | string>
  listWaitlist(): Promise<WaitlistRow[]>
  deleteWaitlist(id: string): Promise<boolean>
  isConfirmed(emailNorm: string): Promise<boolean>
  createSupport(input: {
    name: string
    email: string
    emailNorm: string
    kind: SupportKind
    message: string
  }): Promise<SupportRow>
  listSupport(): Promise<SupportRow[]>
  createAdminSession(input: AdminSessionInput): Promise<void>
  readAdminSession(idHash: string, passwordHash: string): Promise<{ user: string } | null>
  deleteAdminSession(idHash: string): Promise<void>
  hitRateLimit(key: string, limit: number, windowMs: number): Promise<boolean>
  confirmStatus(statusToken: string): Promise<boolean>
}

type WaitlistRecord = WaitlistRow & {
  emailNorm: string
  confirmed: boolean
  confirmTokenHash: string | null
  confirmCodeHash: string | null
  confirmExpires: string | null
  statusTokenHash: string | null
  statusExpires: string | null
}

type AdminSessionRecord = {
  user: string
  passwordHash: string
  expiresAt: number
}

type RateBucket = {
  count: number
  start: number
  windowMs: number
}

type Memory = {
  visitors: Map<string, { firstSeen: string; lastSeen: string }>
  sessions: Map<string, { visitorId: string; createdAt: string }>
  waitlist: WaitlistRecord[]
  support: SupportRow[]
  adminSessions: Map<string, AdminSessionRecord>
  rates: Map<string, RateBucket>
}

const CONFIRM_TTL_MS = 30 * 60_000

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function issueChallenge() {
  const token = randomBytes(24).toString('hex')
  const code = String(randomInt(100000, 1000000))
  const statusToken = randomBytes(24).toString('hex')
  const expires = new Date(Date.now() + CONFIRM_TTL_MS).toISOString()
  return {
    token,
    code,
    statusToken,
    tokenHash: sha256(token),
    codeHash: sha256(code),
    statusHash: sha256(statusToken),
    expires,
  }
}

function hashesMatch(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function publicRow(row: WaitlistRecord): WaitlistRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    intent: row.intent,
    cycle: row.cycle,
    createdAt: row.createdAt,
  }
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
  const data: Memory = {
    visitors: new Map(),
    sessions: new Map(),
    waitlist: [],
    support: [],
    adminSessions: new Map(),
    rates: new Map(),
  }
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
        existing.cycle = input.cycle
        return { status: 'updated', email: existing.email }
      }
      const challenge = issueChallenge()
      if (existing) {
        existing.name = input.name
        existing.email = input.email
        existing.intent = input.intent
        existing.cycle = input.cycle
        existing.confirmTokenHash = challenge.tokenHash
        existing.confirmCodeHash = challenge.codeHash
        existing.confirmExpires = challenge.expires
        existing.statusTokenHash = challenge.statusHash
        existing.statusExpires = challenge.expires
        return {
          status: 'pending',
          email: existing.email,
          code: challenge.code,
          token: challenge.token,
          statusToken: challenge.statusToken,
        }
      }
      const item: WaitlistRecord = {
        id: randomUUID(),
        name: input.name,
        email: input.email,
        emailNorm: input.emailNorm,
        intent: input.intent,
        cycle: input.cycle,
        createdAt: new Date().toISOString(),
        confirmed: false,
        confirmTokenHash: challenge.tokenHash,
        confirmCodeHash: challenge.codeHash,
        confirmExpires: challenge.expires,
        statusTokenHash: challenge.statusHash,
        statusExpires: challenge.expires,
      }
      data.waitlist.unshift(item)
      return {
        status: 'pending',
        email: item.email,
        code: challenge.code,
        token: challenge.token,
        statusToken: challenge.statusToken,
      }
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
      if (!row) return 'confirm_invalid'
      row.confirmed = true
      row.confirmTokenHash = null
      row.confirmCodeHash = null
      row.confirmExpires = null
      return publicRow(row)
    },
    async listWaitlist() {
      return data.waitlist.filter((row) => row.confirmed).map(publicRow)
    },
    async deleteWaitlist(id) {
      const index = data.waitlist.findIndex((row) => row.id === id)
      if (index === -1) return false
      data.waitlist.splice(index, 1)
      return true
    },
    async isConfirmed(emailNorm) {
      return data.waitlist.some((row) => row.emailNorm === emailNorm && row.confirmed)
    },
    async createSupport(input) {
      const row: SupportRow = {
        id: randomUUID(),
        name: input.name,
        email: input.email,
        kind: input.kind,
        message: input.message,
        createdAt: new Date().toISOString(),
      }
      data.support.unshift(row)
      return row
    },
    async listSupport() {
      return data.support.slice(0, 2000)
    },
    async createAdminSession(input) {
      data.adminSessions.set(input.idHash, {
        user: input.user,
        passwordHash: input.passwordHash,
        expiresAt: Date.parse(input.expiresAt),
      })
    },
    async readAdminSession(idHash, passwordHash) {
      const row = data.adminSessions.get(idHash)
      if (!row) return null
      if (row.expiresAt < Date.now() || !hashesMatch(row.passwordHash, passwordHash)) {
        data.adminSessions.delete(idHash)
        return null
      }
      return { user: row.user }
    },
    async deleteAdminSession(idHash) {
      data.adminSessions.delete(idHash)
    },
    async hitRateLimit(key, limit, windowMs) {
      const now = Date.now()
      if (data.rates.size > 4000) {
        for (const [bucketKey, bucket] of data.rates) {
          if (now - bucket.start >= bucket.windowMs) data.rates.delete(bucketKey)
        }
      }
      const bucket = data.rates.get(key)
      if (!bucket || now - bucket.start >= bucket.windowMs) {
        data.rates.set(key, { count: 1, start: now, windowMs })
        return false
      }
      bucket.count += 1
      return bucket.count > limit
    },
    async confirmStatus(statusToken) {
      const hash = sha256(statusToken)
      const now = Date.now()
      const row = data.waitlist.find(
        (item) => item.statusTokenHash === hash && item.statusExpires && Date.parse(item.statusExpires) > now,
      )
      return Boolean(row?.confirmed)
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
  cycle TEXT NOT NULL DEFAULT 'monthly',
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  confirm_token_hash TEXT,
  confirm_code_hash TEXT,
  confirm_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON waitlist (created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON sessions (created_at DESC);
CREATE TABLE IF NOT EXISTS support_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_norm TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'support',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS support_requests_created_at_idx ON support_requests (created_at DESC);
CREATE TABLE IF NOT EXISTS admin_sessions (
  id_hash TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions (expires_at);
CREATE TABLE IF NOT EXISTS rate_buckets (
  bucket_key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL
);
`

const WAITLIST_MIGRATE = `
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS email_norm TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS confirmed BOOLEAN;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS confirm_token_hash TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS confirm_code_hash TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS confirm_expires TIMESTAMPTZ;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS cycle TEXT;
UPDATE waitlist SET email_norm = LOWER(email) WHERE email_norm IS NULL OR email_norm = '';
UPDATE waitlist SET cycle = 'none' WHERE intent = 'account' AND (cycle IS NULL OR cycle = '');
UPDATE waitlist SET cycle = 'monthly' WHERE cycle IS NULL OR cycle = '';
ALTER TABLE waitlist ALTER COLUMN cycle SET DEFAULT 'monthly';
ALTER TABLE waitlist ALTER COLUMN cycle SET NOT NULL;
UPDATE waitlist SET confirmed = TRUE WHERE confirmed IS NULL;
ALTER TABLE waitlist ALTER COLUMN confirmed SET DEFAULT FALSE;
ALTER TABLE waitlist ALTER COLUMN confirmed SET NOT NULL;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS kind TEXT;
UPDATE support_requests SET kind = 'support' WHERE kind IS NULL OR kind = '';
ALTER TABLE support_requests ALTER COLUMN kind SET DEFAULT 'support';
ALTER TABLE support_requests ALTER COLUMN kind SET NOT NULL;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS status_token_hash TEXT;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS status_expires TIMESTAMPTZ;
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
           SET name = $2, email = $3, intent = $4, cycle = $5, updated_at = NOW()
           WHERE id = $1`,
          [existing.id, input.name, input.email, input.intent, input.cycle],
        )
        return { status: 'updated', email: input.email }
      }
      const challenge = issueChallenge()
      if (existing) {
        await pool.query(
          `UPDATE waitlist
           SET name = $2, email = $3, intent = $4, cycle = $5, confirm_token_hash = $6, confirm_code_hash = $7,
               confirm_expires = $8, status_token_hash = $9, status_expires = $10, updated_at = NOW()
           WHERE id = $1`,
          [
            existing.id,
            input.name,
            input.email,
            input.intent,
            input.cycle,
            challenge.tokenHash,
            challenge.codeHash,
            challenge.expires,
            challenge.statusHash,
            challenge.expires,
          ],
        )
        return {
          status: 'pending',
          email: input.email,
          code: challenge.code,
          token: challenge.token,
          statusToken: challenge.statusToken,
        }
      }
      await pool.query(
        `INSERT INTO waitlist
           (id, name, email, email_norm, intent, cycle, confirmed, confirm_token_hash, confirm_code_hash, confirm_expires, status_token_hash, status_expires)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $8, $9, $10, $11)`,
        [
          randomUUID(),
          input.name,
          input.email,
          input.emailNorm,
          input.intent,
          input.cycle,
          challenge.tokenHash,
          challenge.codeHash,
          challenge.expires,
          challenge.statusHash,
          challenge.expires,
        ],
      )
      return {
        status: 'pending',
        email: input.email,
        code: challenge.code,
        token: challenge.token,
        statusToken: challenge.statusToken,
      }
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
        cycle: string
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
         RETURNING id, name, email, intent, COALESCE(cycle, 'monthly') AS cycle, created_at`,
        [tokenHash, codeHash, emailNorm],
      )
      const row = result.rows[0]
      if (!row) return 'confirm_invalid'
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        intent: row.intent,
        cycle: isBillingCycle(row.cycle) ? row.cycle : 'monthly',
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
        cycle: string
        created_at: Date
      }>(
        `SELECT id, name, email, intent, COALESCE(cycle, 'monthly') AS cycle, created_at
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
        cycle: isBillingCycle(row.cycle) ? row.cycle : 'monthly',
        createdAt: new Date(row.created_at).toISOString(),
      }))
    },
    async deleteWaitlist(id) {
      await ensure()
      const result = await pool.query('DELETE FROM waitlist WHERE id = $1', [id])
      return (result.rowCount ?? 0) > 0
    },
    async isConfirmed(emailNorm) {
      await ensure()
      const result = await pool.query<{ n: string }>(
        'SELECT COUNT(*)::text AS n FROM waitlist WHERE email_norm = $1 AND confirmed = TRUE',
        [emailNorm],
      )
      return Number(result.rows[0]?.n ?? 0) > 0
    },
    async createSupport(input) {
      await ensure()
      const id = randomUUID()
      const created = await pool.query<{ created_at: Date }>(
        `INSERT INTO support_requests (id, name, email, email_norm, kind, message)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING created_at`,
        [id, input.name, input.email, input.emailNorm, input.kind, input.message],
      )
      return {
        id,
        name: input.name,
        email: input.email,
        kind: input.kind,
        message: input.message,
        createdAt: new Date(created.rows[0]?.created_at ?? Date.now()).toISOString(),
      }
    },
    async listSupport() {
      await ensure()
      const result = await pool.query<{
        id: string
        name: string
        email: string
        kind: string
        message: string
        created_at: Date
      }>(
        `SELECT id, name, email, COALESCE(kind, 'support') AS kind, message, created_at
         FROM support_requests
         ORDER BY created_at DESC
         LIMIT 2000`,
      )
      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        kind: isSupportKind(row.kind) ? row.kind : 'support',
        message: row.message,
        createdAt: new Date(row.created_at).toISOString(),
      }))
    },
    async createAdminSession(input) {
      await ensure()
      await pool.query(
        `INSERT INTO admin_sessions (id_hash, user_name, password_hash, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id_hash) DO UPDATE
           SET user_name = EXCLUDED.user_name,
               password_hash = EXCLUDED.password_hash,
               expires_at = EXCLUDED.expires_at`,
        [input.idHash, input.user, input.passwordHash, input.expiresAt],
      )
    },
    async readAdminSession(idHash, passwordHash) {
      await ensure()
      const result = await pool.query<{ user_name: string; password_hash: string; expires_at: Date }>(
        `SELECT user_name, password_hash, expires_at FROM admin_sessions WHERE id_hash = $1`,
        [idHash],
      )
      const row = result.rows[0]
      if (!row) return null
      const expired = new Date(row.expires_at).getTime() < Date.now()
      const stalePassword = !hashesMatch(row.password_hash, passwordHash)
      if (expired || stalePassword) {
        await pool.query('DELETE FROM admin_sessions WHERE id_hash = $1', [idHash])
        return null
      }
      return { user: row.user_name }
    },
    async deleteAdminSession(idHash) {
      await ensure()
      await pool.query('DELETE FROM admin_sessions WHERE id_hash = $1', [idHash])
    },
    async hitRateLimit(key, limit, windowSec) {
      await ensure()
      const windowMs = Math.max(1, Math.ceil(windowSec / 1000))
      const result = await pool.query<{ hit_count: number }>(
        `INSERT INTO rate_buckets (bucket_key, window_start, hit_count)
         VALUES ($1, NOW(), 1)
         ON CONFLICT (bucket_key) DO UPDATE SET
           hit_count = CASE
             WHEN rate_buckets.window_start <= NOW() - ($2::int * INTERVAL '1 second') THEN 1
             ELSE rate_buckets.hit_count + 1
           END,
           window_start = CASE
             WHEN rate_buckets.window_start <= NOW() - ($2::int * INTERVAL '1 second') THEN NOW()
             ELSE rate_buckets.window_start
           END
         RETURNING hit_count`,
        [key, windowMs],
      )
      return Number(result.rows[0]?.hit_count ?? 1) > limit
    },
    async confirmStatus(statusToken) {
      await ensure()
      const result = await pool.query<{ confirmed: boolean }>(
        `SELECT confirmed FROM waitlist
         WHERE status_token_hash = $1 AND status_expires > NOW()
         LIMIT 1`,
        [sha256(statusToken)],
      )
      return Boolean(result.rows[0]?.confirmed)
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
  if (!body || typeof body !== 'object') return 'invalid'
  const data = body as { name?: unknown; email?: unknown; intent?: unknown; cycle?: unknown }
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''
  const intent = typeof data.intent === 'string' ? data.intent : ''
  const rawCycle = typeof data.cycle === 'string' ? data.cycle : ''
  if (name.length < 2 || name.length > 80) return 'name'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return 'email'
  if (!isIntent(intent)) return 'intent'
  let cycle: BillingCycle = 'monthly'
  if (intent === 'account') cycle = 'none'
  else if (isBillingCycle(rawCycle) && rawCycle !== 'none') cycle = rawCycle
  else if (rawCycle && rawCycle !== 'monthly' && rawCycle !== 'yearly') return 'cycle'
  return { name, email, emailNorm: normalizeEmail(email), intent, cycle }
}

export function validateSupportInput(body: unknown) {
  if (!body || typeof body !== 'object') return 'invalid'
  const data = body as { name?: unknown; email?: unknown; kind?: unknown; message?: unknown }
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''
  const kind = typeof data.kind === 'string' ? data.kind : ''
  const message = typeof data.message === 'string' ? data.message.trim() : ''
  if (name.length < 2 || name.length > 80) return 'name'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return 'email'
  if (!isSupportKind(kind)) return 'kind'
  if (message.length < 8 || message.length > 2000) return 'message'
  return { name, email, emailNorm: normalizeEmail(email), kind, message }
}

