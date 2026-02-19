import { useCallback, useEffect, useMemo, useState } from 'react'
import { storage } from '@/lib/storage'

export type MapMode = 'leaflet' | 'google'

const DEFAULT_MODE: MapMode = 'leaflet'
const KEY_PREFIX = 'man2man_map_mode'

function getStorageKey(userId: string | null): string {
  const resolvedUserId = userId ?? 'anonymous'
  return `${KEY_PREFIX}_${resolvedUserId}`
}

function parseMode(raw: string | null): MapMode {
  return raw === 'google' ? 'google' : 'leaflet'
}

export function useMapModePreference(userId?: string | null) {
  const resolvedUserId = useMemo(() => userId ?? storage.getUserId(), [userId])
  const storageKey = useMemo(() => getStorageKey(resolvedUserId), [resolvedUserId])
  const [mode, setMode] = useState<MapMode>(DEFAULT_MODE)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(storageKey)
      setMode(parseMode(stored))
    } catch {
      setMode(DEFAULT_MODE)
    }
  }, [storageKey])

  const setPreferredMode = useCallback((nextMode: MapMode) => {
    setMode(nextMode)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(storageKey, nextMode)
    } catch {
      // Ignore localStorage write errors and keep in-memory state.
    }
  }, [storageKey])

  return {
    mode,
    setMode: setPreferredMode,
  }
}

