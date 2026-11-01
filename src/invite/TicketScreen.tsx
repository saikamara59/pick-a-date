import { useState } from 'react'
import type { Answers, Invite } from '../types'
import { AREA_BY_ID } from '../lib/areas'
import { acceptMessage, copyText, replyHref } from '../lib/share'
import { Chat, Grain } from '../components/ui'

export function TicketScreen({
  inv,
  answers,
  serial,
  onChange,
}: {
  inv: Invite
  answers: Answers
  serial: string
  onChange: () => void
}) {
  const [copied, setCopied] = useState(false)
  const message = acceptMessage(inv, answers)
  const href = replyHref(inv, message)

  const copy = async () => {
    if (await copyText(message)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section className="screen">
      <Grain />
      <div className="ticket-head">
        <span className="lbl kicker">All set</span>
        <h1 className="plan-title">Here’s the plan.</h1>
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
              <span>{AREA_BY_ID[answers.area].label}</span>
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
                    {pick.value}
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
        <div className="actions-row">
          {href && (
            <a
              className="btn btn-p"
              style={{ flex: 1 }}
              href={href}
              target={inv.reply.kind === 'ig' ? '_blank' : undefined}
              rel="noreferrer"
              onClick={() => {
                // Instagram can't prefill a DM, so put the plan on her clipboard first.
                if (inv.reply.kind === 'ig') void copyText(message)
              }}
            >
              <Chat />
              {inv.reply.kind === 'ig' ? `DM ${inv.from} my picks` : `Text ${inv.from} my picks`}
            </a>
          )}
          <button
            type="button"
            className={`btn ${href ? 'btn-s' : 'btn-p'}`}
            style={href ? { padding: '0 22px' } : { flex: 1 }}
            onClick={copy}
          >
            {copied ? 'Copied' : href ? 'Copy' : 'Copy my picks'}
          </button>
        </div>
        {inv.reply.kind === 'ig' && <p className="fine">Your picks get copied. Paste them in the DM.</p>}
        <button type="button" className="btn btn-t" onClick={onChange}>
          Change my picks
        </button>
      </div>
    </section>
  )
}
