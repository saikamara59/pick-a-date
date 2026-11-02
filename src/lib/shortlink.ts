// Browser side of short invite links.

export const SHORT_ID_RE = /^[0-9A-Za-z]{9}$/

export async function createShortLink(code: string): Promise<string> {
  const res = await fetch('/api/invites', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
  if (!res.ok || !data.id) throw new Error(data.error ?? 'Couldn’t make a short link.')
  return `${window.location.origin}/i/${data.id}`
}

/** Short id → the full invite code, or null if it doesn't exist. */
export async function resolveShortLink(id: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/invites/${id}`)
    if (!res.ok) return null
    const data = (await res.json()) as { code?: string }
    return data.code ?? null
  } catch {
    return null
  }
}

/**
 * Copy text that's still being fetched. Safari only allows clipboard writes inside the tap itself,
 * so hand it a promise via ClipboardItem; other browsers just await and write.
 */
export async function copyAsync(text: Promise<string>): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      const blob = text.then((t) => new Blob([t], { type: 'text/plain' }))
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    await navigator.clipboard.writeText(await text)
    return true
  } catch {
    return false
  }
}
