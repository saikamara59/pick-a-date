import type { Draft } from '../types'
import { AREAS } from './areas'

export const DEFAULT_INTRO = 'I’d like to take you out. You pick the plan.'

/** Categories whose options can be searched as real places */
export const SPOT_CATEGORY_IDS = new Set(['food', 'activity'])

export const isSurprise = (value: string) => /surprise/i.test(value)

/** One-liners shown after the dotted leader on the menu. Options without one just show the leader. */
const NOTES: Record<string, string> = {
  tacos: 'messy, worth it',
  sushi: 'a little fancy',
  pizza: 'never wrong',
  ramen: 'cozy',
  brunch: 'daytime date',
  'nice dinner': 'dress up a bit',
  steakhouse: 'going all out',
  italian: 'pasta, candles',
  seafood: 'oysters, maybe',
  burgers: 'easy and good',
  dessert: 'just dessert',
  'mini golf': 'a little competitive',
  museum: 'look smart',
  'arcade bar': 'bring quarters',
  'walk the park': 'just talk',
  movie: 'snacks required',
  karaoke: 'no judging',
  bowling: 'bumpers optional',
  'comedy show': 'laugh together',
  'rooftop bar': 'city views',
  'escape room': 'teamwork test',
  'ice skating': 'hold hands, for balance',
  'pottery class': 'make a mess',
  chill: 'nothing to prove',
  'a little fancy': 'dress up',
  adventurous: 'something new',
  'lowkey cozy': 'soft and slow',
  weeknight: 'after work',
  'friday night': 'start the weekend',
  saturday: 'whole day open',
  'sunday afternoon': 'slow day',
}

export function optionNote(option: string, from: string): string | undefined {
  if (isSurprise(option)) return `trust ${from}`
  return NOTES[option.trim().toLowerCase()]
}

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
        options: [
          'Tacos',
          'Sushi',
          'Pizza',
          'Ramen',
          'Brunch',
          'Nice dinner',
          'Steakhouse',
          'Italian',
          'Seafood',
          'Burgers',
          'Dessert',
          'Surprise me',
        ],
        spots: true,
        on: true,
      },
      {
        id: 'activity',
        label: 'Activity',
        question: 'Then what?',
        options: [
          'Mini golf',
          'Museum',
          'Arcade bar',
          'Walk the park',
          'Movie',
          'Karaoke',
          'Bowling',
          'Comedy show',
          'Rooftop bar',
          'Escape room',
          'Ice skating',
          'Pottery class',
        ],
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
    theme: 'riso',
  }
}
