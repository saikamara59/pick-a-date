// Icons for answer options. Shapes come from Phosphor Icons (MIT) via scripts/gen-icons.mjs.
// Custom options fall back to an icon for their question.
import { isSurprise } from '../lib/presets'
import { ICONS, type IconName } from './iconPaths'

const BY_OPTION: Record<string, IconName> = {
  tacos: 'Pepper',
  sushi: 'FishSimple',
  pizza: 'Pizza',
  ramen: 'BowlSteam',
  brunch: 'Egg',
  'nice dinner': 'ForkKnife',
  steakhouse: 'Cow',
  italian: 'BowlFood',
  seafood: 'Shrimp',
  burgers: 'Hamburger',
  dessert: 'IceCream',
  'mini golf': 'Golf',
  museum: 'Bank',
  'arcade bar': 'GameController',
  'walk the park': 'Tree',
  movie: 'Popcorn',
  karaoke: 'MicrophoneStage',
  bowling: 'BowlingBall',
  'comedy show': 'MaskHappy',
  'rooftop bar': 'BuildingApartment',
  'escape room': 'LockKey',
  'ice skating': 'Snowflake',
  'pottery class': 'PaintBrush',
  chill: 'Couch',
  'a little fancy': 'Champagne',
  adventurous: 'Compass',
  'lowkey cozy': 'Coffee',
}

const BY_CATEGORY: Record<string, IconName> = { food: 'ForkKnife', activity: 'Ticket' }

export function OptionIcon({ option, category }: { option: string; category: string }) {
  const name: IconName = isSurprise(option) ? 'Gift' : (BY_OPTION[option.trim().toLowerCase()] ?? BY_CATEGORY[category] ?? 'MapPin')
  return (
    <span className="opt-icon" aria-hidden="true">
      {/* Static markup generated from the icon set, never user input. */}
      <svg width="24" height="24" viewBox="0 0 256 256" fill="currentColor" dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
    </span>
  )
}
