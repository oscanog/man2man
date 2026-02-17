import { createFileRoute, useNavigate, Navigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { User, Copy, Share2, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { convexMutation, convexQuery } from '@/lib/convex'
import { storage } from '@/lib/storage'

// Lazy load map component to avoid SSR issues
const Map = lazy(() => import('@/components/Map').then(m => ({ default: m.Map })))

export const Route = createFileRoute('/session/create')({
  component: CreateSessionPage,
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

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
}

function CreateSessionPage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [code, setCode] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [partnerJoined, setPartnerJoined] = useState(false)

  const userId = storage.getUserId()

  // Check auth client-side
  useEffect(() => {
    setIsAuthenticated(storage.isAuthenticated())
  }, [])

  // Start watching location
  const startWatchingLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setIsMapReady(true)
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setIsMapReady(true)
      },
      (err) => {
        console.error('Location error:', err)
        // Still allow session creation even without location
        setIsMapReady(true)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (err) => console.error('Watch error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Send location updates to Convex
  useEffect(() => {
    if (!session || !location || !userId) return

    const sendLocation = async () => {
      try {
        await convexMutation('locations:update', {
          sessionId: session._id,
          userId,
          lat: location.latitude,
          lng: location.longitude,
          accuracy: location.accuracy,
        })
      } catch (err) {
        console.error('Failed to send location:', err)
      }
    }

    sendLocation()
    const interval = setInterval(sendLocation, 5000)
    return () => clearInterval(interval)
  }, [session, location, userId])

  // Poll for session status - more robust version
  useEffect(() => {
    if (!session?._id) return

    let isActive = true
    let consecutiveErrors = 0
    const maxConsecutiveErrors = 5

    const pollSession = async () => {
      if (!isActive) return
      
      try {
        // Use the dedicated hasPartnerJoined query for efficiency
        // console.log(`[Create] Polling for partner joined - session: ${session._id}`)
        const result = await convexQuery<{ joined: boolean }>('sessions:hasPartnerJoined', {
          sessionId: session._id,
        })

        // console.log(`[Create] Poll result:`, result)
        consecutiveErrors = 0 // Reset error count on success

        if (result.joined) {
          // console.log('[Create] Partner joined! Redirecting to map...', {
          //   sessionId: session._id,
          //   code: session.code
          // })
          setPartnerJoined(true)
          // Navigate to map page
          try {
            await navigate({ to: '/map/$sessionId', params: { sessionId: session._id } })
            // console.log('[Create] Navigation successful')
          } catch (navErr) {
            console.error('[Create] Navigation failed:', navErr)
            // Show manual button
            setError('Partner joined! Click below to go to map.')
          }
        }
      } catch (err) {
        consecutiveErrors++
        console.error(`[Create] Poll error (${consecutiveErrors}/${maxConsecutiveErrors}):`, err)
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error('[Create] Too many polling errors, stopping poll')
          setError('Connection lost. Please refresh the page.')
        }
      }
    }

    // Poll immediately
    pollSession()
    
    // Then poll every 2 seconds
    const interval = setInterval(pollSession, 2000)
    
    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [session, navigate])

  const handleCreate = async () => {
    if (!userId) {
      setError('User not authenticated')
      return
    }

    setIsLoading(true)
    setError(null)
    // Clear any previous session data
    setSession(null)
    setCode('')
    setPartnerJoined(false)

    try {
      // console.log('[Create] Creating new session...')
      const result = await convexMutation<{ sessionId: string; code: string }>('sessions:create', {
        userId,
      })
      
      // console.log('[Create] Session created:', result)

      setSession({
        _id: result.sessionId,
        code: result.code,
        user1Id: userId,
        user2Id: null,
        status: 'waiting',
      })
      setCode(result.code)
      startWatchingLocation()
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
      } catch {
        // User cancelled
      }
    } else {
      handleCopy()
    }
  }

  const handleCancel = () => {
    navigate({ to: '/session' })
  }

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

  // State 1: Initial
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isLoading ? 'Creating session...' : 'Create Session'}
          </h1>
          <p className="text-white/60 mb-12">Generate a code to share with your partner</p>

          {/* Animated Icon */}
          <div className="relative w-32 h-32 mx-auto mb-12">
            <div className={`absolute inset-0 rounded-full ${isLoading ? 'bg-yellow-500/20 animate-pulse' : 'bg-rose-500/20'}`} />
            <div className={`absolute inset-4 rounded-full ${isLoading ? 'bg-yellow-500/30' : 'bg-rose-500/30'}`} />
            <div className={`absolute inset-8 rounded-full flex items-center justify-center ${isLoading ? 'bg-yellow-500' : 'bg-rose-500'}`}>
              <User className="w-8 h-8 text-white" />
            </div>
          </div>

          {error && <p className="text-red-400 mb-4">{error}</p>}

          <Button onClick={handleCreate} isLoading={isLoading} disabled={isLoading} className="w-full">
            Create Session
          </Button>
        </div>
      </div>
    )
  }

  // Debug logging
  // console.log('[Create] Rendering session UI:', { sessionId: session._id, code, partnerJoined })

  // State 2: Session Created - Show map with bottom sheet
  return (
    <div className="relative h-screen w-full">
      {/* Map - Client only */}
      {isMapReady && (
        <Suspense fallback={
          <div className="h-full w-full bg-[#0A1628] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF035B]" />
          </div>
        }>
          <Map 
            myLocation={location ? { lat: location.latitude, lng: location.longitude } : null}
            partnerLocation={null}
          />
        </Suspense>
      )}

      {/* Status indicator - changes when partner joins */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400]">
        {partnerJoined ? (
          <div className="bg-green-500/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-lg animate-pulse">
            <Users className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">Partner connected!</span>
          </div>
        ) : (
          <div className="bg-[#141D2B]/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-yellow-500 text-sm font-medium">Waiting for partner...</span>
          </div>
        )}
      </div>

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#141D2B] rounded-t-3xl p-6 z-[400]">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        <div className="text-center">
          <p className="text-white/60 text-sm mb-4">Your Session Code</p>

          <div className="text-4xl font-bold text-white tracking-[0.5em] mb-6">
            {code.split('').join(' ')}
          </div>

          <div className="flex gap-3 mb-6">
            <Button variant="secondary" onClick={handleCopy} className="flex-1">
              {copied ? 'Copied!' : <><Copy className="w-4 h-4 mr-2" />Copy</>}
            </Button>
            <Button variant="secondary" onClick={handleShare} className="flex-1">
              <Share2 className="w-4 h-4 mr-2" />Share
            </Button>
          </div>

          {partnerJoined ? (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 text-green-500 mb-3">
                <Users className="w-4 h-4" />
                <span>Partner joined!</span>
              </div>
              <Button 
                onClick={() => navigate({ to: '/map/$sessionId', params: { sessionId: session._id } })}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                Go to Map
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-white/60 mb-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for partner to join...</span>
            </div>
          )}

          {error && <p className="text-red-400 mb-4">{error}</p>}

          <Button variant="outline" onClick={handleCancel} className="w-full mb-3">
            Cancel Session
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => {
              // console.log('[Create] Manual refresh - creating new session')
              setSession(null)
              setCode('')
              setPartnerJoined(false)
              handleCreate()
            }} 
            className="w-full"
          >
            Create New Session
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CreateSessionPage
