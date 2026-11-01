// Shared helpers for the Netlify functions: responses, signing, rate limits, email.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getStore } from '@netlify/blobs'

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}

/** base64url HMAC-SHA256 with SIGNING_SECRET */
export function sign(data: string): string {
  return createHmac('sha256', env('SIGNING_SECRET')).update(data).digest('base64url')
}

export function verify(data: string, sig: string): boolean {
  const expected = Buffer.from(sign(data))
  const given = Buffer.from(sig)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/** What a verified email is signed as inside an invite link */
export const notifyPayload = (email: string) => `notify|v1|${email.toLowerCase()}`

export const clientIp = (req: Request, context?: { ip?: string }) =>
  context?.ip ?? req.headers.get('x-nf-client-connection-ip') ?? 'unknown'

/**
 * Fixed-window rate limit in Netlify Blobs. Returns false once `limit` hits are used up.
 * Not perfectly atomic, which is fine for keeping abuse and costs down.
 */
export async function allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const store = getStore('rate-limits')
  const now = Date.now()
  const rec = (await store.get(key, { type: 'json' })) as { n: number; start: number } | null
  if (!rec || now - rec.start > windowSeconds * 1000) {
    await store.setJSON(key, { n: 1, start: now })
    return true
  }
  if (rec.n >= limit) return false
  await store.setJSON(key, { n: rec.n + 1, start: rec.start })
  return true
}

export interface Attachment {
  filename: string
  content: string // base64
}

/** Send through Resend. NOTIFY_FROM is e.g. "Pick a Date <onboarding@resend.dev>". */
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; attachments?: Attachment[] }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env('NOTIFY_FROM'), to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, attachments: msg.attachments }),
  })
  if (!res.ok) {
    console.error('Resend error', res.status, await res.text())
    throw new Error('Email failed')
  }
}

/** The bare address inside NOTIFY_FROM, used as the calendar organizer */
export const fromAddress = () => /<([^>]+)>/.exec(env('NOTIFY_FROM'))?.[1] ?? env('NOTIFY_FROM')

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  if (req.method !== 'POST') return null
  const len = Number(req.headers.get('content-length') ?? 0)
  if (len > 20_000) return null
  try {
    const body = (await req.json()) as unknown
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}
