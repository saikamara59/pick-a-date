// Client for the /api/places Netlify function. The Google key never reaches the browser.
import type { AreaId } from './areas'

export interface Place {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  mapsUrl: string
  type?: string
}

export interface PlacesResult {
  places: Place[]
}

/** Google requires this attribution wherever Places results are shown without a Google map. */
export const PLACES_ATTRIBUTION = 'Places data from Google Maps'

const cache = new Map<string, Promise<Place[]>>()

export function searchPlaces(area: AreaId, query: string, signal?: AbortSignal, hood?: string): Promise<Place[]> {
  const q = query.trim().toLowerCase()
  const key = `${area}|${hood ?? ''}|${q}`
  const hit = cache.get(key)
  if (hit) return hit

  const req = fetch(`/api/places?area=${encodeURIComponent(area)}${hood ? `&hood=${encodeURIComponent(hood)}` : ''}&q=${encodeURIComponent(q)}`, { signal })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Places search failed (${res.status})`)
      const data = (await res.json()) as PlacesResult
      return data.places
    })
    .catch((err) => {
      cache.delete(key)
      throw err
    })

  cache.set(key, req)
  return req
}
