import { handleApiRequest } from '../server/http.ts'

export async function POST(request: Request) {
  return (await handleApiRequest(request)) ?? new Response('Not found', { status: 404 })
}
