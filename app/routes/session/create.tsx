import { createFileRoute, useNavigate, Navigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { User, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { convexMutation, convexQuery } from '@/lib/convex'
import { storage } from '@/lib/storage'
import { SessionDetailsBottomSheet } from '@/components/session/SessionDetailsBottomSheet'

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

interface PartnerJoinStatus {
  joined: boolean
  state: 'waiting' | 'joined' | 'expired' | 'missing' | 'closed'
}

function CreateSessionPage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [code, setCode] = useState<string>('')
  const [sessionCreatedAt, setSessionCreatedAt] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
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
      () => {
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
      () => { /* watch error */ },
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
      } catch {
        // Location send failed - will retry on next interval
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
    let hasTerminalRedirected = false
    let consecutiveErrors = 0
    const maxConsecutiveErrors = 5
    let interval: ReturnType<typeof setInterval> | null = null

    const pollSession = async () => {
      if (!isActive) return
      
      try {
        // Use the dedicated hasPartnerJoined query for efficiency
        // console.log(`[Create] Polling for partner joined - session: ${session._id}`)
        const result = await convexQuery<PartnerJoinStatus>('locationSessions:hasPartnerJoined', {
          sessionId: session._id,
        })

        // console.log(`[Create] Poll result:`, result)
        consecutiveErrors = 0 // Reset error count on success

        if (
          !hasTerminalRedirected &&
          (result.state === 'expired' || result.state === 'missing' || result.state === 'closed')
        ) {
          hasTerminalRedirected = true
          isActive = false
          if (interval) {
            clearInterval(interval)
          }

          setError('Session expired after 5 minutes. Returning to session menu...')
          void navigate({ to: '/session' })
          return
        }

        if (result.joined || result.state === 'joined') {
          // console.log('[Create] Partner joined! Redirecting to map...', {
          //   sessionId: session._id,
          //   code: session.code
          // })
          setPartnerJoined(true)
          // Navigate to map page
          try {
            await navigate({ to: '/map/$sessionId', params: { sessionId: session._id } })
            // console.log('[Create] Navigation successful')
          } catch {
            setError('Partner joined! Click below to go to map.')
          }
        }
      } catch {
        consecutiveErrors++

        if (consecutiveErrors >= maxConsecutiveErrors) {
          setError('Connection lost. Please refresh the page.')
        }
      }
    }

    // Poll immediately
    pollSession()
    
    // Then poll every 2 seconds
    interval = setInterval(pollSession, 2000)
    
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
    setSessionCreatedAt(null)
    setPartnerJoined(false)

    try {
      // console.log('[Create] Creating new session...')
      const result = await convexMutation<{ sessionId: string; code: string }>('locationSessions:create', {
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
      setSessionCreatedAt(Date.now())
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
    } catch {
      // Clipboard API not available
    }
  }

  const handleShare = async () => {
    if (isSharing) return

    const joinUrl = `${window.location.origin}/session/join?code=${code}`
    const shareData = {
      title: 'Join my Man2Man session',
      // Keep a single canonical URL in text to avoid duplicates on some share targets.
      text: `Join my location sharing session with code: ${code}\n${joinUrl}`,
    }

    setIsSharing(true)
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled
      } finally {
        setIsSharing(false)
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Clipboard API not available
      } finally {
        setIsSharing(false)
      }
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

      <SessionDetailsBottomSheet
        code={code}
        createdAt={sessionCreatedAt}
        copied={copied}
        isSharing={isSharing}
        partnerJoined={partnerJoined}
        error={error}
        onCopy={handleCopy}
        onShare={handleShare}
        onCancel={handleCancel}
        onCreateNew={() => {
          // console.log('[Create] Manual refresh - creating new session')
          setSession(null)
          setCode('')
          setSessionCreatedAt(null)
          setPartnerJoined(false)
          handleCreate()
        }}
        onGoToMap={() => navigate({ to: '/map/$sessionId', params: { sessionId: session._id } })}
      />
    </div>
  )
}

export default CreateSessionPage
