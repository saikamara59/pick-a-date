// Browser side of email verification and "send it to him".
import type { Answers } from '../types'
import type { HerResponse } from './hisPlan'

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new Error('Couldn’t reach the server. Check your connection and try again.')
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (res.status === 404) throw new Error('Server setup: this function isn’t deployed yet. Redeploy on Netlify.')
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}. Check Netlify → Logs → Functions.`)
  return data
}

export const startVerify = (email: string) => post<{ exp: number; token: string }>('/api/verify/start', { email })

export const checkVerify = (email: string, code: string, exp: number, token: string) =>
  post<{ email: string; sig: string }>('/api/verify/check', { email, code, exp, token })

export const sendToHim = (code: string, answers: Answers) => post<{ ok: true }>('/api/notify', { code, answers })

/** His-plan invite: tell him her answer. `previous` is her earlier answer, if she's changing it. */
export const sendHerAnswer = (code: string, response: HerResponse, update: boolean, previous?: HerResponse['kind']) =>
  post<{ ok: true }>('/api/notify', { code, response, update, previous })
