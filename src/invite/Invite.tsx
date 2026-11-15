// The invite she opens: intro → steps → ticket (or a kind "not this time").
import { useMemo, useState } from 'react'
import type { Answers, Invite as InviteData } from '../types'
import { declineMessage, replyHref } from '../lib/share'
import { DeclinedScreen, IntroScreen } from './screens'
import { TicketScreen } from './TicketScreen'
import { buildSteps } from './steps'
import { StepView } from './StepView'

const emptyAnswers = (inv: InviteData): Answers => ({
  area: inv.areas.length === 1 ? inv.areas[0] : undefined,
  picks: {},
  spots: {},
  note: '',
})

type Screen = 'intro' | 'steps' | 'ticket' | 'declined'

export function Invite({ inv, code, serial }: { inv: InviteData; code: string; serial: string }) {
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
        code={code}
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

  if (step.kind === 'surprises') return null
  return <StepView key={key} inv={inv} step={step} nav={nav} answers={answers} commit={commit} />
}
