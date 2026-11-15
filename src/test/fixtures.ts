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
