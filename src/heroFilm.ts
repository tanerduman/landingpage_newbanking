import { apiFetch, readApiJson } from './api.ts'

const FILM_BYTES = 150 * 1024 * 1024

export function filmPath(file: File) {
  const name = file.name.toLowerCase()
  const type = file.type
  if (type === 'video/mp4' || name.endsWith('.mp4')) return 'hero/reklam.mp4'
  if (type === 'video/webm' || name.endsWith('.webm')) return 'hero/reklam.webm'
  if (type === 'video/quicktime' || name.endsWith('.mov')) return 'hero/reklam.mov'
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

export async function loadHeroFilm() {
  const res = await apiFetch('/api/waitlist?film=1')
  const remote = await readApiJson<{ url?: unknown }>(res)
  if (!res?.ok) return null
  return publicFilmUrl(remote?.url)
}

export async function uploadHeroFilm(file: File) {
  const pathname = filmPath(file)
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
