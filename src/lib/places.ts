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

/** Same rule the places function enforces; strip anything else from typed answers. */
const QUERY_OK = /^[a-z0-9 &'\-]{2,40}$/i
const sanitize = (s: string) => s.replace(/[^a-z0-9 &'\-]/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)

/** Ask the AI to turn a typed answer into map searches. Empty on any failure. */
async function aiQueries(area: AreaId, hood: string | undefined, category: string, text: string, signal?: AbortSignal): Promise<string[]> {
  try {
    const res = await fetch('/api/ai/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ area, hood, category, text }),
      signal,
    })
    if (!res.ok) return []
    const data = (await res.json()) as { queries?: unknown }
    return Array.isArray(data.queries) ? data.queries.filter((q): q is string => typeof q === 'string' && QUERY_OK.test(q)) : []
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return []
  }
}

/**
 * Places for her pick. A typed-in answer goes through the AI first ("something outdoorsy" → "botanical garden"),
 * then up to two searches are merged. Falls back to searching her words directly.
 */
export async function findPlaces(
  area: AreaId,
  hood: string | undefined,
  pick: { value: string; custom: boolean },
  category: string,
  signal?: AbortSignal,
): Promise<{ places: Place[]; searched: string[] }> {
  let queries = pick.custom ? await aiQueries(area, hood, category, pick.value, signal) : []
  if (queries.length === 0) {
    const plain = sanitize(pick.value)
    queries = QUERY_OK.test(plain) ? [plain] : []
  }
  if (queries.length === 0) return { places: [], searched: [] }
  const lists = await Promise.all(queries.map((q) => searchPlaces(area, q, signal, hood)))
  const seen = new Set<string>()
  const places: Place[] = []
  for (let i = 0; places.length < 8 && i < 8; i++) {
    for (const list of lists) {
      const p = list[i]
      if (p && !seen.has(p.id)) {
        seen.add(p.id)
        places.push(p)
      }
    }
  }
  return { places, searched: pick.custom ? queries : [] }
}
