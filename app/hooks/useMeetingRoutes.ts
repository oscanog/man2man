import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { convexAction, convexQuery } from '@/lib/convex'
import type { Location, MeetingRouteSummary, RoutePath, RoutePoint, RouteStatus } from '@/components/map/types'

const DEFAULT_POLL_MS = 3000
const MIN_RECOMPUTE_INTERVAL_MS = 12_000
const MOVEMENT_TRIGGER_METERS = 25
const MOVING_STATE_THRESHOLD_METERS = 3
const MOVING_HOLD_MS = 10_000

interface MeetingRoutesHookParams {
  sessionId: string
  userId: string | null
  myLocation: Location | null
  partnerLocation: Location | null
  isPartnerConnected: boolean
  enabled?: boolean
  pollMs?: number
}

export interface RouteSnapshotResponse {
  routeKey: string
  routeOwnerUserId?: string | null
  destinationMode?: 'partner' | 'meeting_place'
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

export interface RoutesForSessionResponse {
  mode: 'pair' | 'meeting_place'
  meetingPlace: null | {
    status: 'set' | 'removal_requested'
    place: {
      name: string
      lat: number
      lng: number
      address?: string
      providerPlaceId?: string
    }
  }
  routes: RouteSnapshotResponse[]
}

interface RecomputeResponse {
  status: 'updated' | 'skipped' | 'fallback'
}

export function hydrateMeetingRoutePath(route: RouteSnapshotResponse, isUsersMoving: boolean): RoutePath {
  return {
    id: route.routeKey,
    ownerUserId: route.routeOwnerUserId ?? null,
    destinationMode: route.destinationMode ?? 'partner',
    status: route.status,
    provider: route.provider,
    points: route.polyline ?? [],
    distanceMeters: route.distanceMeters ?? null,
    durationSeconds: route.durationSeconds ?? null,
    trafficDurationSeconds: route.trafficDurationSeconds ?? null,
    computedAt: route.computedAt,
    expiresAt: route.expiresAt,
    ageMs: route.ageMs,
    isFresh: route.isFresh,
    isUsersMoving,
    lastError: route.lastError,
  }
}

export function getRouteModeFromSnapshot(snapshot: RoutesForSessionResponse | null): 'pair' | 'meeting_place' {
  return snapshot?.mode ?? 'pair'
}

interface MeetingRoutesResult {
  routeSummary: MeetingRouteSummary | null
  routePaths: RoutePath[]
  mode: 'pair' | 'meeting_place'
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

export function useMeetingRoutes({
  sessionId,
  userId,
  myLocation,
  partnerLocation,
  isPartnerConnected,
  enabled = false,
  pollMs = DEFAULT_POLL_MS,
}: MeetingRoutesHookParams): MeetingRoutesResult {
  const [routeSummary, setRouteSummary] = useState<MeetingRouteSummary | null>(null)
  const [mode, setMode] = useState<'pair' | 'meeting_place'>('pair')
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

  const hydrateRoute = useCallback((route: RouteSnapshotResponse): RoutePath => {
    return hydrateMeetingRoutePath(route, isUsersMoving)
  }, [isUsersMoving])

  const fetchRoutes = useCallback(async () => {
    if (!canRun || !userId) {
      setRouteSummary(null)
      return
    }

    try {
      const snapshot = await convexQuery<RoutesForSessionResponse | null>('routes:getForSessionRoutes', {
        sessionId,
        userId,
      }, {
        maxRetries: 1,
      })

      if (!snapshot) {
        setRouteSummary(null)
        return
      }

      const hydrated = snapshot.routes.map(hydrateRoute)
      setMode(getRouteModeFromSnapshot(snapshot))
      setRouteSummary({
        mode: snapshot.mode,
        routes: hydrated,
      })
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch meeting routes'
      setError(message)
    }
  }, [canRun, hydrateRoute, sessionId, userId])

  useEffect(() => {
    if (!canRun) {
      setRouteSummary(null)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    void fetchRoutes().finally(() => {
      setIsLoading(false)
    })

    const intervalId = window.setInterval(() => {
      void fetchRoutes()
    }, pollMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [canRun, fetchRoutes, pollMs])

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
        void fetchRoutes()
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to recompute meeting routes'
        setError(message)
      })
      .finally(() => {
        recomputeInFlightRef.current = false
      })
  }, [fetchRoutes, myLocation, partnerLocation, sessionId, shouldTrackRoute, userId])

  return useMemo(() => ({
    routeSummary,
    routePaths: (routeSummary?.routes ?? []).map((route) => ({ ...route, isUsersMoving })),
    mode,
    isLoading,
    error,
  }), [error, isLoading, isUsersMoving, mode, routeSummary])
}
