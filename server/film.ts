import { list } from '@vercel/blob'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

const FILM_PATH = /^hero\/(?:reklam|film2)\.(mp4|webm|mov)$/
const SLOT_1 = /^hero\/reklam\.(mp4|webm|mov)$/i
const SLOT_2 = /^hero\/(?:film2|reklam-2)\.(mp4|webm|mov)$/i
const FILM_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/x-quicktime',
  'video/mov',
  'application/mp4',
  'application/octet-stream',
]
const FILM_BYTES = 150 * 1024 * 1024
const CACHE_MS = 5_000

export type FilmSlots = { 1: string | null; 2: string | null }

let cached: { at: number; slots: FilmSlots } | null = null

export function clearFilmCache() {
  cached = null
}

function videoBlob(blob: { pathname: string; contentType?: string }) {
  if ((blob.contentType || '').startsWith('video/')) return true
  return /\.(mp4|webm|mov)$/i.test(blob.pathname)
}

function publicFilmUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (!url.hostname.endsWith('.public.blob.vercel-storage.com')) return null
    return url.toString()
  } catch {
    return null
  }
}

function newestUrl(blobs: { pathname: string; url: string; uploadedAt: Date }[]) {
  const newest = [...blobs].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0]
  return newest ? publicFilmUrl(newest.url) : null
}

export function pickFilmUrl(slots: FilmSlots, slot: 1 | 2) {
  if (slot === 2 && slots[2]) return slots[2]
  return slots[1]
}

export async function listFilmSlots(): Promise<FilmSlots> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.slots
  const empty: FilmSlots = { 1: null, 2: null }
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    cached = { at: Date.now(), slots: empty }
    return empty
  }
  try {
    const { blobs } = await list({ limit: 50 })
    const videos = blobs.filter(videoBlob)
    const first = newestUrl(videos.filter((blob) => SLOT_1.test(blob.pathname)))
    const second = newestUrl(videos.filter((blob) => SLOT_2.test(blob.pathname)))
    const other = newestUrl(videos.filter((blob) => !SLOT_1.test(blob.pathname) && !SLOT_2.test(blob.pathname)))
    const slots: FilmSlots = { 1: first || other, 2: second }
    cached = { at: Date.now(), slots }
    return slots
  } catch {
    cached = { at: Date.now(), slots: empty }
    return empty
  }
}

export function filmEventType(value: unknown) {
  if (!value || typeof value !== 'object' || !('type' in value)) return null
  const type = (value as { type?: unknown }).type
  if (type === 'blob.generate-client-token' || type === 'blob.upload-completed') return type
  return null
}

export async function receiveFilmUpload(body: HandleUploadBody, request: Request, allowed: () => Promise<boolean>) {
  return handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      if (!(await allowed())) throw new Error('unauthorized')
      if (!FILM_PATH.test(pathname)) throw new Error('film_type')
      return {
        allowedContentTypes: FILM_TYPES,
        maximumSizeInBytes: FILM_BYTES,
        addRandomSuffix: false,
        allowOverwrite: true,
      }
    },
    onUploadCompleted: async () => {
      clearFilmCache()
    },
  })
}
