import type { AreaId } from './lib/areas'
import type { Place } from './lib/places'

export type ThemeId = 'riso' | 'stationery' | 'night'
export type ReplyKind = 'sms' | 'ig' | 'none'
/** Her-pick: he offers options, she builds the Plan. His-plan: he sends a finished Plan. */
export type InviteKind = 'her-pick' | 'his-plan'

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
  /** Present only on a His-plan invite: his finished Plan */
  plan?: HisPlan
}

/** What the creator edits. Categories can be switched off without losing their options. */
export interface Draft extends Omit<Invite, 'v' | 'categories' | 'plan'> {
  categories: (Category & { on: boolean })[]
  /** Undefined until he picks a mode on his first visit */
  kind?: InviteKind
  plan?: HisPlan
}

export interface Pick {
  value: string
  custom: boolean
}

export type SpotPick =
  | { kind: 'place'; place: Place }
  | { kind: 'left-to-him' } // she left the spot to him (Left to him)
  | { kind: 'tbd' } // Places was unavailable

export interface Answers {
  area?: AreaId
  /** Neighborhood id within the area; undefined means anywhere in it */
  hood?: string
  picks: Record<string, Pick>
  spots: Record<string, SpotPick>
  note: string
}

/** His Plan. `surprises` lists question ids he keeps hidden from her (never the When question). */
export interface HisPlan extends Answers {
  surprises: string[]
}
