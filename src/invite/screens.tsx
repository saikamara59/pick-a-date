// Invite screens that don't fetch anything: intro poster, area, choice, note, endings.
import { useEffect, useRef, useState } from 'react'
import type { Category, Invite, Pick } from '../types'
import { AREAS, AREA_BY_ID, type AreaId } from '../lib/areas'
import { isSurprise } from '../lib/presets'
import { calendarMonths, dayParts, formatWhen, isWhenValue, parseTime, upcomingDays, WHEN_DAYS } from '../lib/when'
import { ArrowRight, Grain, Question, Ring, StepTop, Toggle } from '../components/ui'
import { OptionIcon } from '../components/optionIcons'

const SELECT_DELAY = 420

/* ---------------- Intro poster ---------------- */

export function IntroScreen({
  inv,
  serial,
  stepCount,
  onStart,
  onDecline,
  startLabel,
}: {
  inv: Invite
  serial: string
  stepCount: number
  onStart?: () => void
  onDecline?: () => void
  /** His-plan invite: "See the plan" instead of the theme's default */
  startLabel?: string
}) {
  const actions = (label: string) => (
    <div className="actions">
      <button type="button" className="btn btn-p wide" onClick={onStart}>
        {startLabel ?? label}
        {inv.theme !== 'stationery' && <ArrowRight />}
      </button>
      <button type="button" className="btn btn-t" onClick={onDecline}>
        Maybe another time
      </button>
    </div>
  )

  if (inv.theme === 'stationery') {
    return (
      <section className="screen">
        <div className="card-frame">
          <span className="lbl card-kicker">A small invitation</span>
          <div className="card-body">
            <h1 className="card-name">{inv.to},</h1>
            <p className="card-line">{inv.intro || 'I’d like to take you out. You pick the plan.'}</p>
            <p className="card-from">— {inv.from}</p>
            <span className="seal" aria-hidden="true">
              {inv.from.charAt(0).toUpperCase()}
            </span>
          </div>
          {actions('Open the invitation')}
        </div>
      </section>
    )
  }

  if (inv.theme === 'night') {
    return (
      <section className="screen">
        <Grain />
        <div className="glow" aria-hidden="true" />
        <div className="meta">
          <span className="lbl">Invite № {serial}</span>
          <span className="lbl">Admit two</span>
        </div>
        <div className="intro-body">
          <span className="hey">hey</span>
          <h1 className="night-name">{inv.to}.</h1>
          {inv.intro && <p className="intro-line">{inv.intro}</p>}
          <div className="from">
            <span className="dot" aria-hidden="true" />
            From {inv.from}
          </div>
        </div>
        {actions('Let’s see it')}
      </section>
    )
  }

  // Riso (default)
  return (
    <section className="screen">
      <Grain />
      <div className="meta">
        <span className="lbl">Invite № {serial}</span>
        <span className="lbl">Admit two</span>
      </div>
      <div className="intro-body">
        <div className="blob" aria-hidden="true" />
        <span className="lbl kicker">You’re invited</span>
        <h1
          className="riso-name"
          // Size the name to fit one line on a phone, whatever its length.
          style={{ fontSize: `${Math.max(36, Math.min(76, Math.floor(520 / (inv.to.length + 1))))}px` }}
        >
          <span className="misreg" aria-hidden="true">
            Hey
            <br />
            {inv.to},
          </span>
          <span className="ink">
            Hey
            <br />
            {inv.to},
          </span>
        </h1>
        {inv.intro && <p className="intro-line">{inv.intro}</p>}
        <div className="intro-foot">
          <span className="lbl">From {inv.from}</span>
          <span className="lbl muted">NYC · NJ</span>
          <span className="lbl muted push">{inv.plan ? 'Plan’s ready' : `${stepCount} steps · 2 min`}</span>
        </div>
      </div>
      {actions('Let’s see it')}
    </section>
  )
}

/* ---------------- Steps ---------------- */

interface StepNav {
  index: number
  total: number
  onBack: () => void
}

