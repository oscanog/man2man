import { describe, expect, it } from 'vitest'
import {
  abortActiveMeetingSearch,
  getMeetingSearchCacheKey,
  isMeetingSearchCacheFresh,
  normalizeMeetingSearchInput,
  shouldIssueMeetingSearch,
} from '@/hooks/useMeetingPlaceSearch'

describe('useMeetingPlaceSearch helpers', () => {
  it('normalizes query text and derives stable cache keys', () => {
    const normalized = normalizeMeetingSearchInput('  Central   Park  ')
    expect(normalized).toBe('Central Park')
    expect(getMeetingSearchCacheKey(normalized)).toBe('central park')
  })

  it('applies minimum-character gating used by debounced search', () => {
    expect(shouldIssueMeetingSearch('a', 2)).toBe(false)
    expect(shouldIssueMeetingSearch('ab', 2)).toBe(true)
  })

  it('reports cache freshness correctly', () => {
    const now = Date.now()
    expect(isMeetingSearchCacheFresh(undefined, now)).toBe(false)
    expect(isMeetingSearchCacheFresh({ value: [], expiresAt: now - 1 }, now)).toBe(false)
    expect(isMeetingSearchCacheFresh({ value: [], expiresAt: now + 10_000 }, now)).toBe(true)
  })

  it('aborts in-flight requests before issuing the next one', () => {
    const controller = new AbortController()
    expect(controller.signal.aborted).toBe(false)
    const result = abortActiveMeetingSearch(controller)
    expect(result).toBeNull()
    expect(controller.signal.aborted).toBe(true)
  })
})
