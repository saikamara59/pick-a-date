// "Pick the spot": real places from /api/places for her pick in her area.
// Every state has a way forward, so the invite never dead-ends.
import { useEffect, useState } from 'react'
import type { Category, Pick, SpotPick } from '../types'
import { AREA_BY_ID, type AreaId } from '../lib/areas'
import { PLACES_ATTRIBUTION, searchPlaces, type Place } from '../lib/places'
import { ArrowRight, Dice, External, Question, StepTop } from '../components/ui'

type State = { status: 'loading' } | { status: 'ready'; places: Place[] } | { status: 'error' }

export function SpotStep({
  nav,
  pick,
  area,
  from,
  value,
  onDone,
}: {
  nav: { index: number; total: number; onBack: () => void }
  cat: Category
  pick: Pick
  area: AreaId
  from: string
  value?: SpotPick
  onDone: (s: SpotPick) => void
}) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [sel, setSel] = useState<string | 'surprise' | undefined>(
    value?.kind === 'place' ? value.place.id : value?.kind === 'surprise' ? 'surprise' : undefined,
  )

  const areaName = AREA_BY_ID[area].label
  const what = pick.value.toLowerCase()

  useEffect(() => {
    const ctrl = new AbortController()
    setState({ status: 'loading' })
    searchPlaces(area, pick.value, ctrl.signal)
      .then((places) => setState({ status: 'ready', places }))
      .catch((err: unknown) => {
        if ((err as Error).name !== 'AbortError') setState({ status: 'error' })
      })
    return () => ctrl.abort()
  }, [area, pick.value, attempt])

  if (state.status === 'error') {
    return (
      <section className="screen">
        <StepTop {...nav} />
        <div className="center-body">
          <span className="mono eyebrow">
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
        <StepTop {...nav} />
        <Question eyebrow={`${pick.value} in ${areaName}`}>Pick the spot.</Question>
        <div className="pad">
          <div className="empty">
            <p className="empty-title">Couldn’t find any. Want me to pick?</p>
            <p className="empty-sub">
              Nothing came up for {what} nearby. {from} can find one, or you can change your answer.
            </p>
            <div className="empty-actions">
              <button type="button" className="btn btn-p wide" onClick={() => onDone({ kind: 'surprise' })}>
                Yes, you pick
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
    if (sel === 'surprise') return onDone({ kind: 'surprise' })
    const place = places.find((p) => p.id === sel)
    if (place) onDone({ kind: 'place', place })
  }

  return (
    <section className="screen has-dock">
      <StepTop {...nav} />
      <Question
        eyebrow={
          loading
            ? `Finding ${what} in ${areaName}…`
            : `${pick.value} in ${areaName} · ${places.length} spot${places.length === 1 ? '' : 's'}`
        }
      >
        Pick the spot.
      </Question>

      {loading ? (
        <div className="list" aria-busy="true" aria-label={`Loading ${what} spots`}>
          {[62, 48, 56, 40, 52].map((w) => (
            <div className="sk" key={w}>
              <i style={{ width: `${w}%` }} />
              <i style={{ width: `${w + 18}%`, height: 10 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="list" role="radiogroup" aria-label={`${pick.value} spots in ${areaName}`}>
          {places.map((p) => {
            const on = sel === p.id
            return (
              <div key={p.id} className={`pl${on ? ' sel' : ''}`}>
                <button
                  type="button"
                  className="pl-main"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSel(p.id)}
                >
                  <span className="pl-name">{p.name}</span>
                  <span className="pl-meta">{p.address}</span>
                  {p.type && <span className="pl-type">{p.type}</span>}
                </button>
                <span className="rd" />
                <a className="maps" href={p.mapsUrl} target="_blank" rel="noreferrer">
                  View on Maps
                  <External />
                </a>
              </div>
            )
          })}
          <button
            type="button"
            className={`surprise${sel === 'surprise' ? ' sel' : ''}`}
            role="radio"
            aria-checked={sel === 'surprise'}
            onClick={() => setSel('surprise')}
          >
            <Dice />
            <span>
              You choose, surprise me
              <small>
                {from} picks the {what} spot in {areaName}.
              </small>
            </span>
          </button>
        </div>
      )}

      <div className="dock">
        {loading ? (
          <button type="button" className="btn btn-s wide" onClick={() => onDone({ kind: 'surprise' })}>
            You choose, surprise me
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
