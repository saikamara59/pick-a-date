// "Pick the spot": real places from /api/places for her pick in her area.
// Every state has a way forward, so the invite never dead-ends.
import { useEffect, useState } from 'react'
import type { Category, Pick, SpotPick } from '../types'
import { placeLabel, type AreaId } from '../lib/areas'
import { findPlaces, PLACES_ATTRIBUTION, type Place } from '../lib/places'
import { ArrowRight, Grain, Question, StepTop } from '../components/ui'

type State = { status: 'loading' } | { status: 'ready'; places: Place[]; searched: string[] } | { status: 'error' }

export function SpotStep({
  nav,
  cat,
  pick,
  area,
  hood,
  from,
  value,
  allowLeftToHim = true,
  onDone,
}: {
  nav: { index: number; total: number; onBack: () => void }
  cat: Category
  pick: Pick
  area: AreaId
  hood?: string
  from: string
  value?: SpotPick
  /** False in his own walkthrough: he can't leave the spot to himself */
  allowLeftToHim?: boolean
  onDone: (s: SpotPick) => void
}) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [sel, setSel] = useState<string | 'left-to-him' | undefined>(
    value?.kind === 'place' ? value.place.id : value?.kind === 'left-to-him' ? 'left-to-him' : undefined,
  )

  const areaName = placeLabel(area, hood)
  const what = pick.value.toLowerCase()

  useEffect(() => {
    const ctrl = new AbortController()
    setState({ status: 'loading' })
    findPlaces(area, hood, pick, cat.label, ctrl.signal)
      .then(({ places, searched }) => setState({ status: 'ready', places, searched }))
      .catch((err: unknown) => {
        if ((err as Error).name !== 'AbortError') setState({ status: 'error' })
      })
    return () => ctrl.abort()
  }, [area, hood, pick, cat.label, attempt])

  if (state.status === 'error') {
    return (
      <section className="screen">
        <Grain />
        <StepTop {...nav} />
        <div className="center-body">
          <span className="lbl kicker">
            {pick.value} in {areaName}
          </span>
          <h1 className="big-2">We’ll figure out the spot together.</h1>
          <p className="sub-2">
            Couldn’t load places right now. {pick.value} in {areaName} still goes on the ticket.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-p wide" onClick={() => onDone({ kind: 'tbd' })}>
            Keep going
            <ArrowRight />
          </button>
          <button type="button" className="btn btn-t" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      </section>
    )
  }

  if (state.status === 'ready' && state.places.length === 0) {
    return (
      <section className="screen">
        <Grain />
        <StepTop {...nav} />
        <Question eyebrow={`${pick.value} in ${areaName}`}>Pick the spot.</Question>
        <div className="pad">
          <div className="empty">
            <p className="empty-title">{allowLeftToHim ? `Couldn’t find any. Want ${from} to pick?` : 'Couldn’t find any.'}</p>
            <p className="empty-sub">
              {allowLeftToHim
                ? `Nothing came up for ${what} nearby. ${from} can find one, or you can change your answer.`
                : `Nothing came up for ${what} nearby. Keep it without a spot, or change your answer.`}
            </p>
            <div className="empty-actions">
              <button type="button" className="btn btn-p wide" onClick={() => onDone({ kind: allowLeftToHim ? 'left-to-him' : 'tbd' })}>
                {allowLeftToHim ? `Yes, ${from} picks` : 'Keep going without a spot'}
              </button>
              <button type="button" className="btn btn-t" onClick={nav.onBack}>
                Change my answer
              </button>
            </div>
          </div>
        </div>
        <div className="dock flat">
          <p className="attr">{PLACES_ATTRIBUTION}</p>
        </div>
      </section>
    )
  }

  const loading = state.status === 'loading'
  const places = state.status === 'ready' ? state.places : []

  const next = () => {
    if (sel === 'left-to-him') return onDone({ kind: 'left-to-him' })
    const place = places.find((p) => p.id === sel)
    if (place) onDone({ kind: 'place', place })
  }

  return (
    <section className="screen has-dock">
      <Grain />
      <StepTop {...nav} />
      <Question
        eyebrow={
          loading
            ? `Finding ${what} in ${areaName}…`
            : state.status === 'ready' && state.searched.length
              ? `Searched ${state.searched.map((q) => `“${q}”`).join(' and ')} in ${areaName}`
              : `${pick.value} in ${areaName}`
        }
      >
        Pick the spot.
      </Question>

      {loading ? (
        <div className="menu" aria-busy="true" aria-label={`Loading ${what} spots`}>
          {[62, 48, 56, 40, 52].map((w) => (
            <div className="sk" key={w}>
              <i style={{ width: `${w}%` }} />
              <i style={{ width: `${w + 14}%`, height: 10 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="menu" role="radiogroup" aria-label={`${pick.value} spots in ${areaName}`}>
          {places.map((p) => {
            const on = sel === p.id
            return (
              <div key={p.id} className={`spot${on ? ' sel' : ''}`}>
                <button type="button" className="spot-main" role="radio" aria-checked={on} onClick={() => setSel(p.id)}>
                  <b>
                    <span className="hl-text">{p.name}</span>
                  </b>
                  <span>{p.address}</span>
                </button>
                <a className="maps" href={p.mapsUrl} target="_blank" rel="noreferrer">
                  Maps ↗
                </a>
              </div>
            )
          })}
          {allowLeftToHim && (
          <div className={`spot last${sel === 'left-to-him' ? ' sel' : ''}`}>
            <button
              type="button"
              className="spot-main"
              role="radio"
              aria-checked={sel === 'left-to-him'}
              onClick={() => setSel('left-to-him')}
            >
              <b>
                <span className="hl-text">Or… {from} picks</span>
              </b>
              <span>
                {pick.custom ? `He finds the right spot in ${areaName}.` : `He finds a ${what} spot in ${areaName}.`}
              </span>
            </button>
          </div>
          )}
        </div>
      )}

      <div className="dock">
        {loading ? (
          <button type="button" className="btn btn-s wide" onClick={() => onDone({ kind: allowLeftToHim ? 'left-to-him' : 'tbd' })}>
            {allowLeftToHim ? `${from} picks, skip this` : 'Skip, no spot for now'}
          </button>
        ) : (
          <button type="button" className="btn btn-p wide" disabled={!sel} onClick={next}>
            Next
            <ArrowRight />
          </button>
        )}
        <p className="attr">{PLACES_ATTRIBUTION}</p>
      </div>
    </section>
  )
}
