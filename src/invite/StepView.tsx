// Renders one walkthrough step and turns the pick into an Answers update.
// Used by her invite (Her-pick) and by his Plan the date walkthrough.
import type { Answers, Invite, Pick, SpotPick } from '../types'
import type { AreaId } from '../lib/areas'
import { isSurprise } from '../lib/presets'
import { AreaStep, ChoiceStep, HoodStep, NoteStep, WhenStep } from './screens'
import { SpotStep } from './SpotStep'
import type { Step } from './steps'

export interface StepNavProps {
  index: number
  total: number
  onBack: () => void
}

export function StepView({
  inv,
  step,
  nav,
  answers,
  commit,
  who = 'her',
}: {
  inv: Invite
  step: Exclude<Step, { kind: 'surprises' }>
  nav: StepNavProps
  answers: Answers
  commit: (update: (a: Answers) => Answers) => void
  who?: 'her' | 'him'
}) {
  switch (step.kind) {
    case 'area':
      return (
        <AreaStep
          nav={nav}
          areas={inv.areas}
          value={answers.area}
          onPick={(area: AreaId) =>
            commit((a) => ({
              ...a,
              area,
              // A new area means earlier spot picks no longer fit.
              spots: area === a.area ? a.spots : {},
              hood: area === a.area ? a.hood : undefined,
            }))
          }
        />
      )
    case 'hood':
      if (!answers.area) return null
      return (
        <HoodStep
          nav={nav}
          area={answers.area}
          value={answers.hood}
          onPick={(hood) =>
            commit((a) => ({
              ...a,
              hood,
              // Spots were found for the old neighborhood.
              spots: hood === a.hood ? a.spots : Object.fromEntries(Object.entries(a.spots).filter(([, v]) => v.kind !== 'place')),
            }))
          }
        />
      )
    case 'choice':
      if (step.cat.kind === 'when') {
        return (
          <WhenStep
            nav={nav}
            cat={step.cat}
            value={answers.picks[step.cat.id]?.value}
            onPick={(value) => commit((a) => ({ ...a, picks: { ...a.picks, [step.cat.id]: { value, custom: false } } }))}
          />
        )
      }
      return (
        <ChoiceStep
          nav={nav}
          cat={step.cat}
          from={inv.from}
          value={answers.picks[step.cat.id]}
          onPick={(p: Pick) =>
            commit((a) => {
              const same = a.picks[step.cat.id]?.value === p.value
              const spots = { ...a.spots }
              if (!same) delete spots[step.cat.id]
              if (who === 'her' && isSurprise(p.value)) spots[step.cat.id] = { kind: 'left-to-him' }
              return { ...a, picks: { ...a.picks, [step.cat.id]: p }, spots }
            })
          }
        />
      )
    case 'spot': {
      const pick = answers.picks[step.cat.id]
      // Shouldn't happen (choice and area come first), but never strand anyone.
      if (!pick || !answers.area) return null
      return (
        <SpotStep
          nav={nav}
          cat={step.cat}
          pick={pick}
          area={answers.area}
          hood={answers.hood}
          from={inv.from}
          value={answers.spots[step.cat.id]}
          allowLeftToHim={who === 'her'}
          onDone={(s: SpotPick) => commit((a) => ({ ...a, spots: { ...a.spots, [step.cat.id]: s } }))}
        />
      )
    }
    case 'note':
      return <NoteStep nav={nav} from={inv.from} value={answers.note} onDone={(note) => commit((a) => ({ ...a, note }))} />
  }
}
