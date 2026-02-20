import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Hand, Layers3, LocateFixed, Map as MapIcon } from 'lucide-react'
import { useMapModePreference, type MapMode } from '@/hooks/useMapModePreference'
import { useMapCameraPreference } from '@/hooks/useMapCameraPreference'
import type { CameraState, Location, RoutePath } from '@/components/map/types'
import { LeafletMapProvider } from '@/components/map/providers/LeafletMap'
import { GoogleMapProvider } from '@/components/map/providers/GoogleMap'

const ANIMATION_DURATION_MS = 320

interface MapSwitcherProps {
  myLocation: Location | null
  partnerLocation: Location | null
  routePath?: RoutePath | null
  routePaths?: RoutePath[] | null
  meetingPlaceLocation?: Location | null
  zoom?: number
  isPartnerConnected?: boolean
  userId?: string | null
}

type TransitionPhase = 'idle' | 'prepare' | 'running'
type SlideDirection = 'left' | 'right'

function GoogleBadgeIcon() {
  return (
    <div className="relative h-6 w-6">
      <MapIcon className="h-6 w-6 text-white/95" />
      <span className="absolute -bottom-1 -right-1 rounded-full bg-white px-[3px] py-[1px] text-[9px] font-bold leading-none text-[#4285F4]">
        G
      </span>
    </div>
  )
}

function getDirection(targetMode: MapMode): SlideDirection {
  return targetMode === 'google' ? 'right' : 'left'
}

