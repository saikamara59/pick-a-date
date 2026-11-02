// Minimal Claude Messages API client for the functions.
// Asks for a single JSON object in plain text and parses it, which works the same on any Claude model.
import { env } from './server'

/** Cheap and fast; set ANTHROPIC_MODEL in Netlify to use another model (e.g. claude-sonnet-5-5). */
const DEFAULT_MODEL = 'claude-haiku-5-5'

export interface AskOptions {
  system: string
  user: string
  /** Shape of the JSON answer, shown to the model as an example */
  shape: string
  effort?: 'low' | 'medium' | 'high'
  maxTokens?: number
  timeoutMs?: number
}

export async function askJson<T>(opts: AskOptions): Promise<T> {
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
    headers: {
      'x-api-key': env('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 1500,
      output_config: { effort: opts.effort ?? 'low' },
      // Haiku can skip thinking entirely for short structured jobs, which keeps it fast.
      ...(model.includes('haiku') ? { thinking: { type: 'disabled' } } : {}),
      system: `${opts.system}\n\nReply with only one JSON object, no other text, in exactly this shape:\n${opts.shape}`,
      messages: [{ role: 'user', content: opts.user }],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('Claude API error', res.status, body.slice(0, 500))
    throw new Error(`Claude API error ${res.status}`)
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
  const m = /\{[\s\S]*\}/.exec(text)
  if (!m) throw new Error('Claude returned no JSON')
  return JSON.parse(m[0]) as T
}
