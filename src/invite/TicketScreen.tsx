import { useMemo, useState } from 'react'
import type { Answers, Invite, SpotPick } from '../types'
import { placeLabel } from '../lib/areas'
import { acceptMessage, copyText, planLines, replyHref } from '../lib/share'
import { sendToHim } from '../lib/notify'
import { buildIcs, formatWhen, googleCalendarUrl, isWhenValue, whenToDate } from '../lib/when'
import { ArrowRight, Chat, Grain } from '../components/ui'

type SendState = { s: 'idle' } | { s: 'sending' } | { s: 'sent' } | { s: 'error'; msg: string }

export function TicketScreen({
  inv,
  code,
  answers,
  serial,
  onChange,
}: {
  inv: Invite
  code: string
  answers: Answers
  serial: string
  onChange: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [send, setSend] = useState<SendState>({ s: 'idle' })
  const message = acceptMessage(inv, answers)
  const href = replyHref(inv, message)

  // Her own calendar: Google link plus an .ics for Apple/Outlook.
  const cal = useMemo(() => {
    const whenCat = inv.categories.find((c) => c.kind === 'when')
    const when = whenCat ? answers.picks[whenCat.id]?.value : undefined
    if (!when || !isWhenValue(when)) return null
    const place = Object.values(answers.spots).find((x): x is Extract<SpotPick, { kind: 'place' }> => x.kind === 'place')
    const event = {
      uid: `${serial}-${when}@pick-a-date`,
      title: `Date with ${inv.from}`,
      start: whenToDate(when),
      hours: 3,
      location: place ? `${place.place.name}, ${place.place.address}` : answers.area ? placeLabel(answers.area, answers.hood) : '',
      details: planLines(inv, answers).join('\n'),
    }
    const ics = URL.createObjectURL(new Blob([buildIcs(event)], { type: 'text/calendar' }))
    return { google: googleCalendarUrl(event), ics }
  }, [inv, answers, serial])

  const copy = async () => {
    if (await copyText(message)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  const sendIt = async () => {
    setSend({ s: 'sending' })
    try {
      await sendToHim(code, answers)
      setSend({ s: 'sent' })
    } catch (e) {
      setSend({ s: 'error', msg: (e as Error).message })
    }
  }

  const textLink = href && (
    <a
      className="btn btn-t"
      href={href}
      target={inv.reply.kind === 'ig' ? '_blank' : undefined}
      rel="noreferrer"
      onClick={() => {
        // Instagram can't prefill a DM, so put the plan on her clipboard first.
        if (inv.reply.kind === 'ig') void copyText(message)
      }}
    >
      {inv.reply.kind === 'ig' ? `DM ${inv.from} instead` : `Text ${inv.from} instead`}
    </a>
  )

  return (
    <section className="screen">
      <Grain />
      <div className="ticket-head">
        <span className="lbl kicker">{send.s === 'sent' ? 'Sent' : 'All set'}</span>
        <h1 className="plan-title">{send.s === 'sent' ? `${inv.from}’s got it.` : 'Here’s the plan.'}</h1>
      </div>

      <article className="ticket" aria-label="Your date ticket">
        <div className="tk-top">
          <div className="tk-meta">
            <span className="lbl">Admit two</span>
            <span className="lbl">№ {serial}</span>
          </div>
          <div className="tk-names">
            {inv.to}
            <br />
            &amp; {inv.from}
          </div>
        </div>
        <div className="rows">
          {answers.area && (
            <div className="row">
              <b className="lbl">Where</b>
              <span>{placeLabel(answers.area, answers.hood)}</span>
            </div>
          )}
          {inv.categories.map((c) => {
            const pick = answers.picks[c.id]
            if (!pick) return null
            const spot = answers.spots[c.id]
            return (
              <div className="row" key={c.id}>
                <b className="lbl">{c.label}</b>
                {spot?.kind === 'place' ? (
                  <span>
                    {spot.place.name}
                    <small>
                      {spot.place.address} ·{' '}
                      <a href={spot.place.mapsUrl} target="_blank" rel="noreferrer">
                        Maps ↗
                      </a>
                    </small>
                  </span>
                ) : (
                  <span>
                    {formatWhen(pick.value)}
                    {spot?.kind === 'surprise' && <small>{inv.from} picks the spot</small>}
                    {spot?.kind === 'tbd' && <small>Spot TBD</small>}
                  </span>
                )}
              </div>
            )
          })}
          {answers.note && (
            <div className="row">
              <b className="lbl">Note</b>
              <span>{answers.note}</span>
            </div>
          )}
        </div>
        <div className="stamp" aria-hidden="true">
          IT’S A DATE
        </div>
      </article>

      <div className="actions">
        {inv.notify && send.s !== 'sent' && (
          <>
            <button type="button" className="btn btn-p wide" onClick={sendIt} disabled={send.s === 'sending'}>
              {send.s === 'sending' ? 'Sending…' : `Send it to ${inv.from}`}
              {send.s !== 'sending' && <ArrowRight />}
            </button>
            {send.s === 'error' && (
              <p className="fine err" role="alert">
                {send.msg}
              </p>
            )}
            {textLink}
          </>
        )}

        {inv.notify && send.s === 'sent' && cal && (
          <div className="actions-row">
            <a className="btn btn-p" style={{ flex: 1 }} href={cal.google} target="_blank" rel="noreferrer">
              Add to my calendar
            </a>
            <a className="btn btn-s" style={{ padding: '0 20px' }} href={cal.ics} download="date.ics">
              .ics
            </a>
          </div>
        )}

        {!inv.notify && (
          <div className="actions-row">
            {href && (
              <a
                className="btn btn-p"
                style={{ flex: 1 }}
                href={href}
                target={inv.reply.kind === 'ig' ? '_blank' : undefined}
                rel="noreferrer"
                onClick={() => {
                  if (inv.reply.kind === 'ig') void copyText(message)
                }}
              >
                <Chat />
                {inv.reply.kind === 'ig' ? `DM ${inv.from} my picks` : `Text ${inv.from} my picks`}
              </a>
            )}
            <button type="button" className={`btn ${href ? 'btn-s' : 'btn-p'}`} style={href ? { padding: '0 22px' } : { flex: 1 }} onClick={copy}>
              {copied ? 'Copied' : href ? 'Copy' : 'Copy my picks'}
            </button>
          </div>
        )}

        {send.s !== 'sent' && (
          <button type="button" className="btn btn-t" onClick={onChange}>
            Change my picks
          </button>
        )}
      </div>
    </section>
  )
}
