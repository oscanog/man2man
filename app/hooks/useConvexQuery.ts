/**
 * Convex HTTP Query Hooks
 * 
 * Uses public HTTP API instead of generated Convex client.
 * This mirrors how Android calls Convex via HTTP.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { convexQuery, convexMutation, subscribeConvexQuery } from '@/lib/convex'

interface QueryState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
}

/**
 * Hook for one-time Convex queries
 * Similar to Android's one-shot query
 */
export function useConvexQuery<T>(
  path: string,
  args: Record<string, unknown> = {},
  enabled: boolean = true
): QueryState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: enabled,
    error: null,
  })

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const data = await convexQuery<T>(path, args)
      setState({ data, isLoading: false, error: null })
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      })
    }
  }, [path, JSON.stringify(args), enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { ...state, refetch: fetchData }
}

/**
 * Hook for Convex mutations
 * Returns mutate function and state
 */
export function useConvexMutation<T, A extends Record<string, unknown> = Record<string, unknown>>(
  path: string
) {
  const [state, setState] = useState<{
    isLoading: boolean
    error: Error | null
  }>({
    isLoading: false,
    error: null,
  })

  const mutate = useCallback(
    async (args: A): Promise<T> => {
      setState({ isLoading: true, error: null })

      try {
        const result = await convexMutation<T>(path, args)
        setState({ isLoading: false, error: null })
        return result
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        setState({ isLoading: false, error: err })
        throw err
      }
    },
    [path]
  )

  return { mutate, ...state }
}

/**
 * Hook for subscribing to Convex queries (real-time updates)
 * Uses polling for HTTP-based updates
 */
export function useConvexSubscription<T>(
  path: string,
  args: Record<string, unknown> = {},
  interval: number = 2000
): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: true,
    error: null,
  })

  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    const cleanup = subscribeConvexQuery<T>(
      path,
      args,
      (data) => {
        setState({ data, isLoading: false, error: null })
      },
      (error) => {
        setState(prev => ({ ...prev, isLoading: false, error }))
      },
      interval
    )

    cleanupRef.current = cleanup

    return () => {
      cleanup()
      cleanupRef.current = null
    }
  }, [path, JSON.stringify(args), interval])

  return state
}
