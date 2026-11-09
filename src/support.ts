import { apiFetch, readApiJson } from './api.ts'
import { messages, readLocale } from './i18n/index.ts'

export type SupportEntry = {
  id: string
  name: string
  email: string
  message: string
  createdAt: string
}

function failMessage(remoteError: string | undefined) {
  const t = messages(readLocale())
  return remoteError || t.errors.save_fail
}

export async function submitSupport(input: { name: string; email: string; message: string }) {
  const res = await apiFetch('/api/support', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      message: input.message.trim(),
      lang: readLocale(),
    }),
  })
  const remote = await readApiJson<{ ok?: boolean; error?: string }>(res)
  if (res?.ok && remote?.ok) return
  throw new Error(failMessage(remote?.error))
}

export async function fetchSupport(): Promise<{ entries: SupportEntry[]; authorized: boolean }> {
  const res = await apiFetch('/api/support')
  if (res?.status === 401) return { entries: [], authorized: false }
  const remote = await readApiJson<{ entries?: SupportEntry[] }>(res)
  if (res?.ok && remote?.entries) return { entries: remote.entries, authorized: true }
  return { entries: [], authorized: true }
}
