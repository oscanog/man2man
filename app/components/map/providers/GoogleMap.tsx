import { useEffect, useRef, useState } from 'react'
import { loadGoogleMapsApi } from '@/lib/googleMapsLoader'
import type { MapProviderProps } from '@/components/map/types'

const FIT_BOUNDS_INTERVAL_MS = 1400
const DEFAULT_ZOOM = 15
const DEFAULT_CENTER = { lat: 0, lng: 0 }

interface GoogleMapProviderProps extends MapProviderProps {
  apiKey: string
  onLoadError?: (message: string) => void
}

export function GoogleMapProvider({
  myLocation,
  partnerLocation,
  zoom = DEFAULT_ZOOM,
  mapId,
  onCameraChange,
  initialCamera,
  apiKey,
  onLoadError,
}: GoogleMapProviderProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapsRef = useRef<any>(null)
  const mapRef = useRef<any>(null)
  const myMarkerRef = useRef<any>(null)
  const partnerMarkerRef = useRef<any>(null)
  const listenersRef = useRef<any[]>([])
  const hasCenteredRef = useRef(false)
  const lastFitBoundsAtRef = useRef(0)
  const ignoreCameraChangeRef = useRef(false)
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
        const map = new maps.Map(mapContainerRef.current, {
          center,
          zoom: initialCamera?.zoom ?? zoom,
          mapId: mapId || undefined,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
        })

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
      myMarkerRef.current?.setMap?.(null)
      partnerMarkerRef.current?.setMap?.(null)
      myMarkerRef.current = null
      partnerMarkerRef.current = null
      mapRef.current = null
      mapsRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isReady || !mapsRef.current || !mapRef.current) return

    const maps = mapsRef.current
    const map = mapRef.current

    const updateMarker = (
      markerRef: { current: any },
      location: { lat: number; lng: number } | null,
      color: string
    ) => {
      if (!location) {
        if (markerRef.current) {
          markerRef.current.setMap(null)
          markerRef.current = null
        }
        return
      }

      if (!markerRef.current) {
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
        return
      }

      markerRef.current.setPosition(location)
    }

    updateMarker(myMarkerRef, myLocation, '#2196F3')
    updateMarker(partnerMarkerRef, partnerLocation, '#E91E63')

    if (myLocation && partnerLocation) {
      const now = Date.now()
      if (now - lastFitBoundsAtRef.current >= FIT_BOUNDS_INTERVAL_MS) {
        ignoreCameraChangeRef.current = true
        const bounds = new maps.LatLngBounds()
        bounds.extend(myLocation)
        bounds.extend(partnerLocation)
        map.fitBounds(bounds, 56)
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
  }, [isReady, myLocation, partnerLocation, zoom, initialCamera?.zoom])

  return <div ref={mapContainerRef} className="h-full w-full bg-[#111827]" />
}

