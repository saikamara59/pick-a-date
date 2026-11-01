// Areas a date can happen in. Shared by the app and the Netlify function.
// Boxes are approximate bounding rectangles used to restrict Google Places results.

export type AreaId = 'manhattan' | 'brooklyn' | 'staten-island' | 'jersey-city-hoboken'

export interface Area {
  id: AreaId
  label: string
  /** Initials for the round bullet */
  short: string
  /** Neighborhood hint shown under the area name */
  hint: string
  /** How the area reads inside a search query, e.g. "tacos in Brooklyn, NY" */
  queryName: string
  box: { low: { latitude: number; longitude: number }; high: { latitude: number; longitude: number } }
}

export const AREAS: Area[] = [
  {
    id: 'manhattan',
    short: 'M',
    label: 'Manhattan',
    hint: 'West Village · LES · Harlem',
    queryName: 'Manhattan, NY',
    box: { low: { latitude: 40.7, longitude: -74.02 }, high: { latitude: 40.882, longitude: -73.907 } },
  },
  {
    id: 'brooklyn',
    short: 'BK',
    label: 'Brooklyn',
    hint: 'Williamsburg · Bushwick · Park Slope',
    queryName: 'Brooklyn, NY',
    box: { low: { latitude: 40.57, longitude: -74.042 }, high: { latitude: 40.739, longitude: -73.833 } },
  },
  {
    id: 'staten-island',
    short: 'SI',
    label: 'Staten Island',
    hint: 'St. George · Stapleton',
    queryName: 'Staten Island, NY',
    box: { low: { latitude: 40.496, longitude: -74.256 }, high: { latitude: 40.648, longitude: -74.052 } },
  },
  {
    id: 'jersey-city-hoboken',
    short: 'JC',
    label: 'Jersey City & Hoboken',
    hint: 'Grove St · Downtown JC · Washington St',
    queryName: 'Jersey City or Hoboken, NJ',
    box: { low: { latitude: 40.661, longitude: -74.115 }, high: { latitude: 40.769, longitude: -74.02 } },
  },
]

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, Area>

export function isAreaId(v: unknown): v is AreaId {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(AREA_BY_ID, v)
}
