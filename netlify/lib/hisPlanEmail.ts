// Rows and wording for the emails /api/notify sends him. Pure, so it can be tested.
import { placeLabel } from '../../src/lib/areas'
import { planWhen } from '../../src/lib/codec'
import { isValidCounter, type HerResponse } from '../../src/lib/hisPlan'
import { dayParts, formatWhen } from '../../src/lib/when'
import type { Answers, HisPlan, Invite } from '../../src/types'

export interface Row {
  label: string
  value: string
  sub?: string
  link?: string
}

/** Her picks (Her-pick invite) as email rows. */
export function rowsFor(inv: Invite, a: Answers): Row[] {
  const rows: Row[] = []
  if (a.area) rows.push({ label: 'Where', value: placeLabel(a.area, a.hood) })
  for (const c of inv.categories) {
    const pick = a.picks[c.id]
    if (!pick) continue
    const spot = a.spots[c.id]
    if (spot?.kind === 'place') rows.push({ label: c.label, value: spot.place.name, sub: spot.place.address, link: spot.place.mapsUrl || undefined })
    else if (spot?.kind === 'left-to-him') rows.push({ label: c.label, value: pick.value, sub: 'You pick the spot' })
    else rows.push({ label: c.label, value: formatWhen(pick.value), sub: spot?.kind === 'tbd' ? 'Spot TBD' : undefined })
  }
  if (a.note) rows.push({ label: 'Her note', value: a.note })
  return rows
}

/**
 * His own Plan as email rows. Takes no answers on purpose: a His-plan email is built only
 * from the Plan in the signed-off link, never from what the browser sent. He sees his Surprises.
 */
export function hisPlanRows(inv: Invite & { plan: HisPlan }): Row[] {
  return rowsFor(inv, inv.plan).map((r) => {
    const cat = inv.categories.find((c) => c.label === r.label)
    if (!cat || !inv.plan.surprises.includes(cat.id)) return r
    return { ...r, sub: r.sub ? `${r.sub} · Surprise for her` : 'Surprise for her' }
  })
}

const hisDay = (inv: Invite) => dayParts((planWhen(inv) ?? '').slice(0, 10)).weekday

function core(inv: Invite, r: HerResponse): string {
  if (r.kind === 'in') return `${inv.to}’s in · ${formatWhen(planWhen(inv) ?? '')}`
  if (r.kind === 'counter') return `${inv.to} can’t do ${hisDay(inv)}. How about ${formatWhen(r.when)}?`
  return `${inv.to} can’t make it this time`
}

export const hisPlanSubject = (inv: Invite, r: HerResponse, update: boolean): string => `${update ? 'Update: ' : ''}${core(inv, r)}`

export function hisPlanHeadline(inv: Invite, r: HerResponse): string {
  if (r.kind === 'in') return `${inv.to}’s in for ${formatWhen(planWhen(inv) ?? '')}.`
  if (r.kind === 'counter') return `${core(inv, r)} Text her to lock it in.`
  return `${inv.to} can’t make it this time.`
}

/** Her answer from the request body, rebuilt and checked. Null if it isn't a valid answer. */
export function cleanResponse(inv: Invite, raw: unknown, now = new Date()): HerResponse | null {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (o.kind === 'in' || o.kind === 'decline') return { kind: o.kind }
  if (o.kind === 'counter' && typeof o.when === 'string' && isValidCounter(inv, o.when, now)) return { kind: 'counter', when: o.when }
  return null
}
