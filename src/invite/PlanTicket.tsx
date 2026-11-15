// A Plan printed as a ticket. Rows come from herRows, so a Surprise is already hidden.
import type { Invite } from '../types'
import type { PlanRow } from '../lib/hisPlan'

export function PlanTicket({ inv, rows, serial, stamp = 'IT’S A DATE' }: { inv: Invite; rows: PlanRow[]; serial: string; stamp?: string }) {
  return (
    <article className="ticket" aria-label="The date plan">
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
        {rows.map((r) => (
          <div className="row" key={r.label}>
            <b className="lbl">{r.label}</b>
            <span>
              {r.value}
              {(r.sub || r.link) && (
                <small>
                  {r.sub}
                  {r.sub && r.link && ' · '}
                  {r.link && (
                    <a href={r.link} target="_blank" rel="noreferrer">
                      Maps ↗
                    </a>
                  )}
                </small>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="stamp" aria-hidden="true">
        {stamp}
      </div>
    </article>
  )
}
