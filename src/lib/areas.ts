// Areas a date can happen in. Shared by the app and the Netlify function.
// Boxes are approximate bounding rectangles used to restrict Google Places results.

export type AreaId = 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten-island' | 'jersey-city-hoboken'

export interface Hood {
  id: string
  label: string
  lat: number
  lng: number
}

export interface Area {
  id: AreaId
  /** Neighborhoods she can narrow down to; searched in a small box around each center */
  hoods: Hood[]
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
    hoods: [
      { id: 'times-square', label: 'Times Square', lat: 40.758, lng: -73.9855 },
      { id: 'chelsea', label: 'Chelsea', lat: 40.7465, lng: -74.0014 },
      { id: 'west-village', label: 'West Village', lat: 40.7358, lng: -74.0036 },
      { id: 'east-village', label: 'East Village', lat: 40.7265, lng: -73.9815 },
      { id: 'les', label: 'Lower East Side', lat: 40.715, lng: -73.9843 },
      { id: 'soho', label: 'SoHo', lat: 40.7233, lng: -74.003 },
      { id: 'fidi', label: 'Financial District', lat: 40.7075, lng: -74.0113 },
      { id: 'uws', label: 'Upper West Side', lat: 40.787, lng: -73.9754 },
      { id: 'ues', label: 'Upper East Side', lat: 40.7736, lng: -73.9566 },
      { id: 'harlem', label: 'Harlem', lat: 40.8116, lng: -73.9465 },
      { id: 'washington-heights', label: 'Washington Heights', lat: 40.8417, lng: -73.9394 },
    ],
    short: 'M',
    label: 'Manhattan',
    hint: 'West Village · LES · Harlem',
    queryName: 'Manhattan, NY',
    box: { low: { latitude: 40.7, longitude: -74.02 }, high: { latitude: 40.882, longitude: -73.907 } },
  },
  {
    id: 'brooklyn',
    hoods: [
      { id: 'williamsburg', label: 'Williamsburg', lat: 40.7081, lng: -73.9571 },
      { id: 'greenpoint', label: 'Greenpoint', lat: 40.7305, lng: -73.9515 },
      { id: 'bushwick', label: 'Bushwick', lat: 40.6944, lng: -73.9213 },
      { id: 'dumbo', label: 'DUMBO', lat: 40.7033, lng: -73.9881 },
      { id: 'fort-greene', label: 'Fort Greene', lat: 40.6892, lng: -73.9742 },
      { id: 'park-slope', label: 'Park Slope', lat: 40.671, lng: -73.9814 },
      { id: 'prospect-heights', label: 'Prospect Heights', lat: 40.6775, lng: -73.9692 },
      { id: 'crown-heights', label: 'Crown Heights', lat: 40.6694, lng: -73.9422 },
      { id: 'bed-stuy', label: 'Bed-Stuy', lat: 40.6872, lng: -73.9418 },
      { id: 'bay-ridge', label: 'Bay Ridge', lat: 40.6264, lng: -74.0299 },
      { id: 'coney-island', label: 'Coney Island', lat: 40.5755, lng: -73.9707 },
    ],
    short: 'BK',
    label: 'Brooklyn',
    hint: 'Williamsburg · Bushwick · Park Slope',
    queryName: 'Brooklyn, NY',
    box: { low: { latitude: 40.57, longitude: -74.042 }, high: { latitude: 40.739, longitude: -73.833 } },
  },
  {
    id: 'queens',
    hoods: [
      { id: 'astoria', label: 'Astoria', lat: 40.7644, lng: -73.9235 },
      { id: 'lic', label: 'Long Island City', lat: 40.7447, lng: -73.9485 },
      { id: 'sunnyside', label: 'Sunnyside', lat: 40.7433, lng: -73.9196 },
      { id: 'jackson-heights', label: 'Jackson Heights', lat: 40.7557, lng: -73.8831 },
      { id: 'flushing', label: 'Flushing', lat: 40.758, lng: -73.8303 },
      { id: 'forest-hills', label: 'Forest Hills', lat: 40.7181, lng: -73.8448 },
      { id: 'ridgewood', label: 'Ridgewood', lat: 40.7043, lng: -73.9018 },
      { id: 'rockaway', label: 'Rockaway Beach', lat: 40.586, lng: -73.811 },
    ],
    short: 'Q',
    label: 'Queens',
    hint: 'Astoria · LIC · Flushing',
    queryName: 'Queens, NY',
    box: { low: { latitude: 40.541, longitude: -73.962 }, high: { latitude: 40.801, longitude: -73.7 } },
  },
  {
    id: 'bronx',
    hoods: [
      { id: 'arthur-ave', label: 'Arthur Ave', lat: 40.855, lng: -73.888 },
      { id: 'mott-haven', label: 'Mott Haven', lat: 40.8091, lng: -73.9229 },
      { id: 'yankee-stadium', label: 'Yankee Stadium area', lat: 40.8296, lng: -73.9262 },
      { id: 'riverdale', label: 'Riverdale', lat: 40.89, lng: -73.912 },
      { id: 'city-island', label: 'City Island', lat: 40.8468, lng: -73.7868 },
    ],
    short: 'BX',
    label: 'The Bronx',
    hint: 'Arthur Ave · City Island · Mott Haven',
    queryName: 'Bronx, NY',
    box: { low: { latitude: 40.785, longitude: -73.933 }, high: { latitude: 40.917, longitude: -73.765 } },
  },
  {
    id: 'staten-island',
    hoods: [
      { id: 'st-george', label: 'St. George', lat: 40.6437, lng: -74.0739 },
      { id: 'stapleton', label: 'Stapleton', lat: 40.627, lng: -74.0776 },
      { id: 'new-dorp', label: 'New Dorp', lat: 40.573, lng: -74.1166 },
      { id: 'great-kills', label: 'Great Kills', lat: 40.5543, lng: -74.1516 },
      { id: 'tottenville', label: 'Tottenville', lat: 40.5083, lng: -74.2393 },
    ],
    short: 'SI',
    label: 'Staten Island',
    hint: 'St. George · Stapleton',
    queryName: 'Staten Island, NY',
    box: { low: { latitude: 40.496, longitude: -74.256 }, high: { latitude: 40.648, longitude: -74.052 } },
  },
  {
    id: 'jersey-city-hoboken',
    hoods: [
      { id: 'downtown-jc', label: 'Downtown JC', lat: 40.7194, lng: -74.0429 },
      { id: 'newport', label: 'Newport', lat: 40.7273, lng: -74.034 },
      { id: 'journal-square', label: 'Journal Square', lat: 40.7329, lng: -74.0627 },
      { id: 'jc-heights', label: 'JC Heights', lat: 40.7495, lng: -74.0475 },
      { id: 'hoboken', label: 'Hoboken', lat: 40.744, lng: -74.03 },
    ],
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

export const hoodOf = (area: AreaId, hood?: string): Hood | undefined =>
  hood ? AREA_BY_ID[area].hoods.find((h) => h.id === hood) : undefined

/** About 1.5 km around a neighborhood's center, as a Places search rectangle. */
export function hoodBox(h: Hood) {
  const dLat = 0.014
  const dLng = 0.018
  return {
    low: { latitude: h.lat - dLat, longitude: h.lng - dLng },
    high: { latitude: h.lat + dLat, longitude: h.lng + dLng },
  }
}

/** "Times Square, Manhattan" or just "Manhattan" */
export const placeLabel = (area: AreaId, hood?: string) => {
  const h = hoodOf(area, hood)
  return h ? `${h.label}, ${AREA_BY_ID[area].label}` : AREA_BY_ID[area].label
}
