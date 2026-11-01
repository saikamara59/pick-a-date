// POST /api/verify/start { email } → emails a 6-digit code.
// Stateless: the response carries a signed token the check step validates; nothing is stored but rate limits.
import { randomInt } from 'node:crypto'
import { EMAIL_RE } from '../../src/lib/codec'
import { handle, allow, clientIp, esc, json, readJson, refund, sendEmail, sign } from '../lib/server'

const TTL_MINUTES = 10

export default handle(async (req: Request, context: { ip?: string }) => {
  const body = await readJson(req)
  if (!body) return json({ error: 'Bad request' }, 400)
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return json({ error: 'That doesn’t look like an email address.' }, 400)

  // Keep this from being used to spam inboxes.
  // Only codes that actually went out count against the limits (see refund below).
  const ipKey = `vs2-ip:${clientIp(req, context)}`
  const emailKey = `vs2-email:${email}`
  if (!(await allow(ipKey, 10, 3600))) return json({ error: 'Too many codes sent. Try again in an hour.' }, 429)
  if (!(await allow(emailKey, 5, 3600))) {
    await refund(ipKey)
    return json({ error: 'Too many codes sent to this email. Try again in an hour.' }, 429)
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const exp = Date.now() + TTL_MINUTES * 60_000
  let token: string
  try {
    token = sign(`verify|v1|${email}|${code}|${exp}`)
  } catch (err) {
    await refund(ipKey)
    await refund(emailKey)
    throw err
  }

  try {
    await sendEmail({
      to: email,
      subject: `${code} is your Pick a Date code`,
      text: `Your code is ${code}. It expires in ${TTL_MINUTES} minutes.\n\nIf you didn’t ask for this, ignore this email.`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:16px;color:#22204a">
<p>Your Pick a Date code:</p>
<p style="font-size:32px;font-weight:800;letter-spacing:.12em;margin:8px 0">${esc(code)}</p>
<p style="color:#5d5a78">It expires in ${TTL_MINUTES} minutes. If you didn’t ask for this, ignore this email.</p></div>`,
    })
  } catch (err) {
    await refund(ipKey)
    await refund(emailKey)
    return json({ error: (err as Error).message || 'Couldn’t send the code right now.' }, 502)
  }

  return json({ exp, token })
})

export const config = { path: '/api/verify/start' }
