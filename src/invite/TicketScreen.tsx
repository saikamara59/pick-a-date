import { useState } from 'react'
import type { Answers, Invite } from '../types'
import { AREA_BY_ID } from '../lib/areas'
import { acceptMessage, copyText, replyHref } from '../lib/share'
import { Chat } from '../components/ui'

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
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const copy = async () => {
    if (await copyText(message)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section className="screen">
      <div className="ticket-head">
        <span className="mono eyebrow">All set</span>
        <h1 className="plan-title">Here’s the plan.</h1>
      </div>

      <div className="printer">
        <div className="slot" />
        <div className="feed">
          <article className="ticket" aria-label="Your date ticket">
            <div className="tk-top">
              <div className="tk-meta">
                <span>Admit two</span>
                <span>No. {serial}</span>
              </div>
              <div className="tk-names">
                {inv.to} &amp; {inv.from}
              </div>
              <div className="tk-sub">
                Picked by {inv.to} · {date}
              </div>
            </div>
            <div className="perf">
              <i />
            </div>
            <div className="rows">
              {answers.area && (
                <div className="row">
                  <b>Where</b>
                  <span>{AREA_BY_ID[answers.area].label}</span>
                </div>
              )}
              {inv.categories.map((c) => {
                const pick = answers.picks[c.id]
                if (!pick) return null
                const spot = answers.spots[c.id]
                return (
                  <div className="row" key={c.id}>
                    <b>{c.label}</b>
                    {spot?.kind === 'place' ? (
                      <span>
                        {spot.place.name}
                        <em>{spot.place.address}</em>
                        <a href={spot.place.mapsUrl} target="_blank" rel="noreferrer">
                          Open in Maps
                        </a>
                      </span>
                    ) : (
                      <span>
                        {pick.value}
                        {spot?.kind === 'surprise' && <em>{inv.from} picks the spot</em>}
                        {spot?.kind === 'tbd' && <em>Spot TBD</em>}
                      </span>
                    )}
                  </div>
                )
              })}
              {answers.note && (
                <div className="row">
                  <b>Note</b>
                  <span>{answers.note}</span>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>

      <div className="actions">
        <div className="actions-row">
          {href ? (
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
          ) : null}
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
