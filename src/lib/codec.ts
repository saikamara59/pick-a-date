// Invites live entirely in the link: JSON -> lz-string -> URL-safe text.
// Anything decoded from a link is untrusted, so every field is re-validated here.
import LZ from 'lz-string'
import type { Category, Draft, HisPlan, Invite, ReplyKind, ThemeId } from '../types'
import { cleanPlan } from './plan'
import { isAreaId, type AreaId } from './areas'
import { parseTime } from './when'

const THEMES: ThemeId[] = ['riso', 'stationery', 'night']
/** v1 links used these names; keep them opening in the closest v2 theme. */
const LEGACY_THEMES: Record<string, ThemeId> = { cherry: 'riso', plum: 'stationery', midnight: 'night' }

function cleanTheme(v: unknown): ThemeId {
  if (THEMES.includes(v as ThemeId)) return v as ThemeId
  return (typeof v === 'string' && LEGACY_THEMES[v]) || 'riso'
}

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
  const isWhen = o.kind === 'when'
  let options = Array.isArray(o.options)
    ? [...new Set(o.options.map((x) => str(x, 40)).filter(Boolean))].slice(0, 12)
    : []
  if (isWhen) options = options.filter((t) => parseTime(t) !== null)
  const label = str(o.label, 24)
  if (!label || options.length === 0) return null
  return {
    id: str(o.id, 24).replace(/[^a-z0-9-]/gi, '') || `c${i}`,
    label,
    question: str(o.question, 90) || `${label}?`,
    options,
    spots: !isWhen && o.spots === true,
    ...(isWhen ? { kind: 'when' as const } : {}),
  }
}

export const EMAIL_RE = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/
const SIG_RE = /^[A-Za-z0-9_-]{43}$/

function cleanNotify(v: unknown): Invite['notify'] {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  const email = str(o.email, 254).toLowerCase()
  const sig = str(o.sig, 64)
  return EMAIL_RE.test(email) && SIG_RE.test(sig) ? { email, sig } : undefined
}

export const isHisPlan = (inv: Invite): inv is Invite & { plan: HisPlan } => !!inv.plan

/** The day and time of his Plan, e.g. "2026-11-20T19:00". */
export function planWhen(inv: Invite): string | undefined {
  const cat = inv.categories.find((c) => c.kind === 'when')
  return cat ? inv.plan?.picks[cat.id]?.value : undefined
}

/**
 * Validate his Plan against the invite's own setup. Undefined unless it has an area he allows
 * and a day/time at one of his listed times, so she never sees half a plan.
 */
export function cleanHisPlan(inv: Omit<Invite, 'plan'>, raw: unknown): HisPlan | undefined {
  const a = cleanPlan(inv, raw)
  if (!a.area || !inv.areas.includes(a.area)) return undefined
  const whenCat = inv.categories.find((c) => c.kind === 'when')
  const when = whenCat ? a.picks[whenCat.id]?.value : undefined
  if (!whenCat || !when) return undefined
  const slot = when.slice(11)
  const times = whenCat.options.map(parseTime).filter((t) => t !== null)
  if (!times.some((t) => `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}` === slot)) return undefined
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const ids = Array.isArray(o.surprises) ? o.surprises : []
  const surprises = inv.categories.filter((c) => c.kind !== 'when' && a.picks[c.id] && ids.includes(c.id)).map((c) => c.id)
  return { ...a, note: '', surprises }
}

export function draftToInvite(d: Draft): Invite {
  const inv: Invite = {
    v: 1,
    to: d.to.trim(),
    from: d.from.trim(),
    reply: cleanReply(d.reply.kind, d.reply.value),
    intro: d.intro.trim(),
    areas: d.areas,
    categories: d.categories
      .filter((c) => c.on && c.options.length > 0)
      .map(({ id, label, question, options, spots, kind }) => ({ id, label, question, options, spots, ...(kind ? { kind } : {}) })),
    note: d.note,
    theme: d.theme,
    ...(d.notify?.sig ? { notify: { email: d.notify.email, sig: d.notify.sig } } : {}),
  }
  const plan = d.kind === 'his-plan' && d.plan ? cleanHisPlan(inv, d.plan) : undefined
  return plan ? { ...inv, plan } : inv
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

    const inv: Invite = {
      v: 1,
      to,
      from,
      reply: cleanReply(kind, str(r.value, 40)),
      intro: str(j.intro, 140),
      areas,
      categories,
      note: j.note === true,
      theme: cleanTheme(j.theme),
      ...(cleanNotify(j.notify) ? { notify: cleanNotify(j.notify) } : {}),
    }
    if (j.plan === undefined) return inv
    // A link that claims to carry his Plan but fails validation is broken, not a Her-pick invite.
    const plan = cleanHisPlan(inv, j.plan)
    return plan ? { ...inv, plan } : null
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
