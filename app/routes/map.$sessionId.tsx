import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { convexMutation, convexQuery } from '@/lib/convex'
import { storage } from '@/lib/storage'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

const myIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="width: 24px; height: 24px; background: #2196F3; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const partnerIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="width: 24px; height: 24px; background: #E91E63; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export const Route = createFileRoute('/map/$sessionId')({
  component: MapPage,
  beforeLoad: async () => {
    return {}
  },
})

interface Session {
  _id: string
  code: string
  user1Id: string
  user2Id: string | null
  status: 'waiting' | 'active' | 'closed'
}

interface Location {
  lat: number
  lng: number
  accuracy: number
}

function MapBoundsUpdater({ myLocation, partnerLocation }: { myLocation: Location | null; partnerLocation: Location | null }) {
  const map = useMap()
  useEffect(() => {
    if (myLocation && partnerLocation) {
      const bounds = L.latLngBounds(
        [myLocation.lat, myLocation.lng],
        [partnerLocation.lat, partnerLocation.lng]
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    } else if (myLocation) {
      map.setView([myLocation.lat, myLocation.lng], 15)
    }
  }, [myLocation, partnerLocation, map])
  return null
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function MapPage() {
  const { sessionId } = useParams({ from: '/map/$sessionId' })
  const navigate = useNavigate()
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [myLocation, setMyLocation] = useState<Location | null>(null)
  const [partnerLocation, setPartnerLocation] = useState<Location | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userId = storage.getUserId()

  // Check auth
  useEffect(() => {
    setIsAuthenticated(storage.isAuthenticated())
  }, [])

  // Watch location
  useEffect(() => {
    if (!navigator.geolocation || !isAuthenticated) return

    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => console.error('Location error:', err),
      { enableHighAccuracy: true }
    )

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => console.error('Watch error:', err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [isAuthenticated])

  // Send location and poll for updates
  useEffect(() => {
    if (!sessionId || !userId || !isAuthenticated) return

    const update = async () => {
      try {
        // Send my location
        if (myLocation) {
          await convexMutation('locations:update', {
            sessionId,
            userId,
            lat: myLocation.lat,
            lng: myLocation.lng,
            accuracy: myLocation.accuracy,
          })
        }

        // Get session and partner location
        const [sessionData, partnerLoc] = await Promise.all([
          convexQuery<Session>('sessions:get', { sessionId }),
          convexQuery<Location | null>('locations:getPartnerLocation', { sessionId, userId }),
        ])

        setSession(sessionData)
        setPartnerLocation(partnerLoc)
      } catch (err) {
        console.error('Update error:', err)
      }
    }

    update()
    const interval = setInterval(update, 2000)
    return () => clearInterval(interval)
  }, [sessionId, userId, myLocation, isAuthenticated])

  const handleEndSession = async () => {
    if (!sessionId || !userId) return
    setIsLoading(true)
    try {
      await convexMutation('sessions:close', { sessionId, userId })
      navigate({ to: '/session' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session')
      setIsLoading(false)
    }
  }

  const distance = (() => {
    if (!myLocation || !partnerLocation) return null
    return calculateDistance(myLocation.lat, myLocation.lng, partnerLocation.lat, partnerLocation.lng)
  })()

  const isPartnerConnected = !!partnerLocation

  // Loading check
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-[#FF035B] rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />
  }

  return (
    <div className="relative h-screen w-full">
      <MapContainer center={[myLocation?.lat || 0, myLocation?.lng || 0]} zoom={15} className="h-full w-full" zoomControl={false}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {myLocation && <Marker position={[myLocation.lat, myLocation.lng]} icon={myIcon} />}
        {partnerLocation && <Marker position={[partnerLocation.lat, partnerLocation.lng]} icon={partnerIcon} />}
        <MapBoundsUpdater myLocation={myLocation} partnerLocation={partnerLocation} />
      </MapContainer>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[400] p-4">
        <div className="flex items-start justify-between">
          <button className="w-11 h-11 bg-[#141D2B]/90 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Menu className="w-6 h-6 text-white" />
          </button>

          <div className="bg-[#141D2B]/90 backdrop-blur-sm rounded-2xl px-4 py-3 flex-1 mx-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-xs">Session Code</p>
                <p className="text-white text-xl font-bold">{session?.code || '...'}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPartnerConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className={`text-sm ${isPartnerConnected ? 'text-green-500' : 'text-yellow-500'}`}>
                  {isPartnerConnected ? 'Connected' : 'Waiting'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isPartnerConnected && distance && (
          <div className="mt-4 flex justify-center">
            <div className="bg-[#FF035B] rounded-full px-6 py-3">
              <p className="text-white/80 text-xs text-center">Distance</p>
              <p className="text-white text-xl font-bold text-center">{formatDistance(distance)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-[400] p-4">
        {error && <p className="text-red-400 text-center mb-4 bg-[#141D2B]/90 p-2 rounded-lg">{error}</p>}
        <Button onClick={handleEndSession} isLoading={isLoading} disabled={isLoading} className="w-full">
          {isLoading ? 'Ending...' : 'End Session'}
        </Button>
      </div>
    </div>
  )
}

// Need to import Navigate for the redirect
import { Navigate } from '@tanstack/react-router'

export default MapPage
