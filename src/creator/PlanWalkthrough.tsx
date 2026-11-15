// "Plan the date": he walks through her step screens and comes out with his Plan.
import { useMemo, useState } from 'react'
import type { Answers, HisPlan, Invite } from '../types'
import { buildSteps } from '../invite/steps'
import { StepView } from '../invite/StepView'
import { SurpriseStep } from '../invite/screens'

export function PlanWalkthrough({
  inv,
  initial,
  onDone,
  onCancel,
}: {
  inv: Invite
  initial?: HisPlan
  onDone: (p: HisPlan) => void
  onCancel: () => void
}) {
  const [answers, setAnswers] = useState<Answers>(() =>
    initial ?? { area: inv.areas.length === 1 ? inv.areas[0] : undefined, picks: {}, spots: {}, note: '' },
  )
  const [surprises, setSurprises] = useState<string[]>(initial?.surprises ?? [])
  const [idx, setIdx] = useState(0)
  const steps = useMemo(() => buildSteps(inv, answers, 'him'), [inv, answers])

  const commit = (update: (a: Answers) => Answers) => {
    setAnswers(update(answers))
    setIdx((i) => Math.min(i + 1, steps.length - 1))
    window.scrollTo(0, 0)
  }
  const back = () => (idx === 0 ? onCancel() : setIdx(idx - 1))

  const step = steps[Math.min(idx, steps.length - 1)]
  const nav = { index: idx, total: steps.length, onBack: back }
  const key = `${idx}-${step.kind}-${'cat' in step ? step.cat.id : ''}`

  return (
    <div className={`invite-app plan-overlay t-${inv.theme}`} role="dialog" aria-label="Plan the date">
      {step.kind === 'surprises' ? (
        <SurpriseStep
          key={key}
          nav={nav}
          questions={inv.categories.filter((c) => c.kind !== 'when' && answers.picks[c.id])}
          value={surprises.filter((id) => answers.picks[id])}
          onDone={(ids) => {
            setSurprises(ids)
            onDone({ ...answers, note: '', surprises: ids })
          }}
        />
      ) : (
        <StepView key={key} inv={inv} step={step} nav={nav} answers={answers} commit={commit} who="him" />
      )}
    </div>
  )
}
