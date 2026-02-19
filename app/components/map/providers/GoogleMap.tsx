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
  const advancedMarkerCtorRef = useRef<any>(null)
  const latLngBoundsCtorRef = useRef<any>(null)
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
      myMarkerRef.current = null
      partnerMarkerRef.current = null
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

    updateMarker(myMarkerRef, myLocation, '#2196F3')
    updateMarker(partnerMarkerRef, partnerLocation, '#E91E63')

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
  }, [isReady, myLocation, partnerLocation, zoom, initialCamera?.zoom])

  return <div ref={mapContainerRef} className="h-full w-full bg-[#111827]" />
}

