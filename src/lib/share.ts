import type { Answers, Invite } from '../types'
import { AREA_BY_ID } from './areas'

export function planLines(inv: Invite, a: Answers): string[] {
  const lines: string[] = []
  if (a.area) lines.push(`Where: ${AREA_BY_ID[a.area].label}`)
  for (const c of inv.categories) {
    const pick = a.picks[c.id]
    if (!pick) continue
    const spot = a.spots[c.id]
    if (spot?.kind === 'place') {
      lines.push(`${c.label}: ${spot.place.name} (${spot.place.address}) ${spot.place.mapsUrl}`)
    } else if (spot?.kind === 'surprise') {
      lines.push(`${c.label}: ${pick.value}, you pick the spot`)
    } else {
      lines.push(`${c.label}: ${pick.value}`)
    }
  }
  if (a.note.trim()) lines.push(`Note: ${a.note.trim()}`)
  return lines
}

export const acceptMessage = (inv: Invite, a: Answers) =>
  [`Hey ${inv.from}! I’m in. Here’s the plan:`, ...planLines(inv, a)].join('\n')

export const declineMessage = (inv: Invite) =>
  `Hey ${inv.from}, not this time, but thank you for the invite.`

const isApple = () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)

/** Link that opens her messages (or Instagram DMs) to him. Null when he left no contact. */
export function replyHref(inv: Invite, body: string): string | null {
  if (inv.reply.kind === 'sms') {
    return `sms:${inv.reply.value}${isApple() ? '&' : '?'}body=${encodeURIComponent(body)}`
  }
  if (inv.reply.kind === 'ig') return `https://ig.me/m/${inv.reply.value}`
  return null
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    ta.remove()
    return ok
  }
}
