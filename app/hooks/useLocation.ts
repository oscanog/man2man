/**
 * Location Hook
 * 
 * Manages Geolocation API and location sharing with Convex.
 * Mirrors Android's LocationService functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { convexMutation, subscribeConvexQuery } from '@/lib/convex'
import { storage } from '@/lib/storage'

export interface Location {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

interface UseGeolocationReturn {
  location: Location | null
  error: string | null
  permission: PermissionState | null
  isWatching: boolean
  startWatching: () => void
  stopWatching: () => void
}

/**
 * Hook to track device location using Geolocation API
 */
export function useGeolocation(updateInterval: number = 5000): UseGeolocationReturn {
  const [location, setLocation] = useState<Location | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permission, setPermission] = useState<PermissionState | null>(null)
  const [isWatching, setIsWatching] = useState(false)
  
  const watchIdRef = useRef<number | null>(null)

  // Check permission on mount
  useEffect(() => {
    if (!navigator.permissions) return

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        setPermission(result.state)
        result.onchange = () => setPermission(result.state)
      })
  }, [])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setIsWatching(true)
    setError(null)

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        })
      },
      (err) => {
        setError(err.message)
        setIsWatching(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )

    // Watch for updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        })
      },
      (err) => {
        setError(err.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: updateInterval,
      }
    )
  }, [updateInterval])

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsWatching(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopWatching()
  }, [stopWatching])

  return {
    location,
    error,
    permission,
    isWatching,
    startWatching,
    stopWatching,
  }
}

export interface LocationUpdate {
  sessionId: string
  userId: string
  lat: number
  lng: number
  accuracy?: number
}

/**
 * Hook to send location updates to Convex
 */
export function useLocationUpdater() {
  const [isUpdating, setIsUpdating] = useState(false)
  const lastUpdateRef = useRef<number>(0)

  const sendLocation = useCallback(
    async (sessionId: string, location: Location): Promise<void> => {
      const userId = storage.getUserId()
      if (!userId) throw new Error('User not authenticated')

      // Throttle updates (max once per second)
      const now = Date.now()
      if (now - lastUpdateRef.current < 1000) return
      lastUpdateRef.current = now

      setIsUpdating(true)

      try {
        await convexMutation('locations:update', {
          sessionId,
          userId,
          lat: location.latitude,
          lng: location.longitude,
          accuracy: location.accuracy,
        })
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { sendLocation, isUpdating }
}

/**
 * Hook to subscribe to partner's location
 */
export function usePartnerLocation(sessionId: string | null) {
  const [location, setLocation] = useState<{
    lat: number
    lng: number
    accuracy: number
    timestamp: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const userId = storage.getUserId()

  useEffect(() => {
    if (!sessionId || !userId) {
      setIsLoading(false)
      return
    }

    const cleanup = subscribeConvexQuery<{
      lat: number
      lng: number
      accuracy: number
      timestamp: number
    } | null>(
      'locations:getPartnerLocation',
      { sessionId, userId },
      (data) => {
        if (data) {
          setLocation(data)
          setLastUpdated(new Date())
        }
        setIsLoading(false)
        setError(null)
      },
      (err) => {
        setError(err)
        setIsLoading(false)
      },
      2000 // Poll every 2 seconds
    )

    return cleanup
  }, [sessionId, userId])

  return { location, isLoading, error, lastUpdated }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}
