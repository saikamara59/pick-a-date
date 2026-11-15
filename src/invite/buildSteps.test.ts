import { expect, test } from 'vitest'
import { buildSteps } from './steps'
import { herPickInvite } from '../test/fixtures'

const empty = { picks: {}, spots: {}, note: '' }
const inv = { ...herPickInvite, note: true }

test('her: area, hood, each question with its spot, then note (unchanged)', () => {
  expect(buildSteps(inv, empty).map((s) => s.kind + ('cat' in s ? `:${s.cat.id}` : ''))).toEqual([
    'area', 'hood', 'choice:food', 'spot:food', 'choice:vibe', 'choice:when', 'note',
  ])
  expect(buildSteps(inv, empty)).toEqual(buildSteps(inv, empty, 'her'))
})

test('her: Left to him skips the spot step', () => {
  const a = { ...empty, picks: { food: { value: 'Surprise me', custom: false } } }
  expect(buildSteps(inv, a).map((s) => s.kind)).not.toContain('spot')
})

test('him: no note step, ends with surprises', () => {
  const kinds = buildSteps(inv, empty, 'him').map((s) => s.kind)
  expect(kinds).not.toContain('note')
  expect(kinds.at(-1)).toBe('surprises')
})

test('him: Left to him options removed from choices', () => {
  const food = buildSteps(inv, empty, 'him').find((s) => s.kind === 'choice' && s.cat.id === 'food')
  expect(food && 'cat' in food ? food.cat.options : []).toEqual(['Sushi', 'Tacos'])
})
