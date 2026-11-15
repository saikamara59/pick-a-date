import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AreaId } from './areas'
import { searchPlaces, type Place } from './places'

const AREA: AreaId = 'manhattan'

const place: Place = { id: 'p1', name: 'Botanic Garden', address: '1 Main St', lat: 0, lng: 0, mapsUrl: 'https://maps.example/p1' }

/** A fetch stub that honours its signal like the real one and resolves when `release()` is called. */
function stubFetch() {
  const pending: Array<() => void> = []
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((resolve, reject) => {
      const signal = init?.signal
      const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'))
      if (signal?.aborted) return abort()
      signal?.addEventListener('abort', abort)
      pending.push(() => resolve(new Response(JSON.stringify({ places: [place] }), { status: 200 })))
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, release: () => pending.splice(0).forEach((r) => r()) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchPlaces', () => {
  it('resolves for a second caller after the first caller aborts (StrictMode double effect)', async () => {
    const { release } = stubFetch()

    // StrictMode: mount → cleanup (abort) → mount again, all in the same tick.
    const first = new AbortController()
    const firstReq = searchPlaces(AREA, 'garden-abort', first.signal)
    first.abort()
    const secondReq = searchPlaces(AREA, 'garden-abort', new AbortController().signal)

    await expect(firstReq).rejects.toMatchObject({ name: 'AbortError' })
    release()
    await expect(secondReq).resolves.toEqual([place])
  })

  it('shares one request between concurrent callers', async () => {
    const { fetchMock, release } = stubFetch()

    const a = searchPlaces(AREA, 'garden-share', new AbortController().signal)
    const b = searchPlaces(AREA, 'garden-share', new AbortController().signal)
    release()

    await expect(a).resolves.toEqual([place])
    await expect(b).resolves.toEqual([place])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects with AbortError for a caller whose signal is already aborted', async () => {
    stubFetch()
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(searchPlaces(AREA, 'garden-pre', ctrl.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})
