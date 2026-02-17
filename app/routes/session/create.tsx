import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { User, Copy, Share2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { convexMutation, convexQuery } from '@/lib/convex'
import { storage } from '@/lib/storage'
import { useGeolocation, useLocationUpdater } from '@/hooks/useLocation'

import 'leaflet/dist/leaflet.css'

export const Route = createFileRoute('/session/create')({
  component: CreateSessionPage,
  beforeLoad: async () => {
    const auth = storage.getAuth()
    if (!auth.deviceId || !auth.userId) {
      throw new Error('NOT_AUTHENTICATED')
    }
    return { auth }
  },
  errorComponent: ({ error }) => {
    if (error.message === 'NOT_AUTHENTICATED') {
      return <Navigate to="/" />
    }
    return <div>Error: {error.message}</div>
  },
})

import { Navigate } from '@tanstack/react-router'

interface Session {
  _id: string
  code: string
  user1Id: string
  user2Id: string | null
  status: 'waiting' | 'active' | 'closed'
}

function MapUpdater({ location }: { location: { latitude: number; longitude: number } | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (location) {
      map.setView([location.latitude, location.longitude], 15)
    }
  }, [location, map])
  
  return null
}

function CreateSessionPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [code, setCode] = useState<string>('')
  const [copied, setCopied] = useState(false)
  
  const userId = storage.getUserId()
  const { location, startWatching, stopWatching, isWatching } = useGeolocation(5000)
  const { sendLocation } = useLocationUpdater()
  
  // Start watching location when session is created
  useEffect(() => {
    if (session && !isWatching) {
      startWatching()
    }
  }, [session, isWatching, startWatching])
  
  // Send location updates to Convex
  useEffect(() => {
    if (session && location) {
      sendLocation(session._id, location)
    }
  }, [session, location, sendLocation])
  
  // Poll for session status (wait for partner)
  useEffect(() => {
    if (!session) return
    
    const interval = setInterval(async () => {
      try {
        const updatedSession = await convexQuery<Session>('sessions:get', {
          sessionId: session._id,
        })
        
        if (updatedSession?.user2Id) {
          // Partner joined!
          navigate({ to: '/map/$sessionId', params: { sessionId: session._id } })
        }
      } catch (err) {
        console.error('Failed to poll session:', err)
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [session, navigate])
  
  const handleCreate = async () => {
    if (!userId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await convexMutation<{ sessionId: string; code: string }>('sessions:create', {
        userId,
      })
      
      setSession({
        _id: result.sessionId,
        code: result.code,
        user1Id: userId,
        user2Id: null,
        status: 'waiting',
      })
      setCode(result.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  const handleShare = async () => {
    const shareData = {
      title: 'Join my Man2Man session',
      text: `Join my location sharing session with code: ${code}`,
      url: `${window.location.origin}/session/join?code=${code}`,
    }
    
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // User cancelled
      }
    } else {
      // Fallback to copy
      handleCopy()
    }
  }
  
  const handleCancel = () => {
    stopWatching()
    navigate({ to: '/session' })
  }
  
  // State 1: Initial - No session created yet
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isLoading ? 'Creating session...' : 'Create Session'}
          </h1>
          <p className="text-white/60 mb-12">
            Generate a code to share with your partner
          </p>
          
          {/* Animated Icon */}
          <div className="relative w-32 h-32 mx-auto mb-12">
            {/* Outer ring */}
            <div className={`absolute inset-0 rounded-full ${isLoading ? 'bg-yellow-500/20 animate-pulse' : 'bg-rose-500/20'}`} />
            {/* Middle ring */}
            <div className={`absolute inset-4 rounded-full ${isLoading ? 'bg-yellow-500/30' : 'bg-rose-500/30'}`} />
            {/* Inner circle */}
            <div className={`absolute inset-8 rounded-full flex items-center justify-center ${isLoading ? 'bg-yellow-500' : 'bg-rose-500'}`}>
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          
          {error && (
            <p className="text-red-400 mb-4">{error}</p>
          )}
          
          <Button
            onClick={handleCreate}
            isLoading={isLoading}
            disabled={isLoading}
            className="w-full"
          >
            Create Session
          </Button>
        </div>
      </div>
    )
  }
  
  // State 2: Session Created - Show map with bottom sheet
  return (
    <div className="relative h-screen w-full">
      {/* Map */}
      <MapContainer
        center={[location?.latitude || 0, location?.longitude || 0]}
        zoom={15}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {location && (
          <Marker
            position={[location.latitude, location.longitude]}
          />
        )}
        <MapUpdater location={location} />
      </MapContainer>
      
      {/* Waiting indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400]">
        <div className="bg-[#141D2B]/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-yellow-500 text-sm font-medium">Waiting for partner...</span>
        </div>
      </div>
      
      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#141D2B] rounded-t-3xl p-6 z-[400]">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
        
        <div className="text-center">
          <p className="text-white/60 text-sm mb-4">Your Session Code</p>
          
          {/* Code Display */}
          <div className="text-4xl font-bold text-white tracking-[0.5em] mb-6">
            {code.split('').join(' ')}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Button
              variant="secondary"
              onClick={handleCopy}
              className="flex-1"
            >
              {copied ? (
                'Copied!'
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={handleShare}
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
          
          {/* Waiting indicator */}
          <div className="flex items-center justify-center gap-2 text-white/60 mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for partner to join...</span>
          </div>
          
          {/* Cancel button */}
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full"
          >
            Cancel Session
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CreateSessionPage
