import { apiFetch, readApiJson } from './api.ts'

const FILM_BYTES = 150 * 1024 * 1024

export function filmContentType(file: File) {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  if (type === 'video/mp4' || type === 'video/x-m4v' || type === 'application/mp4' || name.endsWith('.mp4') || name.endsWith('.m4v')) {
    return 'video/mp4'
  }
  if (type === 'video/webm' || name.endsWith('.webm')) return 'video/webm'
  if (type === 'video/quicktime' || type === 'video/x-quicktime' || type === 'video/mov' || name.endsWith('.mov')) {
    return 'video/quicktime'
  }
  return null
}

export function filmPath(file: File, slot: 1 | 2 = 1) {
  const contentType = filmContentType(file)
  if (!contentType) return null
  const stem = slot === 2 ? 'hero/film2' : 'hero/reklam'
  if (contentType === 'video/mp4') return `${stem}.mp4`
  if (contentType === 'video/webm') return `${stem}.webm`
  return `${stem}.mov`
}

export function filmErrorCode(err: unknown) {
  const message = err instanceof Error ? err.message : ''
  if (message === 'film_type' || message.includes('Content type')) return 'film_type'
  if (message === 'film_big' || message.toLowerCase().includes('too large') || message.includes('greater than')) return 'film_big'
  return 'film_fail'
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
  const contentType = filmContentType(file)
  const pathname = contentType ? filmPath(file, slot) : null
  if (!contentType || !pathname) throw new Error('film_type')
  if (filmTooBig(file)) throw new Error('film_big')
  const { uploadPresigned } = await import('@vercel/blob/client')
  const blob = await uploadPresigned(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/waitlist',
    contentType,
  })
  const url = publicFilmUrl(blob.url)
  if (!url) throw new Error('film_fail')
  return url
}
