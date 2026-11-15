// Her side of a His-plan invite: what she may see, which Counter-times are allowed,
// the text she can send him, and the answer her phone remembers.
import type { Invite } from '../types'
import { placeLabel } from './areas'
import { planWhen } from './codec'
import { declineMessage } from './share'
import { formatWhen, isWhenValue, parseTime, upcomingDays, WHEN_DAYS, whenToDate } from './when'

export type HerResponse = { kind: 'in' } | { kind: 'counter'; when: string } | { kind: 'decline' }

export interface PlanRow {
  label: string
  value: string
  sub?: string
  link?: string
}

const SURPRISE = 'It’s a surprise'

/** His Plan as she sees it. A Surprise shows neither his choice nor the venue. */
export function herRows(inv: Invite): PlanRow[] {
  const p = inv.plan
  if (!p) return []
  const rows: PlanRow[] = []
  if (p.area) rows.push({ label: 'Where', value: placeLabel(p.area, p.hood) })
  for (const c of inv.categories) {
    const pick = p.picks[c.id]
    if (!pick) continue
    if (p.surprises.includes(c.id)) {
      rows.push({ label: c.label, value: SURPRISE })
      continue
    }
    const spot = p.spots[c.id]
    if (spot?.kind === 'place') {
      rows.push({ label: c.label, value: spot.place.name, sub: spot.place.address, ...(spot.place.mapsUrl ? { link: spot.place.mapsUrl } : {}) })
    } else {
      rows.push({ label: c.label, value: formatWhen(pick.value) })
    }
  }
  return rows
}

/** Plain-text lines for her own calendar entry. */
export const herPlanLines = (inv: Invite): string[] => herRows(inv).map((r) => `${r.label}: ${r.value}${r.sub ? ` (${r.sub})` : ''}`)

/** Her calendar location: the area only, so a Surprise venue never leaks. */
export const herCalendarLocation = (inv: Invite): string => (inv.plan?.area ? placeLabel(inv.plan.area, inv.plan.hood) : '')

export function isPassed(inv: Invite, now = new Date()): boolean {
  const when = planWhen(inv)
  return !!when && whenToDate(when).getTime() <= now.getTime()
}

/** Days she can pick for a Counter-time. */
export const counterDays = (now = new Date()): string[] => upcomingDays(WHEN_DAYS, now)

/** A Counter-time must be a future slot at one of his times, within the window, and not his own slot. */
export function isValidCounter(inv: Invite, value: string, now = new Date()): boolean {
  if (!isWhenValue(value) || value === planWhen(inv)) return false
  const whenCat = inv.categories.find((c) => c.kind === 'when')
  const slots = (whenCat?.options ?? []).map(parseTime).filter((t) => t !== null).map((t) => `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`)
  if (!slots.includes(value.slice(11))) return false
  if (whenToDate(value).getTime() <= now.getTime()) return false
  // One extra day tolerates clock and timezone differences between her phone and the server.
  const last = upcomingDays(WHEN_DAYS + 1, now).at(-1)!
  return value.slice(0, 10) <= last
}

/** Prefilled text to him. Built only from the When, so it can't reveal a Surprise. */
export function herReplyMessage(inv: Invite, r: HerResponse): string {
  if (r.kind === 'in') return `Hey ${inv.from}! I’m in for ${formatWhen(planWhen(inv) ?? '')}.`
  if (r.kind === 'counter') return `Hey ${inv.from}, can we do ${formatWhen(r.when)} instead?`
  return declineMessage(inv)
}

export function answerKey(code: string): string {
  let h = 0
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `pick-a-date:answer:${h.toString(16).padStart(8, '0')}`
}

function isHerResponse(v: unknown): v is HerResponse {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  if (o.kind === 'in' || o.kind === 'decline') return true
  return o.kind === 'counter' && typeof o.when === 'string' && isWhenValue(o.when)
}

export function loadHerAnswer(code: string): HerResponse | null {
  try {
    const raw = localStorage.getItem(answerKey(code))
    const v: unknown = raw ? JSON.parse(raw) : null
    if (!isHerResponse(v)) return null
    return v.kind === 'counter' ? { kind: 'counter', when: v.when } : { kind: v.kind }
  } catch {
    return null
  }
}

export function saveHerAnswer(code: string, r: HerResponse): void {
  try {
    localStorage.setItem(answerKey(code), JSON.stringify(r))
  } catch {
    /* private mode: she just won't see her last answer next time */
  }
}
