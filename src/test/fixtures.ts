// Shared test data. Plan dates are in late Nov 2026; tests pass an explicit `now`.
import type { Category, Invite } from '../types'

export const CATS: Category[] = [
  { id: 'food', label: 'Food', question: 'Eat?', options: ['Sushi', 'Tacos', 'Surprise me'], spots: true },
  { id: 'vibe', label: 'Vibe', question: 'Vibe?', options: ['Chill', 'Fancy'], spots: false },
  { id: 'when', label: 'When', question: 'When?', options: ['7 PM', '8 PM'], spots: false, kind: 'when' },
]

export const herPickInvite: Invite = {
  v: 1,
  to: 'Maya',
  from: 'Sam',
  reply: { kind: 'sms', value: '+13475550142' },
  intro: 'Hi',
  areas: ['manhattan', 'brooklyn'],
  categories: CATS,
  note: false,
  theme: 'riso',
}

export const viaCarota = {
  id: 'p1',
  name: 'Via Carota',
  address: '51 Grove St',
  lat: 40.733,
  lng: -74.004,
  mapsUrl: 'https://maps.google.com/?cid=1',
}

/** His Plan: Via Carota (a Surprise), Chill (a Surprise), Fri Nov 20 2026 at 7 PM, West Village. */
export const hisPlan = {
  area: 'manhattan' as const,
  hood: 'west-village',
  picks: {
    food: { value: 'Sushi', custom: false },
    vibe: { value: 'Chill', custom: false },
    when: { value: '2026-11-20T19:00', custom: false },
  },
  spots: { food: { kind: 'place' as const, place: viaCarota } },
  note: '',
  surprises: ['food', 'vibe'],
}

export const hisPlanInvite: Invite = { ...herPickInvite, plan: hisPlan }
