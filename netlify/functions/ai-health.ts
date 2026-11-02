// GET /api/ai/health → is the Claude API reachable with this site's key and model?
// Returns the API's own error message (never the key) so setup problems are easy to spot.
import { allow, clientIp, handle, json } from '../lib/server'

export default handle(async (req: Request, context: { ip?: string }) => {
  if (!(await allow(`ai-health:${clientIp(req, context)}`, 10, 3600))) return json({ ok: false, error: 'Checked too often. Try again in an hour.' }, 429)

  const key = process.env.ANTHROPIC_API_KEY
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5'
  if (!key) return json({ ok: false, model, error: 'ANTHROPIC_API_KEY isn’t set on this deploy. Add it in Netlify, then trigger a new deploy.' })

  const started = Date.now()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 50,
      output_config: { effort: 'low' },
      ...(model.includes('haiku') ? { thinking: { type: 'disabled' } } : {}),
      messages: [{ role: 'user', content: 'Reply with the word ok.' }],
    }),
  }).catch((err: Error) => err)

  if (res instanceof Error) return json({ ok: false, model, error: `Couldn’t reach the Claude API: ${res.message}` })
  const body = await res.text()
  if (!res.ok) {
    let message = body.slice(0, 300)
    try {
      message = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? message
    } catch {
      /* keep raw */
    }
    return json({ ok: false, model, status: res.status, error: message })
  }
  return json({ ok: true, model, ms: Date.now() - started })
})

export const config = { path: '/api/ai/health' }
