// A Plan (area, picks, spots, when) arrives from a browser or a link, so it's untrusted.
// Rebuild it from scratch against the invite's own questions. Shared by the app and /api/notify.
import type { Answers, Invite, Pick, SpotPick } from '../types'
import { hoodOf, isAreaId } from './areas'
import { isWhenValue } from './when'

const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const coord = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max ? v : 0)
const MAPS_RE = /^https:\/\/(maps\.google\.com|www\.google\.com\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)\//

export function cleanPlan(inv: { categories: Invite['categories'] }, raw: unknown): Answers {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const picksIn = (o.picks && typeof o.picks === 'object' ? o.picks : {}) as Record<string, unknown>
  const spotsIn = (o.spots && typeof o.spots === 'object' ? o.spots : {}) as Record<string, unknown>
  const picks: Record<string, Pick> = {}
  const spots: Record<string, SpotPick> = {}
  for (const c of inv.categories) {
    const p = picksIn[c.id] as Record<string, unknown> | undefined
    const value = s(p?.value, 40)
    if (!value) continue
    if (c.kind === 'when' && !isWhenValue(value)) continue
    picks[c.id] = { value, custom: p?.custom === true }
    const sp = spotsIn[c.id] as Record<string, unknown> | undefined
    // 'surprise' is the pre-glossary name for Left to him; older browsers may still send it.
    if (sp?.kind === 'left-to-him' || sp?.kind === 'surprise') spots[c.id] = { kind: 'left-to-him' }
    if (sp?.kind === 'tbd') spots[c.id] = { kind: 'tbd' }
    if (sp?.kind === 'place' && sp.place && typeof sp.place === 'object') {
      const pl = sp.place as Record<string, unknown>
      const name = s(pl.name, 80)
      const mapsUrl = s(pl.mapsUrl, 300)
      if (name) {
        spots[c.id] = {
          kind: 'place',
          place: { id: s(pl.id, 120), name, address: s(pl.address, 140), lat: coord(pl.lat, 90), lng: coord(pl.lng, 180), mapsUrl: MAPS_RE.test(mapsUrl) ? mapsUrl : '' },
        }
      }
    }
  }
  const area = isAreaId(o.area) ? o.area : undefined
  const hood = area && typeof o.hood === 'string' && hoodOf(area, o.hood) ? o.hood : undefined
  return { area, hood, picks, spots, note: s(o.note, 140) }
}
