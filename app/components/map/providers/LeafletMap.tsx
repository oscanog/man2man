import { useEffect, useRef } from 'react'
import type { MapProviderProps } from '@/components/map/types'

const FIT_BOUNDS_INTERVAL_MS = 1400
const ROUTE_FIT_RECHECK_MS = 6000
const DEFAULT_ZOOM = 15
const DEFAULT_CENTER = { lat: 0, lng: 0 }

function createMarkerIcon(L: any, color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 24px; height: 24px; background: ${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export function LeafletMapProvider({
  myLocation,
  partnerLocation,
  routePath,
  routePaths,
  meetingPlaceLocation,
  currentUserId,
  cameraMode = 'auto',
  recenterSignal = 0,
  zoom = DEFAULT_ZOOM,
  onCameraChange,
  initialCamera,
}: MapProviderProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const myMarkerRef = useRef<any>(null)
  const partnerMarkerRef = useRef<any>(null)
  const meetingMarkerRef = useRef<any>(null)
  const routeLayersRef = useRef<Map<string, { halo: any; core: any }>>(new Map())
  const hasCenteredRef = useRef(false)
  const hasRouteCenteredRef = useRef(false)
  const lastFitBoundsAtRef = useRef(0)
  const ignoreCameraChangeRef = useRef(false)
  const recenterSignalHandledRef = useRef(recenterSignal)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    let isMounted = true

    const initialize = async () => {
      const L = await import('leaflet')
      await import('leaflet/dist/leaflet.css')
      if (!isMounted || !mapContainerRef.current) return

      const icon = (await import('leaflet/dist/images/marker-icon.png')).default
      const iconShadow = (await import('leaflet/dist/images/marker-shadow.png')).default
      L.Marker.prototype.options.icon = L.icon({
        iconUrl: icon,
        shadowUrl: iconShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })

      leafletRef.current = L

      const startCenter =
        initialCamera?.center ??
        myLocation ??
        partnerLocation ??
        DEFAULT_CENTER
      const startZoom = initialCamera?.zoom ?? zoom

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        preferCanvas: true,
      }).setView([startCenter.lat, startCenter.lng], startZoom)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      const emitCamera = () => {
        if (!onCameraChange || ignoreCameraChangeRef.current) return
        const center = map.getCenter()
        onCameraChange({
          center: { lat: center.lat, lng: center.lng },
          zoom: map.getZoom(),
        })
      }

      map.on('moveend', emitCamera)
      map.on('zoomend', emitCamera)
      mapRef.current = map
    }

    void initialize()

    return () => {
      isMounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      leafletRef.current = null
      myMarkerRef.current = null
      partnerMarkerRef.current = null
      meetingMarkerRef.current = null
      routeLayersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const L = leafletRef.current
    if (!map || !L) return

    const updateMarker = (
      markerRef: { current: any },
      location: { lat: number; lng: number } | null,
      color: string
    ) => {
      if (!location) {
        if (markerRef.current) {
          map.removeLayer(markerRef.current)
          markerRef.current = null
        }
        return
      }

      if (!markerRef.current) {
        markerRef.current = L.marker([location.lat, location.lng], {
          icon: createMarkerIcon(L, color),
        }).addTo(map)
        return
      }

      markerRef.current.setLatLng([location.lat, location.lng])
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

    activeRoutes.forEach((route, index) => {
      const routeKey = route.id || `route-${index}`
      activeRouteKeys.add(routeKey)
      const isMeetingRoute = route.destinationMode === 'meeting_place'
      const isMine = Boolean(currentUserId && route.ownerUserId && route.ownerUserId === currentUserId)
      const coreColor = isMeetingRoute ? (isMine ? coreMine : corePartner) : coreDefault
      const dashArray = route.isUsersMoving ? '10 16' : undefined
      const latLngs = route.points.map((point) => [point.lat, point.lng])

      const existing = routeLayersRef.current.get(routeKey)
      if (!existing) {
        const halo = L.polyline(latLngs, {
          color: haloColor,
          weight: 10,
          opacity: 0.72,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)
        const core = L.polyline(latLngs, {
          color: coreColor,
          weight: 5,
          opacity: 0.96,
          dashArray,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)
        routeLayersRef.current.set(routeKey, { halo, core })
        return
      }

      existing.halo.setLatLngs(latLngs)
      existing.halo.setStyle({
        color: haloColor,
        opacity: 0.72,
      })
      existing.core.setLatLngs(latLngs)
      existing.core.setStyle({
        color: coreColor,
        opacity: 0.96,
        dashArray,
      })
    })

    for (const [routeKey, layers] of routeLayersRef.current.entries()) {
      if (activeRouteKeys.has(routeKey)) continue
      map.removeLayer(layers.halo)
      map.removeLayer(layers.core)
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
        map.setView([myLocation.lat, myLocation.lng], initialCamera?.zoom ?? zoom, { animate: true })
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

        const firstPoint = activeRoutes[0]?.points[0] ?? myLocation ?? partnerLocation ?? meetingPlaceLocation
        if (firstPoint) {
          const bounds = L.latLngBounds([firstPoint.lat, firstPoint.lng], [firstPoint.lat, firstPoint.lng])
          for (const route of activeRoutes) {
            for (const point of route.points) {
              bounds.extend([point.lat, point.lng])
            }
          }
          if (myLocation) bounds.extend([myLocation.lat, myLocation.lng])
          if (partnerLocation) bounds.extend([partnerLocation.lat, partnerLocation.lng])
          if (meetingPlaceLocation) bounds.extend([meetingPlaceLocation.lat, meetingPlaceLocation.lng])
          map.fitBounds(bounds, { padding: [56, 56], maxZoom: 17, animate: true })
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
        const bounds = L.latLngBounds(
          [myLocation.lat, myLocation.lng],
          [partnerLocation.lat, partnerLocation.lng]
        )
        map.fitBounds(bounds, { padding: [56, 56], maxZoom: 17, animate: true })
        lastFitBoundsAtRef.current = now
        window.setTimeout(() => {
          ignoreCameraChangeRef.current = false
        }, 420)
      }
      return
    }

    if (!hasCenteredRef.current && myLocation) {
      ignoreCameraChangeRef.current = true
      map.setView([myLocation.lat, myLocation.lng], initialCamera?.zoom ?? zoom, { animate: true })
      hasCenteredRef.current = true
      window.setTimeout(() => {
        ignoreCameraChangeRef.current = false
      }, 320)
    }
  }, [cameraMode, currentUserId, meetingPlaceLocation, myLocation, partnerLocation, recenterSignal, routePath, routePaths, zoom, initialCamera?.zoom])

  return <div ref={mapContainerRef} className="h-full w-full bg-[#111827]" />
}
