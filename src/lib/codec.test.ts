import { expect, test } from 'vitest'
import { cleanHisPlan, decodeInvite, draftToInvite, encodeInvite, isHisPlan, planWhen } from './codec'
import type { Draft } from '../types'
import { CATS, herPickInvite, hisPlan, hisPlanInvite } from '../test/fixtures'

const { plan: _p, ...base } = hisPlanInvite

const hisDraft = (over: Partial<Draft> = {}): Draft => ({
  ...base,
  categories: CATS.map((c) => ({ ...c, on: true })),
  kind: 'his-plan',
  plan: hisPlan,
  ...over,
})

test('round-trips a His-plan invite', () => {
  const back = decodeInvite(encodeInvite(hisPlanInvite))!
  expect(isHisPlan(back)).toBe(true)
  expect(back.plan).toEqual(hisPlan)
  expect(planWhen(back)).toBe('2026-11-20T19:00')
})

test('decodes a pre-change Her-pick link unchanged', () => {
  const back = decodeInvite(encodeInvite(herPickInvite))!
  expect(back).toEqual(herPickInvite)
  expect(isHisPlan(back)).toBe(false)
})

test('rejects a His-plan link without a valid when', () => {
  const noWhen = { ...hisPlanInvite, plan: { ...hisPlan, picks: { food: { value: 'Sushi', custom: false } } } }
  expect(decodeInvite(encodeInvite(noWhen))).toBeNull()
})

test('rejects a His-plan when that is not one of his times', () => {
  const odd = { ...hisPlanInvite, plan: { ...hisPlan, picks: { ...hisPlan.picks, when: { value: '2026-11-20T21:00', custom: false } } } }
  expect(decodeInvite(encodeInvite(odd))).toBeNull()
})

test('strips the When category and unknown ids from surprises', () => {
  expect(cleanHisPlan(base, { ...hisPlan, surprises: ['when', 'nope', 'vibe'] })!.surprises).toEqual(['vibe'])
})

test('draftToInvite drops plan parts the setup no longer allows', () => {
  const vibeOff = hisDraft({ categories: CATS.map((c) => ({ ...c, on: c.id !== 'vibe' })) })
  const p = draftToInvite(vibeOff).plan!
  expect(p.picks.vibe).toBeUndefined()
  expect(p.surprises).toEqual(['food'])

  const noSeven = hisDraft({ categories: CATS.map((c) => ({ ...c, on: true, options: c.kind === 'when' ? ['8 PM'] : c.options })) })
  expect(draftToInvite(noSeven).plan).toBeUndefined()

  expect(draftToInvite(hisDraft({ areas: ['brooklyn'] })).plan).toBeUndefined()
})

test('draftToInvite ignores plan in her-pick mode', () => {
  expect(draftToInvite(hisDraft({ kind: 'her-pick' })).plan).toBeUndefined()
})
