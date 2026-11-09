import { apiFetch, readApiJson } from './api.ts'
import { messages, readLocale } from './i18n/index.ts'

export const SUPPORT_KINDS = ['complaint', 'suggestion', 'support'] as const
export type SupportKind = (typeof SUPPORT_KINDS)[number]

export type SupportEntry = {
  id: string
  name: string
  email: string
  kind: SupportKind
  message: string
  createdAt: string
}

function failMessage(
  remoteError: string | undefined,
  fallback: 'save_fail' | 'support_delete_fail' | 'offline' = 'save_fail',
) {
  const t = messages(readLocale())
  return remoteError || t.errors[fallback]
}

export async function submitSupport(input: { name: string; email: string; kind: SupportKind; message: string }) {
  const res = await apiFetch('/api/support', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      kind: input.kind,
      message: input.message.trim(),
      lang: readLocale(),
    }),
  })
  const remote = await readApiJson<{
    pending?: boolean
    delivered?: boolean
    devCode?: string
    statusToken?: string
    error?: string
  }>(res)
  if (res?.ok && remote?.pending) {
    return {
      delivered: Boolean(remote.delivered),
      devCode: remote.devCode,
      statusToken: remote.statusToken || '',
    }
  }
  throw new Error(failMessage(remote?.error))
}

export async function deleteSupportEntry(id: string) {
  const res = await apiFetch('/api/support', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
  const remote = await readApiJson<{ ok?: boolean; error?: string }>(res)
  if (res?.ok && remote?.ok) {
    window.dispatchEvent(new Event('aure-waitlist'))
    return
  }
  throw new Error(failMessage(remote?.error, res ? 'support_delete_fail' : 'offline'))
}

export async function fetchSupport(): Promise<{ entries: SupportEntry[]; authorized: boolean }> {
  const res = await apiFetch('/api/support')
  if (res?.status === 401) return { entries: [], authorized: false }
  const remote = await readApiJson<{ entries?: SupportEntry[] }>(res)
  if (res?.ok && remote?.entries) return { entries: remote.entries, authorized: true }
  return { entries: [], authorized: true }
}
