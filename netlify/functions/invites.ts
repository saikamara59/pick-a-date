// Short invite links.
// POST /api/invites { code } → { id }   stores the (validated) long invite code under a short id
// GET  /api/invites/:id      → { code }  looks it up again
// Ids come from a hash of the invite, so copying the same invite twice gives the same link.
import { createHash } from 'node:crypto'
import { getStore } from '@netlify/blobs'
import { decodeInvite } from '../../src/lib/codec'
import { allow, clientIp, handle, json, readJson } from '../lib/server'

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
export const ID_RE = /^[0-9A-Za-z]{9}$/
const MAX_CODE = 8000

/** 9 base62 characters from a SHA-256 of the code (~5e16 combinations). */
function idFor(code: string): string {
  const bytes = createHash('sha256').update(code).digest()
  let n = 0n
  for (const b of bytes.subarray(0, 12)) n = (n << 8n) | BigInt(b)
  let id = ''
  for (let i = 0; i < 9; i++) {
    id += ALPHABET[Number(n % 62n)]
    n /= 62n
  }
  return id
}

export default handle(async (req: Request, context: { ip?: string }) => {
  const store = getStore('invites')

  if (req.method === 'GET') {
    const id = new URL(req.url).pathname.split('/').pop() ?? ''
    if (!ID_RE.test(id)) return json({ error: 'Not found' }, 404)
    const rec = (await store.get(id, { type: 'json' })) as { code: string } | null
    if (!rec) return json({ error: 'Not found' }, 404)
    return new Response(JSON.stringify({ code: rec.code }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300, s-maxage=31536000, immutable' },
    })
  }

  const body = await readJson(req)
  if (!body) return json({ error: 'Bad request' }, 400)
  const code = typeof body.code === 'string' ? body.code : ''
  if (!code || code.length > MAX_CODE || !decodeInvite(code)) return json({ error: 'That invite isn’t valid.' }, 400)

  const id = idFor(code)
  if (!(await store.get(id))) {
    // Only new invites count toward the limit.
    if (!(await allow(`inv-ip:${clientIp(req, context)}`, 40, 3600))) return json({ error: 'Too many new links. Try again in an hour.' }, 429)
    await store.setJSON(id, { code, at: Date.now() })
  }
  return json({ id })
})

export const config = { path: ['/api/invites', '/api/invites/:id'] }
