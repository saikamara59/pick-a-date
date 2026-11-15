// POST /api/notify { code, answers } → emails him her picks with a calendar invite (Her-pick invite).
// POST /api/notify { code, response, update, previous } → emails him her answer to his Plan (His-plan invite).
// Only sends to the address signed into the invite, and only a few times per invite.
import { createHash } from 'node:crypto'
import { decodeInvite, isHisPlan, planWhen } from '../../src/lib/codec'
import { placeLabel } from '../../src/lib/areas'
import { buildIcs, formatWhen, googleCalendarUrl, isWhenValue, whenToDate, type CalendarEvent } from '../../src/lib/when'
import type { Answers, HisPlan, Invite, SpotPick } from '../../src/types'
import { cleanPlan } from '../../src/lib/plan'
import type { HerResponse } from '../../src/lib/hisPlan'
import { cleanResponse, hisPlanHeadline, hisPlanRows, hisPlanSubject, rowsFor, type Row } from '../lib/hisPlanEmail'
import { buildGamePlan, type GamePlan } from '../lib/gameplan'
import { handle, allow, esc, fromAddress, json, notifyPayload, readJson, sendEmail, verify } from '../lib/server'

const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function planHtml(p: GamePlan): string {
  const tip = (label: string, body: string) =>
    body ? `<p style="margin:10px 0 0"><b style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#5d5a78">${esc(label)}</b><br>${esc(body)}</p>` : ''
  return `<div style="margin-top:32px;padding:20px;border:2px solid #22204a;border-radius:16px;box-shadow:5px 5px 0 #ff4f9e">
<p style="font-size:13px;color:#ff4f9e;font-weight:700;margin:0">Your game plan</p>
<table style="border-collapse:collapse;width:100%;font-size:15px;margin-top:10px">
${p.timeline.map((t) => `<tr><td style="padding:6px 12px 6px 0;font-weight:700;white-space:nowrap;vertical-align:top">${esc(t.time)}</td><td style="padding:6px 0">${esc(t.what)}</td></tr>`).join('\n')}
</table>
${tip('Getting around', p.getting_around)}${tip('Book or check ahead', p.book_ahead)}${tip('If plans change', p.backup)}
${p.openers.length ? `<p style="margin:14px 0 0"><b style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#5d5a78">Easy conversation starters</b></p><ul style="margin:6px 0 0;padding-left:18px">${p.openers.map((o) => `<li style="margin:4px 0">${esc(o)}</li>`).join('')}</ul>` : ''}
<p style="margin:14px 0 0;font-size:12px;color:#5d5a78">Written by AI from her picks. Double-check hours and reservations.</p>
</div>`
}

function planText(p: GamePlan): string {
  return [
    'YOUR GAME PLAN',
    ...p.timeline.map((t) => `${t.time}  ${t.what}`),
    ...(p.getting_around ? ['', `Getting around: ${p.getting_around}`] : []),
    ...(p.book_ahead ? [`Book or check ahead: ${p.book_ahead}`] : []),
    ...(p.backup ? [`If plans change: ${p.backup}`] : []),
    ...(p.openers.length ? ['', 'Conversation starters:', ...p.openers.map((o) => `- ${o}`)] : []),
    '',
    '(Written by AI from her picks. Double-check hours and reservations.)',
  ].join('\n')
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

  // Check her answer before spending one of the 3 sends.
  const r: HerResponse | null = isHisPlan(inv) ? cleanResponse(inv, body.response) : null
  if (isHisPlan(inv) && !r) return json({ error: 'That answer didn’t look right. Try again.' }, 400)

  const inviteKey = createHash('sha256').update(code).digest('hex').slice(0, 32)
  if (!(await allow(`notify:${inviteKey}`, 3, 86400))) return json({ error: 'Already sent. He’s got it.' }, 429)

  // His-plan: everything comes from his Plan in the link; the body only says which answer she gave.
  let a: Answers
  let rows: Row[]
  let whenValue: string | undefined
  let subject: string
  let headline: string
  let kicker = 'It’s a date'
  let method: 'REQUEST' | 'CANCEL' = 'REQUEST'
  let wantGamePlan = true
  if (isHisPlan(inv) && r) {
    const update = body.update === true
    const prev = body.previous === 'in' || body.previous === 'counter' ? body.previous : null
    a = inv.plan
    rows = hisPlanRows(inv as Invite & { plan: HisPlan }, r.kind === 'counter' ? r.when : undefined)
    subject = hisPlanSubject(inv, r, update)
    headline = hisPlanHeadline(inv, r)
    if (r.kind === 'decline') {
      kicker = 'Not this time'
      wantGamePlan = false
      // Cancel the event an earlier yes or Counter-time put on his calendar.
      whenValue = prev ? planWhen(inv) : undefined
      method = 'CANCEL'
    } else {
      if (r.kind === 'counter') {
        kicker = 'New time?'
        // The game plan would be timed for his original night; skip it until they settle the time.
        wantGamePlan = false
      }
      whenValue = r.kind === 'counter' ? r.when : planWhen(inv)
    }
  } else {
    a = cleanPlan(inv, body.answers)
    rows = rowsFor(inv, a)
    const whenCat = inv.categories.find((c) => c.kind === 'when')
    whenValue = whenCat ? a.picks[whenCat.id]?.value : undefined
    subject = `${inv.to} picked your date${whenValue && isWhenValue(whenValue) ? ` · ${formatWhen(whenValue)}` : ''}`
    headline = `${inv.to} picked the plan.`
  }
  // AI game plan is a bonus: skipped if no key, and the email still goes out if it fails or is slow.
  const plan = wantGamePlan && process.env.ANTHROPIC_API_KEY ? await buildGamePlan(inv, a, 15_000) : null

  // Calendar event from the "when" pick, if there is one. One UID per invite, so updates replace it.
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

  const gcal = event && method === 'REQUEST' ? googleCalendarUrl(event) : null

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;color:#22204a;max-width:520px">
<p style="font-size:14px;color:#ff4f9e;font-weight:700;margin:0">${esc(kicker)}</p>
<h1 style="font-size:28px;margin:6px 0 18px">${esc(headline)}</h1>
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
${plan ? planHtml(plan) : ''}
</div>`

  const text = [headline, '', ...rows.map((r) => `${r.label}: ${r.value}${r.sub ? ` (${r.sub})` : ''}${r.link ? ` ${r.link}` : ''}`), ...(gcal ? ['', `Add to Google Calendar: ${gcal}`] : []), ...(plan ? ['', planText(plan)] : [])].join('\n')

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
                buildIcs(event, {
                  method,
                  // Increases with every send so calendars replace the earlier event.
                  ...(isHisPlan(inv) ? { sequence: Math.floor(Date.now() / 1000) } : {}),
                  organizer: fromAddress(),
                  attendee: { email: inv.notify.email, name: inv.from },
                }),
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
