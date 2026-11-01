// POST /api/verify/check { email, code, exp, token } → { sig } to embed in invite links.
import { EMAIL_RE } from '../../src/lib/codec'
import { handle, allow, json, notifyPayload, readJson, sign, verify } from '../lib/server'

export default handle(async (req: Request) => {
  const body = await readJson(req)
  if (!body) return json({ error: 'Bad request' }, 400)
  const email = String(body.email ?? '').trim().toLowerCase()
  const code = String(body.code ?? '').replace(/\D/g, '')
  const exp = Number(body.exp)
  const token = String(body.token ?? '')
  if (!EMAIL_RE.test(email) || code.length !== 6 || !Number.isFinite(exp) || !token) {
    return json({ error: 'Enter the 6-digit code from the email.' }, 400)
  }

  // A handful of tries per hour, so the code can't be guessed.
  if (!(await allow(`vc-email:${email}`, 8, 3600))) return json({ error: 'Too many tries. Send a new code in an hour.' }, 429)

  if (Date.now() > exp) return json({ error: 'That code expired. Send a new one.' }, 400)
  if (!verify(`verify|v1|${email}|${code}|${exp}`, token)) return json({ error: 'That code doesn’t match.' }, 400)

  return json({ email, sig: sign(notifyPayload(email)) })
})

export const config = { path: '/api/verify/check' }
