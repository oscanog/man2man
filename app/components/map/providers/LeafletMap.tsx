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
  zoom = DEFAULT_ZOOM,
  onCameraChange,
  initialCamera,
}: MapProviderProps) {
  const isDebug = (import.meta.env.VITE_DEBUG_LIVE_ROUTE ?? 'false').toLowerCase() === 'true'
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const myMarkerRef = useRef<any>(null)
  const partnerMarkerRef = useRef<any>(null)
  const routeHaloRef = useRef<any>(null)
  const routeCoreRef = useRef<any>(null)
  const hasCenteredRef = useRef(false)
  const hasRouteCenteredRef = useRef(false)
  const lastFitBoundsAtRef = useRef(0)
  const ignoreCameraChangeRef = useRef(false)

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
      routeHaloRef.current = null
      routeCoreRef.current = null
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

    updateMarker(myMarkerRef, myLocation, '#2196F3')
    updateMarker(partnerMarkerRef, partnerLocation, '#E91E63')

    const removeRoute = () => {
      if (routeHaloRef.current) {
        map.removeLayer(routeHaloRef.current)
        routeHaloRef.current = null
      }
      if (routeCoreRef.current) {
        map.removeLayer(routeCoreRef.current)
        routeCoreRef.current = null
      }
      hasRouteCenteredRef.current = false
    }

    const routePoints = routePath?.points ?? []
    const hasRoute = routePoints.length >= 2
    if (isDebug) {
      console.log('[live-route][leaflet] update', {
        hasRoute,
        points: routePoints.length,
        status: routePath?.status ?? null,
      })
    }

    if (!hasRoute) {
      removeRoute()
    } else {
      const css = window.getComputedStyle(document.documentElement)
      const haloColor = css.getPropertyValue('--route-line-halo').trim() || '#FFFFFF'
      const coreColor = css.getPropertyValue('--route-line-core').trim() || '#00D4FF'
      const dashArray = routePath?.isUsersMoving ? '10 16' : undefined
      const latLngs = routePoints.map((point) => [point.lat, point.lng])

      if (!routeHaloRef.current) {
        routeHaloRef.current = L.polyline(latLngs, {
          color: haloColor,
          weight: 10,
          opacity: 0.72,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)
      } else {
        routeHaloRef.current.setLatLngs(latLngs)
        routeHaloRef.current.setStyle({
          color: haloColor,
          opacity: 0.72,
        })
      }

      if (!routeCoreRef.current) {
        routeCoreRef.current = L.polyline(latLngs, {
          color: coreColor,
          weight: 5,
          opacity: 0.96,
          dashArray,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)
      } else {
        routeCoreRef.current.setLatLngs(latLngs)
        routeCoreRef.current.setStyle({
          color: coreColor,
          opacity: 0.96,
          dashArray,
        })
      }
    }

    if (hasRoute) {
      const now = Date.now()
      if (!hasRouteCenteredRef.current || now - lastFitBoundsAtRef.current >= ROUTE_FIT_RECHECK_MS) {
        ignoreCameraChangeRef.current = true
        const firstPoint = routePoints[0]
        const bounds = L.latLngBounds([firstPoint.lat, firstPoint.lng], [firstPoint.lat, firstPoint.lng])
        for (const point of routePoints) {
          bounds.extend([point.lat, point.lng])
        }
        map.fitBounds(bounds, { padding: [56, 56], maxZoom: 17, animate: true })
        lastFitBoundsAtRef.current = now
        hasRouteCenteredRef.current = true
        window.setTimeout(() => {
          ignoreCameraChangeRef.current = false
        }, 420)
      }
      return
    }

    // Keep both users in view, but throttle fitBounds to avoid jitter and lag.
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

    // Center once for single-user map mode to avoid recenters on every GPS tick.
    if (!hasCenteredRef.current && myLocation) {
      ignoreCameraChangeRef.current = true
      map.setView([myLocation.lat, myLocation.lng], initialCamera?.zoom ?? zoom, { animate: true })
      hasCenteredRef.current = true
      window.setTimeout(() => {
        ignoreCameraChangeRef.current = false
      }, 320)
    }
  }, [myLocation, partnerLocation, routePath, zoom, initialCamera?.zoom])

  return <div ref={mapContainerRef} className="h-full w-full bg-[#111827]" />
}
