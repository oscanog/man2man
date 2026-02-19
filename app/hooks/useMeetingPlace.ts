import { useCallback, useEffect, useMemo, useState } from 'react'
import { convexMutation, convexQuery } from '@/lib/convex'

const DEFAULT_POLL_MS = 2500

export type MeetingPlaceStatus = 'none' | 'set' | 'removal_requested'

export interface MeetingPlace {
  name: string
  lat: number
  lng: number
  address?: string
  providerPlaceId?: string
}

export interface MeetingPlaceState {
  status: MeetingPlaceStatus
  place: MeetingPlace | null
  setByUserId: string | null
  setByUsername: string | null
  removalRequestedBy: string | null
  removalRequestedByUsername: string | null
  updatedAt: number | null
  removalRequestExpiresAt: number | null
}

interface UseMeetingPlaceParams {
  sessionId: string
  userId: string | null
  enabled?: boolean
  pollMs?: number
}

interface UseMeetingPlaceResult {
  meetingPlace: MeetingPlaceState | null
  isLoading: boolean
  isMutating: boolean
  error: string | null
  refetch: () => Promise<void>
  setMeetingPlace: (place: MeetingPlace) => Promise<void>
  requestRemoval: () => Promise<void>
  respondRemoval: (accept: boolean) => Promise<void>
}

export function useMeetingPlace({
  sessionId,
  userId,
  enabled = false,
  pollMs = DEFAULT_POLL_MS,
}: UseMeetingPlaceParams): UseMeetingPlaceResult {
  const [meetingPlace, setMeetingPlaceState] = useState<MeetingPlaceState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canRun = Boolean(enabled && sessionId && userId)

  const refetch = useCallback(async () => {
    if (!canRun || !userId) {
      setMeetingPlaceState(null)
      return
    }

    const data = await convexQuery<MeetingPlaceState>('meetingPlaces:getForSession', {
      sessionId,
      userId,
    }, {
      maxRetries: 1,
    })
    setMeetingPlaceState(data)
    setError(null)
  }, [canRun, sessionId, userId])

  useEffect(() => {
    if (!canRun) {
      setMeetingPlaceState(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let isActive = true
    setIsLoading(true)
    void refetch()
      .catch((err) => {
        if (!isActive) return
        setError(err instanceof Error ? err.message : 'Failed to fetch meeting place')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    const intervalId = window.setInterval(() => {
      void refetch().catch((err) => {
        if (!isActive) return
        setError(err instanceof Error ? err.message : 'Failed to refresh meeting place')
      })
    }, pollMs)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [canRun, pollMs, refetch])

  const runMutation = useCallback(async (mutationName: string, args: Record<string, unknown>) => {
    if (!canRun || !userId) return

    setIsMutating(true)
    try {
      await convexMutation(mutationName, args, { maxRetries: 0 })
      await refetch()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Meeting place action failed'
      setError(message)
      throw err
    } finally {
      setIsMutating(false)
    }
  }, [canRun, refetch, userId])

  const setMeetingPlace = useCallback(async (place: MeetingPlace) => {
    if (!userId) return
    await runMutation('meetingPlaces:setMeetingPlace', {
      sessionId,
      userId,
      place,
    })
  }, [runMutation, sessionId, userId])

  const requestRemoval = useCallback(async () => {
    if (!userId) return
    await runMutation('meetingPlaces:requestRemoval', {
      sessionId,
      userId,
    })
  }, [runMutation, sessionId, userId])

  const respondRemoval = useCallback(async (accept: boolean) => {
    if (!userId) return
    await runMutation('meetingPlaces:respondRemoval', {
      sessionId,
      userId,
      accept,
    })
  }, [runMutation, sessionId, userId])

  return useMemo(() => ({
    meetingPlace,
    isLoading,
    isMutating,
    error,
    refetch,
    setMeetingPlace,
    requestRemoval,
    respondRemoval,
  }), [error, isLoading, isMutating, meetingPlace, refetch, requestRemoval, respondRemoval, setMeetingPlace])
}
