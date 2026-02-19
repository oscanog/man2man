import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { convexAction, convexQuery } from '@/lib/convex'
import type { Location, RoutePath, RoutePoint, RouteStatus } from '@/components/map/types'

const DEFAULT_POLL_MS = 3000
const MIN_RECOMPUTE_INTERVAL_MS = 12_000
const MOVEMENT_TRIGGER_METERS = 25
const MOVING_STATE_THRESHOLD_METERS = 3
const MOVING_HOLD_MS = 10_000

interface LiveRouteHookParams {
  sessionId: string
  userId: string | null
  myLocation: Location | null
  partnerLocation: Location | null
  isPartnerConnected: boolean
  enabled?: boolean
  pollMs?: number
}

interface RouteSnapshotResponse {
  status: RouteStatus
  provider: 'tomtom'
  polyline?: RoutePoint[]
  distanceMeters?: number
  durationSeconds?: number
  trafficDurationSeconds?: number
  computedAt: number
  expiresAt: number
  ageMs: number
  isFresh: boolean
  lastError?: string
}

interface RecomputeResponse {
  status: 'updated' | 'skipped' | 'fallback'
}

interface LiveRouteResult {
  routePath: RoutePath | null
  isLoading: boolean
  error: string | null
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function haversineMeters(a: Location, b: Location): number {
  const earthRadius = 6371e3
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
  return earthRadius * c
}

function hasMovedEnough(prev: Location | null, next: Location | null, thresholdMeters: number): boolean {
  if (!prev || !next) return false
  return haversineMeters(prev, next) >= thresholdMeters
}

export function useLiveRoute({
  sessionId,
  userId,
  myLocation,
  partnerLocation,
  isPartnerConnected,
  enabled = false,
  pollMs = DEFAULT_POLL_MS,
}: LiveRouteHookParams): LiveRouteResult {
  const [routePath, setRoutePath] = useState<RoutePath | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUsersMoving, setIsUsersMoving] = useState(false)

  const recomputeInFlightRef = useRef(false)
  const lastRecomputeAtRef = useRef(0)
  const lastTriggerMyRef = useRef<Location | null>(null)
  const lastTriggerPartnerRef = useRef<Location | null>(null)
  const lastMoveAtRef = useRef(0)
  const prevMyRef = useRef<Location | null>(null)
  const prevPartnerRef = useRef<Location | null>(null)

  const canRun = Boolean(enabled && sessionId && userId)
  const shouldTrackRoute = Boolean(canRun && isPartnerConnected && myLocation && partnerLocation)

  const fetchRoute = useCallback(async () => {
    if (!canRun || !userId) {
      setRoutePath(null)
      return
    }

    try {
      const snapshot = await convexQuery<RouteSnapshotResponse | null>('routes:getForSession', {
        sessionId,
        userId,
      }, {
        maxRetries: 1,
      })

      if (!snapshot) {
        setRoutePath(null)
        return
      }

      setRoutePath({
        status: snapshot.status,
        provider: snapshot.provider,
        points: snapshot.polyline ?? [],
        distanceMeters: snapshot.distanceMeters ?? null,
        durationSeconds: snapshot.durationSeconds ?? null,
        trafficDurationSeconds: snapshot.trafficDurationSeconds ?? null,
        computedAt: snapshot.computedAt,
        expiresAt: snapshot.expiresAt,
        ageMs: snapshot.ageMs,
        isFresh: snapshot.isFresh,
        isUsersMoving,
        lastError: snapshot.lastError,
      })
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch live route'
      setError(message)
    }
  }, [canRun, isUsersMoving, sessionId, userId])

  useEffect(() => {
    if (!canRun) {
      setRoutePath(null)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    void fetchRoute().finally(() => {
      setIsLoading(false)
    })

    const intervalId = window.setInterval(() => {
      void fetchRoute()
    }, pollMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [canRun, fetchRoute, pollMs])

  useEffect(() => {
    if (!myLocation || !partnerLocation) {
      setIsUsersMoving(false)
      prevMyRef.current = myLocation
      prevPartnerRef.current = partnerLocation
      return
    }

    const moved =
      hasMovedEnough(prevMyRef.current, myLocation, MOVING_STATE_THRESHOLD_METERS) ||
      hasMovedEnough(prevPartnerRef.current, partnerLocation, MOVING_STATE_THRESHOLD_METERS)
    const now = Date.now()

    if (moved) {
      lastMoveAtRef.current = now
      setIsUsersMoving(true)
    } else if (now - lastMoveAtRef.current > MOVING_HOLD_MS) {
      setIsUsersMoving(false)
    }

    prevMyRef.current = myLocation
    prevPartnerRef.current = partnerLocation
  }, [myLocation, partnerLocation])

  useEffect(() => {
    if (!shouldTrackRoute || !userId || !myLocation || !partnerLocation) {
      return
    }

    const now = Date.now()
    if (recomputeInFlightRef.current) return

    const sinceLast = now - lastRecomputeAtRef.current
    const movedEnough =
      hasMovedEnough(lastTriggerMyRef.current, myLocation, MOVEMENT_TRIGGER_METERS) ||
      hasMovedEnough(lastTriggerPartnerRef.current, partnerLocation, MOVEMENT_TRIGGER_METERS)
    const reachedCadence = sinceLast >= MIN_RECOMPUTE_INTERVAL_MS

    if (!movedEnough && !reachedCadence && lastRecomputeAtRef.current !== 0) {
      return
    }

    recomputeInFlightRef.current = true
    lastRecomputeAtRef.current = now
    lastTriggerMyRef.current = myLocation
    lastTriggerPartnerRef.current = partnerLocation

    void convexAction<RecomputeResponse>('routes:recomputeFastestRoad', {
      sessionId,
      userId,
      reason: movedEnough ? 'movement' : 'cadence',
    }, {
      maxRetries: 0,
    })
      .then(() => {
        void fetchRoute()
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to recompute live route'
        setError(message)
      })
      .finally(() => {
        recomputeInFlightRef.current = false
      })
  }, [fetchRoute, isPartnerConnected, myLocation, partnerLocation, sessionId, shouldTrackRoute, userId])

  return useMemo(() => ({
    routePath: routePath ? { ...routePath, isUsersMoving } : null,
    isLoading,
    error,
  }), [error, isLoading, isUsersMoving, routePath])
}
