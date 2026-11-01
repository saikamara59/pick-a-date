// Invites live entirely in the link: JSON -> lz-string -> URL-safe text.
// Anything decoded from a link is untrusted, so every field is re-validated here.
import LZ from 'lz-string'
import type { Category, Draft, Invite, ReplyKind, ThemeId } from '../types'
import { isAreaId, type AreaId } from './areas'

const THEMES: ThemeId[] = ['cherry', 'plum', 'midnight']

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export const cleanPhone = (s: string) => s.replace(/[^\d+]/g, '').slice(0, 16)
export const cleanHandle = (s: string) => s.replace(/^@+/, '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 30)

export function cleanReply(kind: ReplyKind, value: string): Invite['reply'] {
  if (kind === 'sms') {
    const v = cleanPhone(value)
    return v.replace(/\D/g, '').length >= 10 ? { kind, value: v } : { kind: 'none', value: '' }
  }
  if (kind === 'ig') {
    const v = cleanHandle(value)
    return v ? { kind, value: v } : { kind: 'none', value: '' }
  }
  return { kind: 'none', value: '' }
}

function cleanCategory(c: unknown, i: number): Category | null {
  if (!c || typeof c !== 'object') return null
  const o = c as Record<string, unknown>
  const options = Array.isArray(o.options)
    ? [...new Set(o.options.map((x) => str(x, 40)).filter(Boolean))].slice(0, 12)
    : []
  const label = str(o.label, 24)
  if (!label || options.length === 0) return null
  return {
    id: str(o.id, 24).replace(/[^a-z0-9-]/gi, '') || `c${i}`,
    label,
    question: str(o.question, 90) || `${label}?`,
    options,
    spots: o.spots === true,
  }
}

export function draftToInvite(d: Draft): Invite {
  return {
    v: 1,
    to: d.to.trim(),
    from: d.from.trim(),
    reply: cleanReply(d.reply.kind, d.reply.value),
    intro: d.intro.trim(),
    areas: d.areas,
    categories: d.categories
      .filter((c) => c.on && c.options.length > 0)
      .map(({ id, label, question, options, spots }) => ({ id, label, question, options, spots })),
    note: d.note,
    theme: d.theme,
  }
}

export function encodeInvite(inv: Invite): string {
  return LZ.compressToEncodedURIComponent(JSON.stringify(inv))
}

export function decodeInvite(code: string): Invite | null {
  try {
    const raw = LZ.decompressFromEncodedURIComponent(code)
    if (!raw) return null
    const j = JSON.parse(raw) as Record<string, unknown>
    if (!j || j.v !== 1) return null

    const to = str(j.to, 40)
    const from = str(j.from, 40)
    if (!to || !from) return null

    const r = (j.reply && typeof j.reply === 'object' ? j.reply : {}) as Record<string, unknown>
    const kind: ReplyKind = r.kind === 'sms' || r.kind === 'ig' ? r.kind : 'none'

    const areas = Array.isArray(j.areas) ? [...new Set(j.areas.filter(isAreaId))] as AreaId[] : []
    const categories = Array.isArray(j.categories)
      ? j.categories.slice(0, 8).map(cleanCategory).filter((c): c is Category => c !== null)
      : []
    if (areas.length === 0 || categories.length === 0) return null

    return {
      v: 1,
      to,
      from,
      reply: cleanReply(kind, str(r.value, 40)),
      intro: str(j.intro, 140),
      areas,
      categories,
      note: j.note === true,
      theme: THEMES.includes(j.theme as ThemeId) ? (j.theme as ThemeId) : 'cherry',
    }
  } catch {
    return null
  }
}

/** Stable 4-digit "ticket number" derived from the link */
export function serialFor(code: string): string {
  let h = 0
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return String(h % 10000).padStart(4, '0')
}

export const inviteUrl = (code: string) => `${window.location.origin}/i/${code}`
