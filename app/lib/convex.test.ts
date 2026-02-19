import { afterEach, describe, expect, it, vi } from 'vitest'
import { convexAction } from './convex'

describe('convexAction', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts to the Convex action endpoint and returns value', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        status: 'success',
        value: { ok: true },
      }), { status: 200 })
    )

    const result = await convexAction<{ ok: boolean }>('routes:recomputeFastestRoad', {
      sessionId: 'abc123',
      userId: 'user123',
    })

    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/api/action')
    expect(init?.method).toBe('POST')
  })
})
