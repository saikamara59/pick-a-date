import type { AreaId } from './lib/areas'
import type { Place } from './lib/places'

export type ThemeId = 'riso' | 'stationery' | 'night'
export type ReplyKind = 'sms' | 'ig' | 'none'

export interface Category {
  id: string
  label: string
  question: string
  options: string[]
  /** After she picks an option, let her choose a real place for it */
  spots: boolean
  /** 'when' = she picks a real day (next 2 weeks) and one of the options as a time */
  kind?: 'when'
}

/** Everything an invite link carries. Lives entirely in the URL. */
export interface Invite {
  v: 1
  to: string
  from: string
  reply: { kind: ReplyKind; value: string }
  intro: string
  areas: AreaId[]
  categories: Category[]
  note: boolean
  theme: ThemeId
  /** His verified email; sig is the server's signature over it, so the link can't be pointed elsewhere */
  notify?: { email: string; sig: string }
}

/** What the creator edits. Categories can be switched off without losing their options. */
export interface Draft extends Omit<Invite, 'v' | 'categories'> {
  categories: (Category & { on: boolean })[]
}

export interface Pick {
  value: string
  custom: boolean
}

export type SpotPick =
  | { kind: 'place'; place: Place }
  | { kind: 'surprise' } // he picks the spot
  | { kind: 'tbd' } // Places was unavailable

export interface Answers {
  area?: AreaId
  picks: Record<string, Pick>
  spots: Record<string, SpotPick>
  note: string
}
