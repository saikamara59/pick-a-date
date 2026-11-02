// POST /api/notify { code, answers } → emails him her picks with a calendar invite.
// Only sends to the address signed into the invite, and only a few times per invite.
import { createHash } from 'node:crypto'
import { decodeInvite } from '../../src/lib/codec'
import { hoodOf, isAreaId, placeLabel } from '../../src/lib/areas'
import { buildIcs, formatWhen, googleCalendarUrl, isWhenValue, whenToDate, type CalendarEvent } from '../../src/lib/when'
import type { Answers, Invite, Pick, SpotPick } from '../../src/types'
import { handle, allow, esc, fromAddress, json, notifyPayload, readJson, sendEmail, verify } from '../lib/server'

const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const MAPS_RE = /^https:\/\/(maps\.google\.com|www\.google\.com\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)\//

/** Her answers come from the browser, so rebuild them from scratch against the invite. */
function cleanAnswers(inv: Invite, raw: unknown): Answers {
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
    if (sp?.kind === 'surprise' || sp?.kind === 'tbd') spots[c.id] = { kind: sp.kind }
    if (sp?.kind === 'place' && sp.place && typeof sp.place === 'object') {
      const pl = sp.place as Record<string, unknown>
      const name = s(pl.name, 80)
      const mapsUrl = s(pl.mapsUrl, 300)
      if (name) {
        spots[c.id] = {
          kind: 'place',
          place: { id: s(pl.id, 120), name, address: s(pl.address, 140), lat: 0, lng: 0, mapsUrl: MAPS_RE.test(mapsUrl) ? mapsUrl : '' },
        }
      }
    }
  }
  const area = isAreaId(o.area) ? o.area : undefined
  const hood = area && typeof o.hood === 'string' && hoodOf(area, o.hood) ? o.hood : undefined
  return { area, hood, picks, spots, note: s(o.note, 140) }
}

interface Row {
  label: string
  value: string
  sub?: string
  link?: string
}

function rowsFor(inv: Invite, a: Answers): Row[] {
  const rows: Row[] = []
  if (a.area) rows.push({ label: 'Where', value: placeLabel(a.area, a.hood) })
  for (const c of inv.categories) {
    const pick = a.picks[c.id]
    if (!pick) continue
    const spot = a.spots[c.id]
    if (spot?.kind === 'place') rows.push({ label: c.label, value: spot.place.name, sub: spot.place.address, link: spot.place.mapsUrl || undefined })
    else if (spot?.kind === 'surprise') rows.push({ label: c.label, value: pick.value, sub: 'You pick the spot' })
    else rows.push({ label: c.label, value: formatWhen(pick.value), sub: spot?.kind === 'tbd' ? 'Spot TBD' : undefined })
  }
  if (a.note) rows.push({ label: 'Her note', value: a.note })
  return rows
}

export default handle(async (req: Request) => {
  const body = await readJson(req)
  if (!body) return json({ error: 'Bad request' }, 400)
  const code = s(body.code, 4000)
  const inv = code ? decodeInvite(code) : null
  if (!inv) return json({ error: 'This invite link is broken.' }, 400)
  if (!inv.notify || !verify(notifyPayload(inv.notify.email), inv.notify.sig)) {
    return json({ error: 'This invite can’t send notifications.' }, 403)
  }

  const inviteKey = createHash('sha256').update(code).digest('hex').slice(0, 32)
  if (!(await allow(`notify:${inviteKey}`, 3, 86400))) return json({ error: 'Already sent. He’s got it.' }, 429)

  const a = cleanAnswers(inv, body.answers)
  const rows = rowsFor(inv, a)

  // Calendar event from the "when" pick, if there is one.
  const whenCat = inv.categories.find((c) => c.kind === 'when')
  const whenValue = whenCat ? a.picks[whenCat.id]?.value : undefined
  const firstPlace = Object.values(a.spots).find((x): x is Extract<SpotPick, { kind: 'place' }> => x.kind === 'place')
  const details = rows.map((r) => `${r.label}: ${r.value}${r.sub ? ` (${r.sub})` : ''}${r.link ? ` ${r.link}` : ''}`).join('\n')
  const event: CalendarEvent | null =
    whenValue && isWhenValue(whenValue)
      ? {
          uid: `${inviteKey}@pick-a-date`,
          title: `Date with ${inv.to}`,
          start: whenToDate(whenValue),
          hours: 3,
          location: firstPlace ? `${firstPlace.place.name}, ${firstPlace.place.address}` : a.area ? placeLabel(a.area, a.hood) : '',
          details,
        }
      : null

  const gcal = event ? googleCalendarUrl(event) : null
  const subject = `${inv.to} picked your date${whenValue && isWhenValue(whenValue) ? ` · ${formatWhen(whenValue)}` : ''}`

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;color:#22204a;max-width:520px">
<p style="font-size:14px;color:#ff4f9e;font-weight:700;margin:0">It’s a date</p>
<h1 style="font-size:28px;margin:6px 0 18px">${esc(inv.to)} picked the plan.</h1>
<table style="border-collapse:collapse;width:100%;font-size:15px">
${rows
  .map(
    (r) => `<tr><td style="padding:10px 12px 10px 0;color:#5d5a78;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;vertical-align:top;white-space:nowrap">${esc(r.label)}</td>
<td style="padding:10px 0;border-bottom:1px solid #e6e1ec"><b>${esc(r.value)}</b>${r.sub ? `<br><span style="color:#5d5a78;font-size:13px">${esc(r.sub)}</span>` : ''}${r.link ? ` · <a href="${esc(r.link)}" style="color:#2f67d8;font-size:13px">Maps</a>` : ''}</td></tr>`,
  )
  .join('\n')}
</table>
${gcal ? `<p style="margin:24px 0 0"><a href="${esc(gcal)}" style="display:inline-block;background:#2f67d8;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">Add to Google Calendar</a></p>
<p style="color:#5d5a78;font-size:13px">Also attached as a calendar invite for Apple Calendar and Outlook.</p>` : ''}
</div>`

  const text = [`${inv.to} picked the plan.`, '', ...rows.map((r) => `${r.label}: ${r.value}${r.sub ? ` (${r.sub})` : ''}${r.link ? ` ${r.link}` : ''}`), ...(gcal ? ['', `Add to Google Calendar: ${gcal}`] : [])].join('\n')

  try {
    await sendEmail({
      to: inv.notify.email,
      subject,
      html,
      text,
      attachments: event
        ? [
            {
              filename: 'date.ics',
              content: Buffer.from(
                buildIcs(event, { method: 'REQUEST', organizer: fromAddress(), attendee: { email: inv.notify.email, name: inv.from } }),
              ).toString('base64'),
            },
          ]
        : undefined,
    })
  } catch (err) {
    return json({ error: (err as Error).message || 'Couldn’t send right now.' }, 502)
  }

  return json({ ok: true })
})

export const config = { path: '/api/notify' }
