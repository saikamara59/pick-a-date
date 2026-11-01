// The invite she opens: intro → steps → ticket (or a kind "not this time").
import { useMemo, useState } from 'react'
import type { Answers, Category, Invite as InviteData, Pick, SpotPick } from '../types'
import type { AreaId } from '../lib/areas'
import { isSurprise } from '../lib/presets'
import { declineMessage, replyHref } from '../lib/share'
import { AreaStep, ChoiceStep, DeclinedScreen, IntroScreen, NoteStep } from './screens'
import { SpotStep } from './SpotStep'
import { TicketScreen } from './TicketScreen'

type Step = { kind: 'area' } | { kind: 'choice'; cat: Category } | { kind: 'spot'; cat: Category } | { kind: 'note' }

/** The step list depends on her answers: "Surprise me" skips that category's spot step. */
export function buildSteps(inv: InviteData, a: Answers): Step[] {
  const steps: Step[] = []
  if (inv.areas.length > 1) steps.push({ kind: 'area' })
  for (const cat of inv.categories) {
    steps.push({ kind: 'choice', cat })
    const pick = a.picks[cat.id]
    if (cat.spots && !(pick && isSurprise(pick.value))) steps.push({ kind: 'spot', cat })
  }
  if (inv.note) steps.push({ kind: 'note' })
  return steps
}

const emptyAnswers = (inv: InviteData): Answers => ({
  area: inv.areas.length === 1 ? inv.areas[0] : undefined,
  picks: {},
  spots: {},
  note: '',
})

type Screen = 'intro' | 'steps' | 'ticket' | 'declined'

export function Invite({ inv, serial }: { inv: InviteData; serial: string }) {
  const [screen, setScreen] = useState<Screen>('intro')
  const [answers, setAnswers] = useState<Answers>(() => emptyAnswers(inv))
  const [idx, setIdx] = useState(0)

  const steps = useMemo(() => buildSteps(inv, answers), [inv, answers])

  const go = (s: Screen) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }

  /** Save an answer, then move to the next step (or the ticket). */
  const commit = (update: (a: Answers) => Answers) => {
    const next = update(answers)
    setAnswers(next)
    const nextSteps = buildSteps(inv, next)
    if (idx + 1 >= nextSteps.length) go('ticket')
    else {
      setIdx(idx + 1)
      window.scrollTo(0, 0)
    }
  }

  const back = () => {
    if (idx === 0) go('intro')
    else {
      setIdx(idx - 1)
      window.scrollTo(0, 0)
    }
  }

  if (screen === 'intro') {
    return (
      <IntroScreen
        inv={inv}
        serial={serial}
        stepCount={steps.length}
        onStart={() => {
          setIdx(0)
          go('steps')
        }}
        onDecline={() => go('declined')}
      />
    )
  }

  if (screen === 'declined') {
    return <DeclinedScreen inv={inv} letHimKnow={replyHref(inv, declineMessage(inv))} />
  }

  if (screen === 'ticket') {
    return (
      <TicketScreen
        inv={inv}
        answers={answers}
        serial={serial}
        onChange={() => {
          setIdx(0)
          go('steps')
        }}
      />
    )
  }

  const step = steps[Math.min(idx, steps.length - 1)]
  const nav = { index: idx, total: steps.length, onBack: back }
  const key = `${idx}-${step.kind}-${'cat' in step ? step.cat.id : ''}`

  switch (step.kind) {
    case 'area':
      return (
        <AreaStep
          key={key}
          nav={nav}
          areas={inv.areas}
          value={answers.area}
          onPick={(area: AreaId) =>
            commit((a) => ({
              ...a,
              area,
              // A new area means earlier spot picks no longer fit.
              spots: area === a.area ? a.spots : {},
            }))
          }
        />
      )
    case 'choice':
      return (
        <ChoiceStep
          key={key}
          nav={nav}
          cat={step.cat}
          value={answers.picks[step.cat.id]}
          onPick={(p: Pick) =>
            commit((a) => {
              const same = a.picks[step.cat.id]?.value === p.value
              const spots = { ...a.spots }
              if (!same) delete spots[step.cat.id]
              if (isSurprise(p.value)) spots[step.cat.id] = { kind: 'surprise' }
              return { ...a, picks: { ...a.picks, [step.cat.id]: p }, spots }
            })
          }
        />
      )
    case 'spot': {
      const pick = answers.picks[step.cat.id]
      if (!pick || !answers.area) {
        // Shouldn't happen (choice and area come first), but never strand her.
        return null
      }
      return (
        <SpotStep
          key={key}
          nav={nav}
          cat={step.cat}
          pick={pick}
          area={answers.area}
          from={inv.from}
          value={answers.spots[step.cat.id]}
          onDone={(s: SpotPick) => commit((a) => ({ ...a, spots: { ...a.spots, [step.cat.id]: s } }))}
        />
      )
    }
    case 'note':
      return (
        <NoteStep
          key={key}
          nav={nav}
          from={inv.from}
          value={answers.note}
          onDone={(note) => commit((a) => ({ ...a, note }))}
        />
      )
  }
}
