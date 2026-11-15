import { beforeEach, expect, test, vi } from 'vitest'
import {
  answerKey,
  herCalendarLocation,
  herPlanLines,
  herReplyMessage,
  herRows,
  isPassed,
  isValidCounter,
  loadHerAnswer,
  saveHerAnswer,
} from './hisPlan'
import { hisPlanInvite as inv } from '../test/fixtures'

const now = new Date('2026-11-15T17:00:00Z')

test('herRows hides choice and venue of a Surprise', () => {
  const rows = herRows(inv)
  expect(rows.find((r) => r.label === 'Food')).toEqual({ label: 'Food', value: 'It’s a surprise' })
  expect(rows.find((r) => r.label === 'Where')).toEqual({ label: 'Where', value: 'West Village, Manhattan' })
  expect(rows.find((r) => r.label === 'When')).toEqual({ label: 'When', value: 'Fri, Nov 20 · 7 PM' })
  expect(JSON.stringify(rows)).not.toMatch(/Via Carota|Sushi|Chill/)
})

test('herRows shows a real spot that is not a Surprise', () => {
  const open = { ...inv, plan: { ...inv.plan!, surprises: [] } }
  expect(herRows(open).find((r) => r.label === 'Food')).toEqual({
    label: 'Food',
    value: 'Via Carota',
    sub: '51 Grove St',
    link: 'https://maps.google.com/?cid=1',
  })
})

test('herPlanLines never mention a Surprise', () => {
  expect(herPlanLines(inv).join('\n')).not.toMatch(/Via Carota|Sushi|Chill/)
})

test('herReplyMessage never mentions a Surprise', () => {
  expect(herReplyMessage(inv, { kind: 'in' })).toBe('Hey Sam! I’m in for Fri, Nov 20 · 7 PM.')
  expect(herReplyMessage(inv, { kind: 'counter', when: '2026-11-19T20:00' })).toBe('Hey Sam, can we do Thu, Nov 19 · 8 PM instead?')
  expect(herReplyMessage(inv, { kind: 'decline' })).toBe('Hey Sam, not this time, but thank you for the invite.')
})

test('herCalendarLocation is the area, never a venue', () => {
  expect(herCalendarLocation(inv)).toBe('West Village, Manhattan')
})

test('isPassed', () => {
  expect(isPassed(inv, now)).toBe(false)
  expect(isPassed(inv, new Date('2026-11-21T00:30:00Z'))).toBe(true)
})

test('isValidCounter', () => {
  expect(isValidCounter(inv, '2026-11-19T20:00', now)).toBe(true)
  expect(isValidCounter(inv, '2026-11-20T19:00', now)).toBe(false) // his slot
  expect(isValidCounter(inv, '2026-11-19T21:00', now)).toBe(false) // not on his list
  expect(isValidCounter(inv, '2026-11-14T20:00', now)).toBe(false) // past
  expect(isValidCounter(inv, '2027-02-01T20:00', now)).toBe(false) // beyond 30 days
  expect(isValidCounter(inv, 'Thursday', now)).toBe(false)
})

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})

test('saved answer round-trips and rejects junk', () => {
  expect(loadHerAnswer('abc')).toBeNull()
  saveHerAnswer('abc', { kind: 'counter', when: '2026-11-19T20:00' })
  expect(loadHerAnswer('abc')).toEqual({ kind: 'counter', when: '2026-11-19T20:00' })
  localStorage.setItem(answerKey('abc'), '{"kind":"counter","when":"soon"}')
  expect(loadHerAnswer('abc')).toBeNull()
  localStorage.setItem(answerKey('abc'), 'not json')
  expect(loadHerAnswer('abc')).toBeNull()
})

test('answerKey differs per invite', () => {
  expect(answerKey('abc')).toMatch(/^pick-a-date:answer:[0-9a-f]{8}$/)
  expect(answerKey('abc')).not.toBe(answerKey('abd'))
})
