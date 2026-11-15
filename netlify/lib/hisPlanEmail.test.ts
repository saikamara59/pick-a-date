import { expect, test } from 'vitest'
import { cleanResponse, hisPlanHeadline, hisPlanRows, hisPlanSubject } from './hisPlanEmail'
import { hisPlanInvite } from '../../src/test/fixtures'
import { isHisPlan } from '../../src/lib/codec'

const inv = hisPlanInvite as typeof hisPlanInvite & { plan: NonNullable<typeof hisPlanInvite.plan> }
const now = new Date('2026-11-15T17:00:00Z')

test('subjects for each answer', () => {
  expect(hisPlanSubject(inv, { kind: 'in' }, false)).toBe('Maya’s in · Fri, Nov 20 · 7 PM')
  expect(hisPlanSubject(inv, { kind: 'counter', when: '2026-11-19T20:00' }, false)).toBe('Maya can’t do Fri. How about Thu, Nov 19 · 8 PM?')
  expect(hisPlanSubject(inv, { kind: 'decline' }, false)).toBe('Maya can’t make it this time')
  expect(hisPlanSubject(inv, { kind: 'decline' }, true)).toBe('Update: Maya can’t make it this time')
})

test('counter headline tells him to text her', () => {
  expect(hisPlanHeadline(inv, { kind: 'counter', when: '2026-11-19T20:00' })).toBe('Maya can’t do Fri. How about Thu, Nov 19 · 8 PM? Text her to lock it in.')
  expect(hisPlanHeadline(inv, { kind: 'in' })).toBe('Maya’s in for Fri, Nov 20 · 7 PM.')
})

test('notify rejects a bad counter', () => {
  expect(cleanResponse(inv, { kind: 'counter', when: '2026-11-20T19:00' }, now)).toBeNull()
  expect(cleanResponse(inv, { kind: 'counter', when: '2026-11-19T20:00' }, now)).toEqual({ kind: 'counter', when: '2026-11-19T20:00' })
  expect(cleanResponse(inv, { kind: 'maybe' }, now)).toBeNull()
  expect(cleanResponse(inv, { kind: 'in', extra: 1 }, now)).toEqual({ kind: 'in' })
})

test('his-plan email ignores body answers: rows come from his Plan, Surprises shown to him', () => {
  expect(isHisPlan(inv)).toBe(true)
  const rows = hisPlanRows(inv)
  expect(rows.find((r) => r.label === 'Food')).toMatchObject({ value: 'Via Carota', sub: '51 Grove St · Surprise for her' })
  expect(rows.find((r) => r.label === 'Vibe')).toMatchObject({ value: 'Chill', sub: 'Surprise for her' })
})
