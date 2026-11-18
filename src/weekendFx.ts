import { apiFetch, readApiJson } from './api.ts'

export type WeekendAnswer = 'yes' | 'no'

export type WeekendFxRow = {
  id: string
  answer: WeekendAnswer
  createdAt: string
}

export type WeekendStats = {
  yes: number
  no: number
  recent: WeekendFxRow[]
}

const empty: WeekendStats = { yes: 0, no: 0, recent: [] }

export async function saveWeekendAnswer(answer: WeekendAnswer): Promise<boolean> {
  const res = await apiFetch('/api/waitlist', {
    method: 'POST',
    body: JSON.stringify({ weekendFx: true, answer }),
  })
  const remote = await readApiJson<{ ok?: boolean }>(res)
  return Boolean(res?.ok && remote?.ok)
}

export async function fetchWeekendStats(): Promise<WeekendStats | null> {
  const res = await apiFetch('/api/waitlist?weekend=1')
  const remote = await readApiJson<{ weekend?: WeekendStats }>(res)
  if (!res?.ok || !remote?.weekend) return null
  return {
    yes: remote.weekend.yes || 0,
    no: remote.weekend.no || 0,
    recent: Array.isArray(remote.weekend.recent) ? remote.weekend.recent : empty.recent,
  }
}
