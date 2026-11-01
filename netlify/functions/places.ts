// GET /api/places?area=<areaId>&q=<what>
// Proxies Google Places API (New) Text Search so the API key stays server-side.
//
// Cost: only "Pro" fields are requested (name, address, location, Maps link, type),
// so each call bills as Text Search Pro. Adding rating/priceLevel/hours would bump
// every call to the Enterprise SKU.

import { AREA_BY_ID, isAreaId } from '../../src/lib/areas'

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.shortFormattedAddress',
  'places.formattedAddress',
  'places.location',
  'places.googleMapsUri',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
].join(',')

// Only short, plain search terms. Keeps the endpoint from being used as a free general search.
const QUERY_RE = /^[a-z0-9 &'\-]{2,40}$/i

interface GooglePlace {
  id: string
  displayName?: { text: string }
  shortFormattedAddress?: string
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  googleMapsUri?: string
  primaryTypeDisplayName?: { text: string }
  businessStatus?: string
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extra },
  })

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const url = new URL(req.url)
  const area = url.searchParams.get('area')
  const q = (url.searchParams.get('q') ?? '').trim()

  if (!isAreaId(area)) return json({ error: 'Unknown area' }, 400)
  if (!QUERY_RE.test(q)) return json({ error: 'Search must be 2–40 letters, numbers or spaces' }, 400)

  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return json({ error: 'Places search is not configured' }, 500)

  const a = AREA_BY_ID[area]
  const upstream = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${q} in ${a.queryName}`,
      locationRestriction: { rectangle: a.box },
      pageSize: 8,
    }),
  })

  if (!upstream.ok) {
    console.error('Places API error', upstream.status, await upstream.text())
    return json({ error: 'Places search is unavailable right now' }, 502)
  }

  const data = (await upstream.json()) as { places?: GooglePlace[] }
  const places = (data.places ?? [])
    .filter((p) => p.location && p.displayName && (!p.businessStatus || p.businessStatus === 'OPERATIONAL'))
    .map((p) => ({
      id: p.id,
      name: p.displayName!.text,
      address: p.shortFormattedAddress ?? p.formattedAddress ?? '',
      lat: p.location!.latitude,
      lng: p.location!.longitude,
      mapsUrl: p.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
      type: p.primaryTypeDisplayName?.text,
    }))

  // Short CDN cache so repeat searches ("tacos" in Brooklyn) don't each cost a call.
  return json({ places }, 200, { 'cache-control': 'public, max-age=0, s-maxage=3600' })
}

export const config = { path: '/api/places' }
