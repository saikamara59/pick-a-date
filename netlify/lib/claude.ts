// Minimal Claude Messages API client for the functions.
// The model returns JSON by calling a single strict tool whose input_schema is the shape we want.
import { env } from './server'

const DEFAULT_MODEL = 'claude-sonnet-5'

export interface AskOptions {
  system: string
  user: string
  /** JSON schema for the answer */
  schema: Record<string, unknown>
  effort?: 'low' | 'medium' | 'high'
  maxTokens?: number
  timeoutMs?: number
}

export async function askJson<T>(opts: AskOptions): Promise<T> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
    headers: {
      'x-api-key': env('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 2000,
      output_config: { effort: opts.effort ?? 'low' },
      system: opts.system,
      // Left on "auto" (newer models reject forced tool use); the prompt asks for exactly one call.
      tools: [{ name: 'answer', description: 'Return your answer.', strict: true, input_schema: opts.schema }],
      messages: [{ role: 'user', content: opts.user }],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('Claude API error', res.status, body.slice(0, 500))
    throw new Error(`Claude API error ${res.status}`)
  }
  const data = (await res.json()) as { content?: { type: string; name?: string; input?: unknown; text?: string }[] }
  const tool = data.content?.find((b) => b.type === 'tool_use' && b.name === 'answer')
  if (tool?.input && typeof tool.input === 'object') return tool.input as T
  // Fallback: a JSON object written as text.
  const text = data.content?.find((b) => b.type === 'text')?.text ?? ''
  const m = /\{[\s\S]*\}/.exec(text)
  if (m) return JSON.parse(m[0]) as T
  throw new Error('Claude returned no answer')
}
