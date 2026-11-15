// Which screens a walkthrough shows. Her walkthrough (Her-pick invite) and his (Plan the date) share it.
import type { Answers, Category, Invite } from '../types'
import { isSurprise } from '../lib/presets'

export type Step =
  | { kind: 'area' }
  | { kind: 'hood' }
  | { kind: 'choice'; cat: Category }
  | { kind: 'spot'; cat: Category }
  | { kind: 'note' }
  | { kind: 'surprises' }

/** His walkthrough never offers Left to him ("Surprise me"): he is the one choosing. */
const forHim = (cat: Category): Category => ({ ...cat, options: cat.options.filter((o) => !isSurprise(o)) })

/**
 * The step list depends on the answers so far: her Left to him skips that question's spot step.
 * His walkthrough has no note step and ends with the Surprise switches.
 */
export function buildSteps(inv: Invite, a: Answers, who: 'her' | 'him' = 'her'): Step[] {
  const steps: Step[] = []
  if (inv.areas.length > 1) steps.push({ kind: 'area' })
  steps.push({ kind: 'hood' })
  for (const c of inv.categories) {
    const cat = who === 'him' ? forHim(c) : c
    steps.push({ kind: 'choice', cat })
    const pick = a.picks[c.id]
    if (cat.spots && !(who === 'her' && pick && isSurprise(pick.value))) steps.push({ kind: 'spot', cat })
  }
  if (who === 'him') steps.push({ kind: 'surprises' })
  else if (inv.note) steps.push({ kind: 'note' })
  return steps
}
