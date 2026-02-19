import { useEffect, useMemo, useRef, useState } from 'react'
import { convexAction } from '@/lib/convex'
import type { MeetingPlace } from '@/hooks/useMeetingPlace'

const DEFAULT_DEBOUNCE_MS = 350
const DEFAULT_MIN_CHARS = 2
const DEFAULT_MAX_RESULTS = 8
const CACHE_TTL_MS = 45_000

interface UseMeetingPlaceSearchParams {
  sessionId: string
  userId: string | null
  enabled?: boolean
  debounceMs?: number
  minChars?: number
  maxResults?: number
}

interface UseMeetingPlaceSearchResult {
  query: string
  setQuery: (value: string) => void
  suggestions: MeetingPlace[]
  isLoading: boolean
  error: string | null
}

type CachedResult = {
  value: MeetingPlace[]
  expiresAt: number
}

export function normalizeMeetingSearchInput(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function shouldIssueMeetingSearch(normalizedQuery: string, minChars: number): boolean {
  return normalizedQuery.length >= minChars
}

export function getMeetingSearchCacheKey(normalizedQuery: string): string {
  return normalizedQuery.toLowerCase()
}

export function isMeetingSearchCacheFresh(entry: CachedResult | undefined, now: number): entry is CachedResult {
  return Boolean(entry && entry.expiresAt > now)
}

export function abortActiveMeetingSearch(controller: AbortController | null): null {
  controller?.abort()
  return null
}

export function useMeetingPlaceSearch({
  sessionId,
  userId,
  enabled = false,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  minChars = DEFAULT_MIN_CHARS,
  maxResults = DEFAULT_MAX_RESULTS,
}: UseMeetingPlaceSearchParams): UseMeetingPlaceSearchResult {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<MeetingPlace[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const cacheRef = useRef<Map<string, CachedResult>>(new Map())
  const canRun = Boolean(enabled && sessionId && userId)
  const normalizedQuery = useMemo(() => normalizeMeetingSearchInput(query), [query])

  useEffect(() => {
    if (!canRun || !userId) {
      abortRef.current = abortActiveMeetingSearch(abortRef.current)
      setSuggestions([])
      setIsLoading(false)
      setError(null)
      return
    }

    if (!shouldIssueMeetingSearch(normalizedQuery, minChars)) {
      abortRef.current = abortActiveMeetingSearch(abortRef.current)
      setSuggestions([])
      setIsLoading(false)
      setError(null)
      return
    }

    const cacheKey = getMeetingSearchCacheKey(normalizedQuery)
    const cached = cacheRef.current.get(cacheKey)
    const now = Date.now()
    if (isMeetingSearchCacheFresh(cached, now)) {
      setSuggestions(cached.value)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const timerId = window.setTimeout(() => {
      abortRef.current = abortActiveMeetingSearch(abortRef.current)
      const controller = new AbortController()
      abortRef.current = controller

      void convexAction<MeetingPlace[]>('meetingPlaces:searchSuggestions', {
        sessionId,
        userId,
        query: normalizedQuery,
        limit: maxResults,
      }, {
        maxRetries: 0,
      }, {
        signal: controller.signal,
      })
        .then((results) => {
          if (controller.signal.aborted) return
          setSuggestions(results)
          cacheRef.current.set(cacheKey, {
            value: results,
            expiresAt: Date.now() + CACHE_TTL_MS,
          })
          setError(null)
        })
        .catch((err) => {
          if (controller.signal.aborted) return
          const message = err instanceof Error ? err.message : 'Meeting place search failed'
          setError(message)
          setSuggestions([])
        })
        .finally(() => {
          if (abortRef.current === controller) {
            setIsLoading(false)
          }
        })
    }, debounceMs)

    return () => {
      window.clearTimeout(timerId)
      abortRef.current = abortActiveMeetingSearch(abortRef.current)
    }
  }, [canRun, debounceMs, maxResults, minChars, normalizedQuery, sessionId, userId])

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    error,
  }
}
