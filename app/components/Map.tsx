/**
 * Client-only Map Component
 * 
 * This component is dynamically imported to avoid SSR issues with Leaflet.
 * Leaflet requires `window` which doesn't exist during server-side rendering.
 */

import { useEffect, useState, useRef } from 'react'

interface Location {
  lat: number
  lng: number
}

interface MapProps {
  myLocation: Location | null
  partnerLocation: Location | null
  zoom?: number
}

// Dynamically import Leaflet to avoid SSR issues
export function Map({ myLocation, partnerLocation, zoom = 15 }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return

    let isMounted = true

    const initMap = async () => {
      // Dynamically import Leaflet
      const L = await import('leaflet')
      
      if (!isMounted || !mapRef.current) return

      // Import CSS
      await import('leaflet/dist/leaflet.css')

      // Fix default icon
      const icon = (await import('leaflet/dist/images/marker-icon.png')).default
      const iconShadow = (await import('leaflet/dist/images/marker-shadow.png')).default
      
      const DefaultIcon = L.icon({
        iconUrl: icon,
        shadowUrl: iconShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })
      L.Marker.prototype.options.icon = DefaultIcon

      const center = myLocation || { lat: 0, lng: 0 }

      // Create map
      const map = L.map(mapRef.current, {
        zoomControl: false,
      }).setView([center.lat, center.lng], zoom)

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      mapInstanceRef.current = map
      setIsReady(true)

      // Add markers if locations are available
      if (myLocation) {
        const myMarker = L.marker([myLocation.lat, myLocation.lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="width: 24px; height: 24px; background: #2196F3; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
        }).addTo(map)
        markersRef.current.push(myMarker)
      }

      if (partnerLocation) {
        const partnerMarker = L.marker([partnerLocation.lat, partnerLocation.lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="width: 24px; height: 24px; background: #E91E63; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
        }).addTo(map)
        markersRef.current.push(partnerMarker)
      }

      // Fit bounds if both locations available
      if (myLocation && partnerLocation) {
        const bounds = L.latLngBounds(
          [myLocation.lat, myLocation.lng],
          [partnerLocation.lat, partnerLocation.lng]
        )
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }

    initMap()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, []) // Only run once on mount

  // Update markers when locations change
  useEffect(() => {
    if (!isReady || !mapInstanceRef.current) return

    const updateMarkers = async () => {
      const L = await import('leaflet')
      const map = mapInstanceRef.current

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []

      // Add my location marker
      if (myLocation) {
        const myMarker = L.marker([myLocation.lat, myLocation.lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="width: 24px; height: 24px; background: #2196F3; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
        }).addTo(map)
        markersRef.current.push(myMarker)
      }

      // Add partner location marker
      if (partnerLocation) {
        const partnerMarker = L.marker([partnerLocation.lat, partnerLocation.lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="width: 24px; height: 24px; background: #E91E63; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
        }).addTo(map)
        markersRef.current.push(partnerMarker)
      }

      // Fit bounds or pan to location
      if (myLocation && partnerLocation) {
        const bounds = L.latLngBounds(
          [myLocation.lat, myLocation.lng],
          [partnerLocation.lat, partnerLocation.lng]
        )
        map.fitBounds(bounds, { padding: [50, 50] })
      } else if (myLocation) {
        map.setView([myLocation.lat, myLocation.lng], zoom)
      }
    }

    updateMarkers()
  }, [myLocation, partnerLocation, isReady, zoom])

  return (
    <div 
      ref={mapRef} 
      className="h-full w-full"
      style={{ background: '#1a1a1a' }}
    />
  )
}

/**
 * Hook to check if we're in browser environment
 */
export function useIsBrowser() {
  const [isBrowser, setIsBrowser] = useState(false)
  
  useEffect(() => {
    setIsBrowser(true)
  }, [])
  
  return isBrowser
}