export function MapSwitcher({
  myLocation,
  partnerLocation,
  routePath = null,
  routePaths = null,
  meetingPlaceLocation = null,
  zoom = 15,
  isPartnerConnected = false,
  userId,
}: MapSwitcherProps) {
  const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim()
  const googleMapId = (import.meta.env.VITE_GOOGLE_MAP_ID ?? '').trim()
  const hasGoogleMapsConfig = googleMapsApiKey.length > 0

  const { mode, setMode } = useMapModePreference(userId)
  const { cameraMode, setCameraMode } = useMapCameraPreference(userId)

  const [activeMode, setActiveMode] = useState<MapMode>(mode)
  const [incomingMode, setIncomingMode] = useState<MapMode | null>(null)
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle')
  const [direction, setDirection] = useState<SlideDirection>('right')
  const [notice, setNotice] = useState<string | null>(null)
  const [recenterSignal, setRecenterSignal] = useState(0)

  const animationTimerRef = useRef<number | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const cameraByModeRef = useRef<Record<MapMode, CameraState | null>>({
    leaflet: null,
    google: null,
  })

  const isAnimating = transitionPhase !== 'idle'

  useEffect(() => {
    if (hasGoogleMapsConfig || activeMode !== 'google') return
    setActiveMode('leaflet')
    setIncomingMode(null)
    setTransitionPhase('idle')
    setMode('leaflet')
  }, [activeMode, hasGoogleMapsConfig, setMode])

  const setTransientNotice = useCallback((message: string) => {
    setNotice(message)
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current)
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null)
      noticeTimerRef.current = null
    }, 2600)
  }, [])

  const completeTransition = useCallback((targetMode: MapMode) => {
    setActiveMode(targetMode)
    setIncomingMode(null)
    setTransitionPhase('idle')
    setMode(targetMode)
  }, [setMode])

  const beginTransition = useCallback((targetMode: MapMode) => {
    if (isAnimating || targetMode === activeMode) return
    setDirection(getDirection(targetMode))
    setIncomingMode(targetMode)
    setTransitionPhase('prepare')
    window.requestAnimationFrame(() => {
      setTransitionPhase('running')
    })

    if (animationTimerRef.current) {
      window.clearTimeout(animationTimerRef.current)
    }
    animationTimerRef.current = window.setTimeout(() => {
      completeTransition(targetMode)
      animationTimerRef.current = null
    }, ANIMATION_DURATION_MS)
  }, [activeMode, completeTransition, isAnimating])

  const switchToGoogle = useCallback(() => {
    if (!hasGoogleMapsConfig) {
      setTransientNotice('Google Maps key is not configured. Set VITE_GOOGLE_MAPS_API_KEY first.')
      return
    }
    beginTransition('google')
  }, [beginTransition, hasGoogleMapsConfig, setTransientNotice])

  const switchToLeaflet = useCallback(() => {
    beginTransition('leaflet')
  }, [beginTransition])

  const toggleAutoRecenter = useCallback(() => {
    if (cameraMode === 'auto') {
      setCameraMode('manual')
      setTransientNotice('Auto recenter disabled')
      return
    }
    setCameraMode('auto')
    setRecenterSignal((previous) => previous + 1)
    setTransientNotice('Auto recenter enabled')
  }, [cameraMode, setCameraMode, setTransientNotice])

  useEffect(() => {
    if (mode === activeMode || isAnimating) return

    if (mode === 'google' && !hasGoogleMapsConfig) {
      setMode('leaflet')
      return
    }

    beginTransition(mode)
  }, [activeMode, beginTransition, hasGoogleMapsConfig, isAnimating, mode, setMode])

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        window.clearTimeout(animationTimerRef.current)
      }
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current)
      }
    }
  }, [])

  const getInitialCamera = useCallback((targetMode: MapMode): CameraState | null => {
    const ownCamera = cameraByModeRef.current[targetMode]
    if (ownCamera) return ownCamera
    return targetMode === 'google'
      ? cameraByModeRef.current.leaflet
      : cameraByModeRef.current.google
  }, [])

  const renderMapLayer = useCallback((targetMode: MapMode) => {
    if (targetMode === 'google') {
      return (
        <GoogleMapProvider
          apiKey={googleMapsApiKey}
          mapId={googleMapId || undefined}
          myLocation={myLocation}
          partnerLocation={partnerLocation}
          routePath={routePath}
          routePaths={routePaths}
          meetingPlaceLocation={meetingPlaceLocation}
          currentUserId={userId}
          cameraMode={cameraMode}
          recenterSignal={recenterSignal}
          zoom={zoom}
          initialCamera={getInitialCamera('google')}
          onCameraChange={(camera) => {
            cameraByModeRef.current.google = camera
          }}
          onLoadError={(message) => {
            setTransientNotice(message)
            setMode('leaflet')
          }}
        />
      )
    }

    return (
      <LeafletMapProvider
        myLocation={myLocation}
        partnerLocation={partnerLocation}
        routePath={routePath}
        routePaths={routePaths}
        meetingPlaceLocation={meetingPlaceLocation}
        currentUserId={userId}
        cameraMode={cameraMode}
        recenterSignal={recenterSignal}
        zoom={zoom}
        initialCamera={getInitialCamera('leaflet')}
        onCameraChange={(camera) => {
          cameraByModeRef.current.leaflet = camera
        }}
      />
    )
  }, [cameraMode, getInitialCamera, googleMapId, googleMapsApiKey, meetingPlaceLocation, myLocation, partnerLocation, recenterSignal, routePath, routePaths, setMode, setTransientNotice, userId, zoom])

  const activeLayerClass = useMemo(() => {
    if (transitionPhase !== 'running') return 'translate-x-0'
    return direction === 'right' ? 'translate-x-full' : '-translate-x-full'
  }, [direction, transitionPhase])

  const incomingLayerClass = useMemo(() => {
    if (!incomingMode) return 'translate-x-0'
    if (transitionPhase === 'prepare') {
      return direction === 'right' ? '-translate-x-full' : 'translate-x-full'
    }
    if (transitionPhase === 'running') {
      return 'translate-x-0'
    }
    return 'translate-x-0'
  }, [direction, incomingMode, transitionPhase])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className={`absolute inset-0 ${transitionPhase === 'running' ? 'transition-transform duration-300 ease-out' : ''} ${activeLayerClass}`}
      >
        {renderMapLayer(activeMode)}
      </div>

      {incomingMode && (
        <div
          className={`absolute inset-0 ${transitionPhase !== 'idle' ? 'transition-transform duration-300 ease-out' : ''} ${incomingLayerClass}`}
        >
          {renderMapLayer(incomingMode)}
        </div>
      )}

      {!isAnimating && isPartnerConnected && (
        <>
          <button
            type="button"
            aria-label={cameraMode === 'auto' ? 'Disable auto recenter' : 'Enable auto recenter'}
            aria-pressed={cameraMode === 'auto'}
            title={cameraMode === 'auto' ? 'Auto recenter is on' : 'Auto recenter is off'}
            onClick={toggleAutoRecenter}
            data-active={cameraMode === 'auto'}
            className="camera-fab absolute left-4 bottom-[max(108px,var(--safe-area-bottom))] z-[430] flex h-12 w-12 items-center justify-center rounded-full"
          >
            {cameraMode === 'auto' ? (
              <LocateFixed className="h-5 w-5" />
            ) : (
              <Hand className="h-5 w-5" />
            )}
            <span className="sr-only">
              {cameraMode === 'auto' ? 'Auto recenter enabled' : 'Auto recenter disabled'}
            </span>
          </button>

          {activeMode === 'leaflet' ? (
            <button
              type="button"
              aria-label="Switch to Google Map"
              onClick={switchToGoogle}
              className="absolute right-4 top-1/2 z-[430] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-[#141D2B]/35 text-white/90 shadow-lg backdrop-blur-md opacity-55 transition-all duration-200 hover:opacity-90 active:scale-95"
            >
              <GoogleBadgeIcon />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Switch to Leaflet Map"
              onClick={switchToLeaflet}
              className="absolute left-4 top-1/2 z-[430] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-[#141D2B]/35 text-white/90 shadow-lg backdrop-blur-md opacity-55 transition-all duration-200 hover:opacity-90 active:scale-95"
            >
              <Layers3 className="h-5 w-5" />
            </button>
          )}
        </>
      )}

      {notice && (
        <div className="pointer-events-none absolute left-1/2 top-5 z-[435] -translate-x-1/2 rounded-full border border-white/25 bg-[#141D2B]/65 px-4 py-2 text-xs text-white/90 backdrop-blur-md">
          {notice}
        </div>
      )}
    </div>
  )
}
