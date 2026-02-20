import { useEffect, useRef, useState } from 'react'
import { loadGoogleMapsApi } from '@/lib/googleMapsLoader'
import type { MapProviderProps } from '@/components/map/types'

const FIT_BOUNDS_INTERVAL_MS = 1400
const ROUTE_FIT_RECHECK_MS = 6000
const DEFAULT_ZOOM = 15
const DEFAULT_CENTER = { lat: 0, lng: 0 }

interface GoogleMapProviderProps extends MapProviderProps {
  apiKey: string
  onLoadError?: (message: string) => void
}

export function GoogleMapProvider({
  myLocation,
  partnerLocation,
  routePath,
  routePaths,
  meetingPlaceLocation,
  currentUserId,
  cameraMode = 'auto',
  recenterSignal = 0,
  zoom = DEFAULT_ZOOM,
  mapId,
  onCameraChange,
  initialCamera,
  apiKey,
  onLoadError,
}: GoogleMapProviderProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapsRef = useRef<any>(null)
  const advancedMarkerCtorRef = useRef<any>(null)
  const latLngBoundsCtorRef = useRef<any>(null)
  const mapRef = useRef<any>(null)
  const myMarkerRef = useRef<any>(null)
  const partnerMarkerRef = useRef<any>(null)
  const meetingMarkerRef = useRef<any>(null)
  const routeLayersRef = useRef<Map<string, { halo: any; core: any }>>(new Map())
  const listenersRef = useRef<any[]>([])
  const hasCenteredRef = useRef(false)
  const hasRouteCenteredRef = useRef(false)
  const lastFitBoundsAtRef = useRef(0)
  const ignoreCameraChangeRef = useRef(false)
  const recenterSignalHandledRef = useRef(recenterSignal)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    let isMounted = true

    const initialize = async () => {
      if (!apiKey) {
        onLoadError?.('Google Maps API key is missing')
        return
      }

      try {
        const maps = await loadGoogleMapsApi(apiKey)
        if (!isMounted || !mapContainerRef.current) return

        mapsRef.current = maps

        const center =
          initialCamera?.center ??
          myLocation ??
          partnerLocation ??
          DEFAULT_CENTER

        let MapCtor = maps.Map
        if (typeof MapCtor !== 'function' && typeof maps.importLibrary === 'function') {
          const mapsLibrary = await maps.importLibrary('maps')
          MapCtor = mapsLibrary?.Map ?? maps.Map
        }
        if (typeof MapCtor !== 'function') {
          throw new Error('Google Maps failed to initialize (Map constructor missing)')
        }

        const map = new MapCtor(mapContainerRef.current, {
          center,
          zoom: initialCamera?.zoom ?? zoom,
          // AdvancedMarkerElement works best on vector maps; fallback to demo map id when missing.
          mapId: mapId || 'DEMO_MAP_ID',
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
        })

        let AdvancedMarkerCtor = maps.marker?.AdvancedMarkerElement ?? null
        if (!AdvancedMarkerCtor && typeof maps.importLibrary === 'function') {
          const markerLibrary = await maps.importLibrary('marker')
          AdvancedMarkerCtor = markerLibrary?.AdvancedMarkerElement ?? maps.marker?.AdvancedMarkerElement ?? null
        }
        advancedMarkerCtorRef.current = AdvancedMarkerCtor

        let LatLngBoundsCtor = maps.LatLngBounds ?? null
        if (!LatLngBoundsCtor && typeof maps.importLibrary === 'function') {
          const coreLibrary = await maps.importLibrary('core')
          LatLngBoundsCtor = coreLibrary?.LatLngBounds ?? maps.LatLngBounds ?? null
        }
        latLngBoundsCtorRef.current = LatLngBoundsCtor

        mapRef.current = map

        const emitCamera = () => {
          if (!onCameraChange || ignoreCameraChangeRef.current) return
          const currentCenter = map.getCenter()
          if (!currentCenter) return
          onCameraChange({
            center: { lat: currentCenter.lat(), lng: currentCenter.lng() },
            zoom: map.getZoom() ?? zoom,
          })
        }

        listenersRef.current.push(map.addListener('idle', emitCamera))
        setIsReady(true)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to initialize Google Maps'
        onLoadError?.(message)
      }
    }

    void initialize()

    return () => {
      isMounted = false
      listenersRef.current.forEach((listener) => listener?.remove?.())
      listenersRef.current = []
      if (myMarkerRef.current) myMarkerRef.current.map = null
      if (partnerMarkerRef.current) partnerMarkerRef.current.map = null
      if (meetingMarkerRef.current) meetingMarkerRef.current.map = null
      for (const layers of routeLayersRef.current.values()) {
        layers.halo?.setMap?.(null)
        layers.core?.setMap?.(null)
      }
      myMarkerRef.current = null
      partnerMarkerRef.current = null
      meetingMarkerRef.current = null
      routeLayersRef.current.clear()
      advancedMarkerCtorRef.current = null
      latLngBoundsCtorRef.current = null
      mapRef.current = null
      mapsRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isReady || !mapsRef.current || !mapRef.current) return

    const maps = mapsRef.current
    const AdvancedMarkerElement = advancedMarkerCtorRef.current
    const map = mapRef.current

    const createPinContent = (color: string): HTMLDivElement => {
      const pin = document.createElement('div')
      pin.style.width = '20px'
      pin.style.height = '20px'
      pin.style.borderRadius = '9999px'
      pin.style.background = color
      pin.style.border = '3px solid #ffffff'
      pin.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
      return pin
    }

    const updateMarker = (
      markerRef: { current: any },
      location: { lat: number; lng: number } | null,
      color: string
    ) => {
      if (!location) {
        if (markerRef.current) {
          if (typeof markerRef.current.setMap === 'function') {
            markerRef.current.setMap(null)
          } else {
            markerRef.current.map = null
          }
          markerRef.current = null
        }
        return
      }

      if (!markerRef.current) {
        if (AdvancedMarkerElement) {
          markerRef.current = new AdvancedMarkerElement({
            position: location,
            map,
            content: createPinContent(color),
          })
        } else {
          markerRef.current = new maps.Marker({
            position: location,
            map,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 9,
            },
            optimized: true,
          })
        }
        return
      }

      if ('position' in markerRef.current) {
        markerRef.current.position = location
      } else if (typeof markerRef.current.setPosition === 'function') {
        markerRef.current.setPosition(location)
      }
    }

    const css = window.getComputedStyle(document.documentElement)
    const meetingMarkerColor = css.getPropertyValue('--color-meeting-marker').trim() || '#FFB300'
    updateMarker(myMarkerRef, myLocation, '#2196F3')
    updateMarker(partnerMarkerRef, partnerLocation, '#E91E63')
    updateMarker(meetingMarkerRef, meetingPlaceLocation ?? null, meetingMarkerColor)

    const activeRoutesRaw = routePaths && routePaths.length > 0
      ? routePaths
      : routePath
        ? [routePath]
        : []
    const activeRoutes = activeRoutesRaw.filter((route) => route.points.length >= 2)
    const activeRouteKeys = new Set<string>()

    const haloColor = css.getPropertyValue('--route-line-halo').trim() || '#FFFFFF'
    const coreDefault = css.getPropertyValue('--route-line-core').trim() || '#00D4FF'
    const coreMine = css.getPropertyValue('--route-line-core-mine').trim() || coreDefault
    const corePartner = css.getPropertyValue('--route-line-core-partner').trim() || '#FF7AA2'
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

    activeRoutes.forEach((route, index) => {
      const routeKey = route.id || `route-${index}`
      activeRouteKeys.add(routeKey)
      const isMeetingRoute = route.destinationMode === 'meeting_place'
      const isMine = Boolean(currentUserId && route.ownerUserId && route.ownerUserId === currentUserId)
      const coreColor = isMeetingRoute ? (isMine ? coreMine : corePartner) : coreDefault
      const moving = Boolean(route.isUsersMoving && !prefersReducedMotion)
      const path = route.points.map((point) => ({ lat: point.lat, lng: point.lng }))

      const movingDashOptions = moving
        ? {
            strokeOpacity: 0,
            icons: [{
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 4,
              },
              offset: '0',
              repeat: '14px',
            }],
          }
        : {
            strokeOpacity: 0.96,
            icons: [],
          }

      const existing = routeLayersRef.current.get(routeKey)
      if (!existing) {
        const halo = new maps.Polyline({
          map,
          path,
          strokeColor: haloColor,
          strokeOpacity: 0.7,
          strokeWeight: 10,
          clickable: false,
          zIndex: 5,
        })
        const core = new maps.Polyline({
          map,
          path,
          strokeColor: coreColor,
          strokeWeight: 5,
          clickable: false,
          zIndex: 6,
          ...movingDashOptions,
        })
        routeLayersRef.current.set(routeKey, { halo, core })
        return
      }

      existing.halo.setPath(path)
      existing.halo.setOptions({
        strokeColor: haloColor,
        strokeOpacity: 0.7,
      })
      existing.core.setPath(path)
      existing.core.setOptions({
        strokeColor: coreColor,
        strokeWeight: 5,
        ...movingDashOptions,
      })
    })

    for (const [routeKey, layers] of routeLayersRef.current.entries()) {
      if (activeRouteKeys.has(routeKey)) continue
      layers.halo?.setMap?.(null)
      layers.core?.setMap?.(null)
      routeLayersRef.current.delete(routeKey)
    }

    const shouldFitComposite = activeRoutes.length > 0 || (myLocation && partnerLocation && meetingPlaceLocation)
    const hasRecenterSignal = recenterSignal !== recenterSignalHandledRef.current

    if (hasRecenterSignal) {
      recenterSignalHandledRef.current = recenterSignal
      hasRouteCenteredRef.current = false
      hasCenteredRef.current = false
      lastFitBoundsAtRef.current = 0
    }

    if (cameraMode !== 'auto') {
      hasRouteCenteredRef.current = false
      if (!hasCenteredRef.current && myLocation) {
        ignoreCameraChangeRef.current = true
        map.setCenter(myLocation)
        map.setZoom(initialCamera?.zoom ?? zoom)
        hasCenteredRef.current = true
        window.setTimeout(() => {
          ignoreCameraChangeRef.current = false
        }, 320)
      }
      return
    }

    if (shouldFitComposite) {
      const now = Date.now()
      if (!hasRouteCenteredRef.current || now - lastFitBoundsAtRef.current >= ROUTE_FIT_RECHECK_MS) {
        ignoreCameraChangeRef.current = true
        const LatLngBoundsCtor = latLngBoundsCtorRef.current
        if (typeof LatLngBoundsCtor === 'function') {
          const seed = activeRoutes[0]?.points[0] ?? myLocation ?? partnerLocation ?? meetingPlaceLocation
          if (seed) {
            const bounds = new LatLngBoundsCtor()
            bounds.extend(seed)
            for (const route of activeRoutes) {
              for (const point of route.points) {
                bounds.extend({ lat: point.lat, lng: point.lng })
              }
            }
            if (myLocation) bounds.extend(myLocation)
            if (partnerLocation) bounds.extend(partnerLocation)
            if (meetingPlaceLocation) bounds.extend(meetingPlaceLocation)
            map.fitBounds(bounds, 56)
          }
        }
        lastFitBoundsAtRef.current = now
        hasRouteCenteredRef.current = true
        window.setTimeout(() => {
          ignoreCameraChangeRef.current = false
        }, 420)
      }
      return
    }

    hasRouteCenteredRef.current = false

    if (myLocation && partnerLocation) {
      const now = Date.now()
      if (now - lastFitBoundsAtRef.current >= FIT_BOUNDS_INTERVAL_MS) {
        ignoreCameraChangeRef.current = true
        const LatLngBoundsCtor = latLngBoundsCtorRef.current
        if (typeof LatLngBoundsCtor === 'function') {
          const bounds = new LatLngBoundsCtor()
          bounds.extend(myLocation)
          bounds.extend(partnerLocation)
          map.fitBounds(bounds, 56)
        } else {
          map.setCenter({
            lat: (myLocation.lat + partnerLocation.lat) / 2,
            lng: (myLocation.lng + partnerLocation.lng) / 2,
          })
        }
        lastFitBoundsAtRef.current = now
        window.setTimeout(() => {
          ignoreCameraChangeRef.current = false
        }, 420)
      }
      return
    }

    if (!hasCenteredRef.current && myLocation) {
      ignoreCameraChangeRef.current = true
      map.setCenter(myLocation)
      map.setZoom(initialCamera?.zoom ?? zoom)
      hasCenteredRef.current = true
      window.setTimeout(() => {
        ignoreCameraChangeRef.current = false
      }, 320)
    }
  }, [cameraMode, currentUserId, isReady, meetingPlaceLocation, myLocation, partnerLocation, recenterSignal, routePath, routePaths, zoom, initialCamera?.zoom])

  return <div ref={mapContainerRef} className="h-full w-full bg-[#111827]" />
}

