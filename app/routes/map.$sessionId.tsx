import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { convexMutation, convexQuery } from '@/lib/convex'
import { storage } from '@/lib/storage'
import { useGeolocation, useLocationUpdater, calculateDistance, formatDistance } from '@/hooks/useLocation'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet default marker icons
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

// Custom markers
const myIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: #2196F3;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const partnerIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: #E91E63;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export const Route = createFileRoute('/map/$sessionId')({
  component: MapPage,
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
  timestamp: number
}

function MapBoundsUpdater({ 
  myLocation, 
  partnerLocation 
}: { 
  myLocation: Location | null
  partnerLocation: Location | null 
}) {
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

function MapPage() {
  const { sessionId } = useParams({ from: '/map/$sessionId' })
  const navigate = useNavigate()
  
  const [session, setSession] = useState<Session | null>(null)
  const [partnerLocation, setPartnerLocation] = useState<Location | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const userId = storage.getUserId()
  
  const { location: myLocation, startWatching, stopWatching } = useGeolocation(5000)
  const { sendLocation } = useLocationUpdater()
  
  // Calculate distance
  const distance = (() => {
    if (!myLocation || !partnerLocation) return null
    return calculateDistance(
      myLocation.lat,
      myLocation.lng,
      partnerLocation.lat,
      partnerLocation.lng
    )
  })()
  
  // Start watching location
  useEffect(() => {
    startWatching()
    return () => stopWatching()
  }, [startWatching, stopWatching])
  
  // Send location updates
  useEffect(() => {
    if (sessionId && myLocation) {
      sendLocation(sessionId, myLocation)
    }
  }, [sessionId, myLocation, sendLocation])
  
  // Fetch session and poll for partner location
  useEffect(() => {
    if (!sessionId || !userId) return
    
    const fetchData = async () => {
      try {
        // Get session
        const sessionData = await convexQuery<Session>('sessions:get', { sessionId })
        setSession(sessionData)
        
        // Get partner location
        const partnerLoc = await convexQuery<Location | null>('locations:getPartnerLocation', {
          sessionId,
          userId,
        })
        setPartnerLocation(partnerLoc)
      } catch (err) {
        console.error('Failed to fetch data:', err)
      }
    }
    
    fetchData()
    
    // Poll every 2 seconds
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [sessionId, userId])
  
  const handleEndSession = async () => {
    if (!sessionId || !userId) return
    
    setIsLoading(true)
    
    try {
      await convexMutation('sessions:close', {
        sessionId,
        userId,
      })
      
      stopWatching()
      navigate({ to: '/session' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session')
    } finally {
      setIsLoading(false)
    }
  }
  
  const isPartnerConnected = !!partnerLocation
  
  return (
    <div className="relative h-screen w-full">
      {/* Map */}
      <MapContainer
        center={[myLocation?.latitude || 0, myLocation?.longitude || 0]}
        zoom={15}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {myLocation && (
          <Marker
            position={[myLocation.latitude, myLocation.longitude]}
            icon={myIcon}
          />
        )}
        
        {partnerLocation && (
          <Marker
            position={[partnerLocation.lat, partnerLocation.lng]}
            icon={partnerIcon}
          />
        )}
        
        <MapBoundsUpdater 
          myLocation={myLocation ? { lat: myLocation.latitude, lng: myLocation.longitude } : null}
          partnerLocation={partnerLocation}
        />
      </MapContainer>
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[400] p-4">
        <div className="flex items-start justify-between">
          {/* Menu Button */}
          <button className="w-11 h-11 bg-[#141D2B]/90 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Menu className="w-6 h-6 text-white" />
          </button>
          
          {/* Session Info */}
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
        
        {/* Distance Card */}
        {isPartnerConnected && distance && (
          <div className="mt-4 flex justify-center">
            <div className="bg-[#FF035B] rounded-full px-6 py-3">
              <p className="text-white/80 text-xs text-center">Distance</p>
              <p className="text-white text-xl font-bold text-center">
                {formatDistance(distance)}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-[400] p-4">
        {error && (
          <p className="text-red-400 text-center mb-4 bg-[#141D2B]/90 p-2 rounded-lg">
            {error}
          </p>
        )}
        
        <Button
          onClick={handleEndSession}
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Ending...' : 'End Session'}
        </Button>
      </div>
    </div>
  )
}

export default MapPage
