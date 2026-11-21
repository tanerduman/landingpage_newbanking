import { apiFetch, readApiJson } from './api.ts'

const FILM_BYTES = 150 * 1024 * 1024

export function filmPath(file: File, slot: 1 | 2 = 1) {
  const name = file.name.toLowerCase()
  const type = file.type
  const stem = slot === 2 ? 'hero/reklam-2' : 'hero/reklam'
  if (type === 'video/mp4' || name.endsWith('.mp4')) return `${stem}.mp4`
  if (type === 'video/webm' || name.endsWith('.webm')) return `${stem}.webm`
  if (type === 'video/quicktime' || name.endsWith('.mov')) return `${stem}.mov`
  return null
}

export function filmTooBig(file: File) {
  return file.size > FILM_BYTES
}

export function publicFilmUrl(value: unknown) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (!url.hostname.endsWith('.public.blob.vercel-storage.com')) return null
    return url.toString()
  } catch {
    return null
  }
}

export type HeroFilms = {
  url: string | null
  slot: 1 | 2
  slots: { 1: string | null; 2: string | null }
}

function slotUrl(slots: unknown, key: '1' | '2') {
  if (!slots || typeof slots !== 'object') return null
  return publicFilmUrl((slots as Record<string, unknown>)[key])
}

export async function loadHeroFilms(): Promise<HeroFilms> {
  const res = await apiFetch('/api/waitlist?film=1')
  const remote = await readApiJson<{ url?: unknown; slot?: unknown; slots?: unknown }>(res)
  const slots = {
    1: slotUrl(remote?.slots, '1'),
    2: slotUrl(remote?.slots, '2'),
  }
  if (!res?.ok) return { url: null, slot: 1, slots }
  const slot = remote?.slot === 2 ? 2 : 1
  return { url: publicFilmUrl(remote?.url), slot, slots }
}

export async function loadHeroFilm() {
  const films = await loadHeroFilms()
  return films.url
}

export async function uploadHeroFilm(file: File, slot: 1 | 2 = 1) {
  const pathname = filmPath(file, slot)
  if (!pathname) throw new Error('film_type')
  if (filmTooBig(file)) throw new Error('film_big')
  const { upload } = await import('@vercel/blob/client')
  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/waitlist',
    contentType: file.type || undefined,
  })
  const url = publicFilmUrl(blob.url)
  if (!url) throw new Error('film_fail')
  return url
}
