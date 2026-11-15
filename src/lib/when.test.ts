import { expect, test } from 'vitest'
import { buildIcs } from './when'

const event = { uid: 'u@x', title: 'Date', start: new Date('2026-11-21T00:00:00Z'), hours: 3, location: 'Here', details: '' }

test('buildIcs CANCEL with sequence', () => {
  const ics = buildIcs(event, { method: 'CANCEL', sequence: 5 })
  expect(ics).toContain('METHOD:CANCEL')
  expect(ics).toContain('SEQUENCE:5')
  expect(ics).toContain('STATUS:CANCELLED')
})

test('buildIcs default stays confirmed with no sequence', () => {
  const ics = buildIcs(event)
  expect(ics).toContain('STATUS:CONFIRMED')
  expect(ics).not.toContain('SEQUENCE')
})
