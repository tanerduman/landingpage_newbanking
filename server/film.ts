import { list } from '@vercel/blob'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

const FILM_PATH = /^hero\/reklam\.(mp4|webm|mov)$/
const FILM_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const FILM_BYTES = 150 * 1024 * 1024
const CACHE_MS = 5_000

let cached: { at: number; url: string | null } | null = null

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

export async function currentFilmUrl() {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.url
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    cached = { at: Date.now(), url: null }
    return null
  }
  try {
    const { blobs } = await list({ limit: 50 })
    const videos = blobs.filter(videoBlob)
    const preferred = videos.find((blob) => blob.pathname.startsWith('hero/reklam.'))
    const newest = [...videos].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0]
    const url = (preferred && publicFilmUrl(preferred.url)) || (newest && publicFilmUrl(newest.url)) || null
    cached = { at: Date.now(), url }
    return url
  } catch {
    cached = { at: Date.now(), url: null }
    return null
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
