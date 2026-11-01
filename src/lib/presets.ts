import type { Draft } from '../types'
import { AREAS } from './areas'

export const DEFAULT_INTRO = 'I’d like to take you out. You pick the plan.'

/** Categories whose options can be searched as real places */
export const SPOT_CATEGORY_IDS = new Set(['food', 'activity'])

export const isSurprise = (value: string) => /surprise/i.test(value)

export function defaultDraft(): Draft {
  return {
    from: '',
    reply: { kind: 'sms', value: '' },
    to: '',
    intro: DEFAULT_INTRO,
    areas: AREAS.map((a) => a.id),
    categories: [
      {
        id: 'food',
        label: 'Food',
        question: 'First things first. What are we eating?',
        options: ['Tacos', 'Sushi', 'Pizza', 'Ramen', 'Brunch', 'Surprise me'],
        spots: true,
        on: true,
      },
      {
        id: 'activity',
        label: 'Activity',
        question: 'Then what?',
        options: ['Mini golf', 'Museum', 'Arcade bar', 'Walk the park', 'Movie', 'Karaoke'],
        spots: true,
        on: true,
      },
      {
        id: 'vibe',
        label: 'Vibe',
        question: 'Pick the vibe.',
        options: ['Chill', 'A little fancy', 'Adventurous', 'Lowkey cozy'],
        spots: false,
        on: true,
      },
      {
        id: 'when',
        label: 'When',
        question: 'When works for you?',
        options: ['Weeknight', 'Friday night', 'Saturday', 'Sunday afternoon'],
        spots: false,
        on: true,
      },
    ],
    note: true,
    theme: 'cherry',
  }
}
