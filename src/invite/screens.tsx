// Invite screens that don't fetch anything: intro, area, choice, note, endings.
import { useEffect, useRef, useState } from 'react'
import type { Category, Invite, Pick } from '../types'
import { AREAS, AREA_BY_ID, type AreaId } from '../lib/areas'
import { ArrowRight, CheckBadge, Question, StepTop } from '../components/ui'

const SELECT_DELAY = 350

export function IntroScreen({
  inv,
  serial,
  stepCount,
  onStart,
  onDecline,
}: {
  inv: Invite
  serial: string
  stepCount: number
  onStart?: () => void
  onDecline?: () => void
}) {
  return (
    <section className="screen">
      <div className="mono meta">
        <span>Invite No. {serial}</span>
        <span>
          {stepCount} steps · 2 min
        </span>
      </div>
      <div className="intro-body">
        <span className="mono stamp">Admit two · TBD</span>
        <h1 className="hello">Hey {inv.to},</h1>
        {inv.intro && <p className="intro-line">{inv.intro}</p>}
        <div className="from">
          <span className="avatar" aria-hidden="true">
            {inv.from.charAt(0).toUpperCase()}
          </span>
          <span>From {inv.from}</span>
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-p wide" onClick={onStart}>
          Let’s see it
          <ArrowRight />
        </button>
        <button type="button" className="btn btn-t" onClick={onDecline}>
          Maybe another time
        </button>
      </div>
    </section>
  )
}

interface StepNav {
  index: number
  total: number
  onBack: () => void
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
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const choose = (a: AreaId) => {
    setSel(a)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onPick(a), SELECT_DELAY)
  }

  const list = AREAS.filter((a) => areas.includes(a.id))
  return (
    <section className="screen">
      <StepTop {...nav} />
      <Question eyebrow="Where">Where are we meeting up?</Question>
      <div className="stack">
        {list.map((a, i) => {
          const on = sel === a.id
          return (
            <button
              key={a.id}
              type="button"
              className={`opt opt-row${on ? ' sel' : ''}${sel && !on ? ' dim' : ''}`}
              aria-pressed={on}
              onClick={() => choose(a.id)}
            >
              <span className="opt-row-text">
                <span className="opt-row-name">{a.label}</span>
                <span className="mono opt-row-hint">{a.hint}</span>
              </span>
              {on ? <CheckBadge size={24} /> : <span className="mono n-only">{String(i + 1).padStart(2, '0')}</span>}
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
  value,
  onPick,
}: {
  nav: StepNav
  cat: Category
  value?: Pick
  onPick: (p: Pick) => void
}) {
  const [sel, setSel] = useState<string | undefined>(value && !value.custom ? value.value : undefined)
  const [own, setOwn] = useState(value?.custom ? value.value : '')
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const choose = (opt: string) => {
    setSel(opt)
    setOwn('')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onPick({ value: opt, custom: false }), SELECT_DELAY)
  }

  const submitOwn = () => {
    const v = own.trim()
    if (v.length >= 2) onPick({ value: v.slice(0, 40), custom: true })
  }

  const typing = own.trim().length > 0
  return (
    <section className="screen">
      <StepTop {...nav} />
      <Question eyebrow={cat.label}>{cat.question}</Question>
      <div className="grid">
        {cat.options.map((opt, i) => {
          const on = sel === opt && !typing
          const dim = (!!sel && !on) || typing
          return (
            <button
              key={opt}
              type="button"
              className={`opt${on ? ' sel' : ''}${dim ? ' dim' : ''}`}
              aria-pressed={on}
              onClick={() => choose(opt)}
            >
              <span className="n">
                {String(i + 1).padStart(2, '0')}
                {on && <CheckBadge />}
              </span>
              {opt}
            </button>
          )
        })}
      </div>
      <form
        className="own"
        onSubmit={(e) => {
          e.preventDefault()
          submitOwn()
        }}
      >
        <label className="fl" htmlFor={`own-${cat.id}`} style={typing ? { color: 'var(--ink)' } : undefined}>
          or type your own
        </label>
        <div className="own-field">
          <input
            id={`own-${cat.id}`}
            className="in"
            placeholder="Something else…"
            maxLength={40}
            value={own}
            onChange={(e) => {
              setOwn(e.target.value)
              if (e.target.value) {
                window.clearTimeout(timer.current)
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
        </div>
        {typing && <span className="help">Typing clears the cards. Enter or the arrow moves on.</span>}
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
      <StepTop {...nav} />
      <Question eyebrow="Note · optional">Anything I should know?</Question>
      <div className="pad">
        <label className="fl" htmlFor="note">
          Your note to {from}
        </label>
        <textarea
          id="note"
          className="in note"
          maxLength={140}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mono note-meta">
          <span>Allergies, deal-breakers, a hint.</span>
          <span>{note.length}/140</span>
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

export function DeclinedScreen({ inv, letHimKnow }: { inv: Invite; letHimKnow: string | null }) {
  return (
    <section className="screen">
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
      <div className="center-body">
        <div className="halves" aria-hidden="true">
          <div className="half left mono">Admit —</div>
          <div className="half right mono">No. ——</div>
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
