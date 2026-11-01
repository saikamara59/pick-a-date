// Browser side of email verification and "send it to him".
import type { Answers } from '../types'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.')
  return data
}

export const startVerify = (email: string) => post<{ exp: number; token: string }>('/api/verify/start', { email })

export const checkVerify = (email: string, code: string, exp: number, token: string) =>
  post<{ email: string; sig: string }>('/api/verify/check', { email, code, exp, token })

export const sendToHim = (code: string, answers: Answers) => post<{ ok: true }>('/api/notify', { code, answers })
