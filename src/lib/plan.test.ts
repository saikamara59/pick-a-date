import { expect, test } from 'vitest'
import { cleanPlan } from './plan'
import { herPickInvite as inv, viaCarota } from '../test/fixtures'

test('keeps valid picks, spots, area and hood', () => {
  const a = cleanPlan(inv, {
    area: 'manhattan',
    hood: 'west-village',
    picks: { food: { value: 'Sushi', custom: false }, when: { value: '2026-11-20T19:00' } },
    spots: { food: { kind: 'place', place: viaCarota } },
    note: ' hi ',
  })
  expect(a).toEqual({
    area: 'manhattan',
    hood: 'west-village',
    picks: { food: { value: 'Sushi', custom: false }, when: { value: '2026-11-20T19:00', custom: false } },
    spots: { food: { kind: 'place', place: viaCarota } },
    note: 'hi',
  })
})

test('drops picks for unknown categories and bad when values', () => {
  expect(cleanPlan(inv, { picks: { nope: { value: 'x' }, when: { value: 'Friday' } } }).picks).toEqual({})
})

test('blanks a non-Google maps URL', () => {
  const a = cleanPlan(inv, {
    picks: { food: { value: 'Sushi' } },
    spots: { food: { kind: 'place', place: { name: 'X', mapsUrl: 'https://evil.example/' } } },
  })
  expect(a.spots.food).toMatchObject({ kind: 'place', place: { mapsUrl: '' } })
})

test('reads legacy surprise spots as left-to-him', () => {
  const a = cleanPlan(inv, { picks: { food: { value: 'Surprise me' } }, spots: { food: { kind: 'surprise' } } })
  expect(a.spots.food).toEqual({ kind: 'left-to-him' })
})

test('drops a hood that is not in the area', () => {
  expect(cleanPlan(inv, { area: 'manhattan', hood: 'williamsburg', picks: {} }).hood).toBeUndefined()
})
