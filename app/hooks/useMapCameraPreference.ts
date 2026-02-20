import { useCallback, useEffect, useMemo, useState } from 'react'
import { storage } from '@/lib/storage'

export type MapCameraMode = 'auto' | 'manual'

export const DEFAULT_CAMERA_MODE: MapCameraMode = 'auto'
const KEY_PREFIX = 'man2man_map_camera_mode'

export function getMapCameraPreferenceKey(userId: string | null): string {
  const resolvedUserId = userId ?? 'anonymous'
  return `${KEY_PREFIX}_${resolvedUserId}`
}

export function parseMapCameraMode(raw: string | null): MapCameraMode {
  return raw === 'manual' ? 'manual' : 'auto'
}

export function useMapCameraPreference(userId?: string | null) {
  const resolvedUserId = useMemo(() => userId ?? storage.getUserId(), [userId])
  const storageKey = useMemo(() => getMapCameraPreferenceKey(resolvedUserId), [resolvedUserId])
  const [cameraMode, setCameraModeState] = useState<MapCameraMode>(DEFAULT_CAMERA_MODE)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(storageKey)
      setCameraModeState(parseMapCameraMode(stored))
    } catch {
      setCameraModeState(DEFAULT_CAMERA_MODE)
    }
  }, [storageKey])

  const setCameraMode = useCallback((nextMode: MapCameraMode) => {
    setCameraModeState(nextMode)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(storageKey, nextMode)
    } catch {
      // Ignore localStorage write errors and keep in-memory state.
    }
  }, [storageKey])

  return {
    cameraMode,
    setCameraMode,
  }
}