function useDelayedPick<T>(onPick: (v: T) => void) {
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return {
    later: (v: T) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => onPick(v), SELECT_DELAY)
    },
    cancel: () => window.clearTimeout(timer.current),
  }
}

export function AreaStep({
  nav,
  areas,
  value,
  onPick,
}: {
  nav: StepNav
  areas: AreaId[]
  value?: AreaId
  onPick: (a: AreaId) => void
}) {
  const [sel, setSel] = useState<AreaId | undefined>(value)
  const delayed = useDelayedPick(onPick)
  const list = AREAS.filter((a) => areas.includes(a.id))

  return (
    <section className="screen">
      <Grain />
      <StepTop {...nav} />
      <Question eyebrow="Where">Where are we meeting up?</Question>
      <div className="menu">
        {list.map((a) => {
          const on = sel === a.id
          return (
            <button
              key={a.id}
              type="button"
              className={`area${on ? ' sel' : ''}${sel && !on ? ' dim' : ''}`}
              aria-pressed={on}
              onClick={() => {
                setSel(a.id)
                delayed.later(a.id)
              }}
            >
              <span className={`bullet b-${a.id}`} aria-hidden="true">
                {a.short}
              </span>
              <span className="area-text">
                <b>{a.label}</b>
                <small>{a.hint}</small>
                {on && <Ring />}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function ChoiceStep({
  nav,
  cat,
  from,
  value,
  onPick,
}: {
  nav: StepNav
  cat: Category
  from: string
  value?: Pick
  onPick: (p: Pick) => void
}) {
  const [sel, setSel] = useState<string | undefined>(value && !value.custom ? value.value : undefined)
  const [own, setOwn] = useState(value?.custom ? value.value : '')
  const [joke, setJoke] = useState(false)
  const delayed = useDelayedPick<Pick>((p) => (isSurprise(p.value) ? setJoke(true) : onPick(p)))

  if (joke && sel) {
    return (
      <section className="screen">
        <Grain />
        <div className="center-body">
          <span className="lbl kicker">{cat.label} · surprise me</span>
          <h1 className="big">
            Bold.
            <br />
            <span className="accent">{from}’s got it.</span>
          </h1>
          <p className="sub-2">No pressure on him at all. Moving on.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-p wide" onClick={() => onPick({ value: sel, custom: false })}>
            Next
            <ArrowRight />
          </button>
          <button type="button" className="btn btn-t" onClick={() => setJoke(false)}>
            Actually, let me pick
          </button>
        </div>
      </section>
    )
  }

  const submitOwn = () => {
    const v = own.trim()
    if (v.length >= 2) onPick({ value: v.slice(0, 40), custom: true })
  }
  const typing = own.trim().length > 0

  return (
    <section className="screen">
      <Grain />
      <StepTop {...nav} />
      <Question eyebrow={cat.label}>{cat.question}</Question>
      <div className="menu">
        {cat.options.map((opt) => {
          const on = sel === opt && !typing
          const dim = (!!sel && !on) || typing
          return (
            <button
              key={opt}
              type="button"
              className={`item${on ? ' sel' : ''}${dim ? ' dim' : ''}`}
              aria-pressed={on}
              onClick={() => {
                setSel(opt)
                setOwn('')
                delayed.later({ value: opt, custom: false })
              }}
            >
              <OptionIcon option={opt} category={cat.id} />
              <b>
                {opt}
                {on && <Ring />}
              </b>
            </button>
          )
        })}
      </div>
      <form
        className="write"
        onSubmit={(e) => {
          e.preventDefault()
          submitOwn()
        }}
      >
        <label htmlFor={`own-${cat.id}`}>Write-in:</label>
        <input
          id={`own-${cat.id}`}
          className="blank"
          maxLength={40}
          value={own}
          placeholder="something else"
          onChange={(e) => {
            setOwn(e.target.value)
            if (e.target.value) {
              delayed.cancel()
              setSel(undefined)
            }
          }}
          enterKeyHint="next"
          autoComplete="off"
        />
        {typing && (
          <button type="submit" className="own-go" aria-label="Use my answer">
            <ArrowRight size={18} />
          </button>
        )}
      </form>
    </section>
  )
}

export function NoteStep({
  nav,
  from,
  value,
  onDone,
}: {
  nav: StepNav
  from: string
  value: string
  onDone: (note: string) => void
}) {
  const [note, setNote] = useState(value)
  return (
    <section className="screen">
      <Grain />
      <StepTop {...nav} />
      <Question eyebrow="Note · optional">Anything I should know?</Question>
      <div className="pad">
        <label className="fl" htmlFor="note">
          Your note to {from}
        </label>
        <textarea id="note" className="lined" maxLength={140} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="note-meta">
          <span>Allergies, deal-breakers, a hint.</span>
          <span className="lbl">{note.length}/140</span>
        </div>
      </div>
      <div className="actions row">
        <button type="button" className="btn btn-s" style={{ flex: 1 }} onClick={() => onDone('')}>
          Skip
        </button>
        <button type="button" className="btn btn-p" style={{ flex: 2 }} onClick={() => onDone(note.trim())}>
          Next
          <ArrowRight />
        </button>
      </div>
    </section>
  )
}

/* ---------------- His Surprises (end of Plan the date) ---------------- */

/** One "Keep it a surprise" switch per question he answered (never the When question). */
export function SurpriseStep({
  nav,
  questions,
  value,
  onDone,
}: {
  nav: StepNav
  questions: Category[]
  value: string[]
  onDone: (ids: string[]) => void
}) {
  const [ids, setIds] = useState(value)
  return (
    <section className="screen">
      <Grain />
      <StepTop {...nav} />
      <Question eyebrow="Surprises · optional">Anything to keep a surprise?</Question>
      <div className="pad">
        <div className="finish">
          {questions.map((c) => (
            <div className="area-card" key={c.id}>
              <div>
                <b>{c.label}</b>
                <span>She sees “it’s a surprise” instead of your pick.</span>
              </div>
              <Toggle
                on={ids.includes(c.id)}
                onChange={(on) => setIds(on ? [...ids, c.id] : ids.filter((x) => x !== c.id))}
                label={`Keep ${c.label} a surprise`}
              />
            </div>
          ))}
        </div>
        <p className="help">The day and time always show, so she knows when.</p>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-p wide" onClick={() => onDone(ids)}>
          Done
          <ArrowRight />
        </button>
      </div>
    </section>
  )
}

/* ---------------- Endings ---------------- */

export function DeclinedScreen({ inv, letHimKnow }: { inv: Invite; letHimKnow: string | null }) {
  return (
    <section className="screen">
      <Grain />
      <div className="center-body">
        <h1 className="big">All good.</h1>
        <p className="sub">Thanks for opening it.</p>
      </div>
      {letHimKnow && (
        <div className="actions">
          <a className="btn btn-s wide" href={letHimKnow} target={inv.reply.kind === 'ig' ? '_blank' : undefined} rel="noreferrer">
            Let him know
          </a>
          <p className="fine">Optional. Sends {inv.from} a short “not this time.”</p>
        </div>
      )}
    </section>
  )
}

export function BrokenLinkScreen() {
  return (
    <section className="screen">
      <Grain />
      <div className="center-body">
        <div className="halves" aria-hidden="true">
          <div className="half left lbl">Admit —</div>
          <div className="half right lbl">№ ——</div>
        </div>
        <h1 className="big-2">This invite didn’t make it.</h1>
        <p className="sub-2">The link looks cut off, or it’s been turned off. Ask whoever sent it for a fresh one.</p>
      </div>
      <div className="actions">
        <a href="/" className="btn btn-s wide">
          Make your own invite
        </a>
      </div>
    </section>
  )
}

export const areaLabel = (a?: AreaId) => (a ? AREA_BY_ID[a].label : '')

/* ---------------- When: a real day and time ---------------- */

export function WhenStep({
  nav,
  cat,
  value,
  disabledValue,
  nextLabel = 'Next',
  onPick,
}: {
  nav: StepNav
  cat: Category
  value?: string
  /** A slot she can't pick (his own, when she's asking for a Counter-time) */
  disabledValue?: string
  nextLabel?: string
  onPick: (value: string) => void
}) {
  const days = upcomingDays(WHEN_DAYS)
  const times = cat.options.map((t) => ({ label: t, at: parseTime(t) })).filter((t) => t.at)
  const [day, setDay] = useState<string | undefined>(value && isWhenValue(value) ? value.slice(0, 10) : undefined)
  const [time, setTime] = useState<string | undefined>(value && isWhenValue(value) ? value.slice(11) : undefined)
  const done = day && time && `${day}T${time}` !== disabledValue

  return (
    <section className="screen">
      <Grain />
      <StepTop {...nav} />
      <Question eyebrow={cat.label}>{cat.question}</Question>
      <div className="pad">
        <span className="fl" id={`days-${cat.id}`}>
          Pick a day
        </span>
        <div className="cal" role="radiogroup" aria-labelledby={`days-${cat.id}`}>
          <div className="cal-head" aria-hidden="true">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          {calendarMonths(days).map((m) => (
            <div key={m.label} className="cal-month">
              <p className="cal-label">{m.label}</p>
              <div className="cal-grid">
                {m.cells.map((d, i) => {
                  if (!d) return <span key={`b${i}`} />
                  const p = dayParts(d)
                  const on = day === d
                  return (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`${p.weekday} ${p.month} ${p.date}`}
                      className={`day${on ? ' sel' : ''}`}
                      onClick={() => setDay(d)}
                    >
                      {p.date}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <span className="fl" id={`times-${cat.id}`} style={{ marginTop: 22 }}>
          And a time
        </span>
        <div className="times" role="radiogroup" aria-labelledby={`times-${cat.id}`}>
          {times.map(({ label, at }) => {
            const v = `${String(at!.h).padStart(2, '0')}:${String(at!.m).padStart(2, '0')}`
            const on = time === v
            const off = !!day && `${day}T${v}` === disabledValue
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={off}
                title={off ? 'That’s the time he picked' : undefined}
                className={`time${on ? ' sel' : ''}`}
                onClick={() => setTime(v)}
              >
                {label}
              </button>
            )
          })}
        </div>
        {done && <p className="when-preview">{formatWhen(`${day}T${time}`)}</p>}
      </div>
      <div className="actions">
        <button type="button" className="btn btn-p wide" disabled={!done} onClick={() => done && onPick(`${day}T${time}`)}>
          {nextLabel}
          <ArrowRight />
        </button>
      </div>
    </section>
  )
}

/* ---------------- Neighborhood within the area ---------------- */

export function HoodStep({
  nav,
  area,
  value,
  onPick,
}: {
  nav: StepNav
  area: AreaId
  value?: string
  onPick: (hood: string | undefined) => void
}) {
  const a = AREA_BY_ID[area]
  const ANY = '*'
  const [sel, setSel] = useState<string | undefined>(value ?? undefined)
  const delayed = useDelayedPick<string>((v) => onPick(v === ANY ? undefined : v))
  const rows = [{ id: ANY, label: `Anywhere in ${a.label}` }, ...a.hoods]

  return (
    <section className="screen">
      <Grain />
      <StepTop {...nav} />
      <Question eyebrow={a.label}>Which part?</Question>
      <div className="menu">
        {rows.map((h) => {
          const on = sel === h.id
          return (
            <button
              key={h.id}
              type="button"
              className={`item${on ? ' sel' : ''}${sel && !on ? ' dim' : ''}${h.id === ANY ? ' any' : ''}`}
              aria-pressed={on}
              onClick={() => {
                setSel(h.id)
                delayed.later(h.id)
              }}
            >
              <b>
                {h.label}
                {on && <Ring />}
              </b>
            </button>
          )
        })}
      </div>
    </section>
  )
}
