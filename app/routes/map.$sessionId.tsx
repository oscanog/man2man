import { createFileRoute, useNavigate, useParams, Navigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react'
import { Menu, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import {
  AlreadyConnectedDialog,
  IncomingInviteDialog,
  InviteSendConfirmDialog,
  LeaveCurrentSessionConfirmDialog,
  OutgoingPendingDialog,
} from '@/components/modals/SessionInviteDialogs'
import { OnlineUsersDrawer } from '@/components/sidebar/OnlineUsersDrawer'
import type { OnlineUser } from '@/hooks'
import { useSessionInvites } from '@/hooks/useSessionInvites'
import { Button } from '@/components/ui/Button'
import { convexMutation, convexQuery } from '@/lib/convex'
import { useOnlineUsers } from '@/hooks/useOnlineUsers'
import { storage } from '@/lib/storage'

// Lazy load map component to avoid SSR issues
const Map = lazy(() => import('@/components/Map').then(m => ({ default: m.Map })))

export const Route = createFileRoute('/map/$sessionId')({
  component: MapPage,
  beforeLoad: async () => {
    return {}
  },
})

interface User {
  _id: string
  username: string
}

interface Session {
  _id: string
  code: string
  user1Id: string
  user2Id: string | null
  status: 'waiting' | 'active' | 'closed'
  user1: User | null
  user2: User | null
}

interface ParticipantState {
  exists: boolean
  status: 'waiting' | 'active' | 'closed' | 'missing'
  isParticipant: boolean
  role: 'host' | 'guest' | 'none'
  canSendLocation: boolean
}

interface Location {
  lat: number
  lng: number
  accuracy: number
}

interface LocationUpdateResult {
  success: boolean
}

interface UpdateError {
  message: string
  timestamp: number
  isRecoverable: boolean
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

/**
 * Exponential backoff delay calculation
 */
function getBackoffDelay(attempt: number, baseDelay: number = 1000): number {
  const delay = baseDelay * Math.pow(2, attempt)
  return delay + (Math.random() * delay * 0.25)
}

const EXIT_CONFIRMATION_COUNT = 2

function MapPage() {
  const { sessionId } = useParams({ from: '/map/$sessionId' })
  const navigate = useNavigate()

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [partnerUser, setPartnerUser] = useState<User | null>(null)
  const [myLocation, setMyLocation] = useState<Location | null>(null)
  const [partnerLocation, setPartnerLocation] = useState<Location | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [isUsersDrawerOpen, setIsUsersDrawerOpen] = useState(false)
  const [selectedInviteTarget, setSelectedInviteTarget] = useState<OnlineUser | null>(null)
  const [leaveToInviteTarget, setLeaveToInviteTarget] = useState<OnlineUser | null>(null)
  const [leaveForInviteError, setLeaveForInviteError] = useState<string | null>(null)
  const [isLeavingForInvite, setIsLeavingForInvite] = useState(false)
  const [alreadyConnectedName, setAlreadyConnectedName] = useState<string | null>(null)

  // Connection and retry state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected')
  const [updateError, setUpdateError] = useState<UpdateError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isManualRetrying, setIsManualRetrying] = useState(false)

  // Refs for managing intervals and retry logic
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const consecutiveErrorsRef = useRef(0)
  const isUpdatingRef = useRef(false)
  const lastPartnerPollRef = useRef(0)
  const hasExitedSessionRef = useRef(false)
  const handledInviteSessionIdRef = useRef<string | null>(null)
  const terminalSessionSignalsRef = useRef(0)
  const nonParticipantSignalsRef = useRef(0)

  const userId = storage.getUserId()
  const username = storage.getUsername()
  const isHost = session?.user1Id === userId
  const isPartnerConnected = !!session?.user2Id && session?.status === 'active'
  const partnerName = partnerUser?.username?.trim() || null
  const currentPartnerId = session?.user1Id === userId
    ? session.user2Id
    : session?.user2Id === userId
      ? session.user1Id
      : null
  const connectedPartnerLabel = partnerName ? `@${partnerName}` : '@unknown'
  const waitingSecondaryLabel = isHost ? 'No partner yet' : 'Syncing session'
  const { users: onlineUsers, isLoading: isOnlineUsersLoading, error: onlineUsersError } = useOnlineUsers(isUsersDrawerOpen)
  const {
    incomingInvite,
    outgoingInvite,
    actionError: inviteActionError,
    isSendingInvite,
    isRespondingInvite,
    isCancellingInvite,
    sendInvite,
    respondToInvite,
    cancelOutgoingInvite,
    clearActionError,
  } = useSessionInvites(userId)

  const handleTerminalExit = useCallback((message: string, route: 'session' | 'join' = 'session') => {
    if (hasExitedSessionRef.current) return
    hasExitedSessionRef.current = true

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current)
      updateIntervalRef.current = null
    }

    setError(message)
    setIsUsersDrawerOpen(false)
    setSelectedInviteTarget(null)
    setLeaveToInviteTarget(null)
    setLeaveForInviteError(null)
    setAlreadyConnectedName(null)
    setConnectionStatus('disconnected')
    setUpdateError(null)

    setTimeout(() => {
      if (route === 'join') {
        navigate({ to: '/session/join', search: { code: undefined, from: undefined } })
        return
      }
      navigate({ to: '/session' })
    }, 1200)
  }, [navigate])

  // Check auth
  useEffect(() => {
    setIsAuthenticated(storage.isAuthenticated())
  }, [])

  useEffect(() => {
    if (!outgoingInvite || outgoingInvite.status !== 'accepted' || !outgoingInvite.sessionId) {
      return
    }

    if (handledInviteSessionIdRef.current === outgoingInvite.sessionId) {
      return
    }

    handledInviteSessionIdRef.current = outgoingInvite.sessionId
    setSelectedInviteTarget(null)
    setIsUsersDrawerOpen(false)

    if (outgoingInvite.sessionId !== sessionId) {
      navigate({ to: '/map/$sessionId', params: { sessionId: outgoingInvite.sessionId } })
    }
  }, [outgoingInvite, navigate, sessionId])

  // Watch location
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation || !isAuthenticated) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        })
      },
      () => {
        setError('Unable to access your location. Please enable location services.')
      },
      { enableHighAccuracy: true }
    )

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      }),
      () => { /* location watch error - handled by error state */ },
      { enableHighAccuracy: true, maximumAge: 5000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [isAuthenticated])

  /**
   * Send location update with retry logic
   */
  const sendLocationUpdate = useCallback(async (location: Location, attempt = 0): Promise<boolean> => {
    const maxRetries = 3

    try {
      await convexMutation<LocationUpdateResult>('locations:update', {
        sessionId,
        userId,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
      }, {
        maxRetries: 0,
      })

      return true

    } catch (err) {
      if (attempt < maxRetries) {
        const delay = getBackoffDelay(attempt, 800)
        await new Promise(resolve => setTimeout(resolve, delay))
        return sendLocationUpdate(location, attempt + 1)
      }

      throw err
    }
  }, [sessionId, userId])

  const fetchParticipantState = useCallback(async (): Promise<ParticipantState> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    return await convexQuery<ParticipantState>('sessions:getParticipantState', {
      sessionId,
      userId,
    })
  }, [sessionId, userId])

  /**
   * Fetch session and partner location
   */
  const fetchSessionData = useCallback(async (): Promise<{ session: Session | null; partnerLoc: Location | null; partner: User | null }> => {
    const sessionData = await convexQuery<Session | null>('sessions:get', { sessionId })

    // Get partner location
    const partnerLoc = await convexQuery<Location | null>('locations:getPartnerLocation', { sessionId, userId })

    // Partner user data is now included in the session response
    const partner = sessionData?.user1Id === userId
      ? sessionData?.user2
      : sessionData?.user2Id === userId
        ? sessionData?.user1
        : null

    return { session: sessionData, partnerLoc, partner }
  }, [sessionId, userId])

  /**
   * Main update cycle with retry logic
   */
  const performUpdate = useCallback(async () => {
    if (isUpdatingRef.current || hasExitedSessionRef.current) {
      return
    }

    isUpdatingRef.current = true

    try {
      // Step 1: Confirm participant state before sending updates.
      let participantState: ParticipantState | null = null
      try {
        participantState = await fetchParticipantState()

        if (!participantState.exists || participantState.status === 'closed' || participantState.status === 'missing') {
          terminalSessionSignalsRef.current += 1
          if (terminalSessionSignalsRef.current >= EXIT_CONFIRMATION_COUNT) {
            handleTerminalExit('Session has ended. Returning to sessions...')
            return
          }
        } else {
          terminalSessionSignalsRef.current = 0
        }

        if (participantState.exists && !participantState.isParticipant) {
          nonParticipantSignalsRef.current += 1
          if (nonParticipantSignalsRef.current >= EXIT_CONFIRMATION_COUNT) {
            handleTerminalExit('You are not part of this session. Redirecting to join...', 'join')
            return
          }
        } else {
          nonParticipantSignalsRef.current = 0
        }
      } catch {
        // Participant-state query can fail on transient network issues.
      }

      // Step 2: Send location update only when backend allows it.
      if (myLocation && (participantState?.canSendLocation ?? true)) {
        try {
          await sendLocationUpdate(myLocation)
          consecutiveErrorsRef.current = 0

          if (updateError) {
            setUpdateError(null)
            setConnectionStatus('connected')
          }
        } catch (err) {
          consecutiveErrorsRef.current++
          const errorMessage = err instanceof Error ? err.message : 'Location update failed'
          const normalizedErrorMessage = errorMessage.toLowerCase()

          if (normalizedErrorMessage.includes('session is closed') ||
              normalizedErrorMessage.includes('session not found')) {
            terminalSessionSignalsRef.current += 1
            if (terminalSessionSignalsRef.current >= EXIT_CONFIRMATION_COUNT) {
              handleTerminalExit('Session has ended. Returning to sessions...')
              return
            }
          } else if (normalizedErrorMessage.includes('not in session') ||
              normalizedErrorMessage.includes('user not in session')) {
            nonParticipantSignalsRef.current += 1
            if (nonParticipantSignalsRef.current >= EXIT_CONFIRMATION_COUNT) {
              handleTerminalExit('You are not part of this session. Redirecting to join...', 'join')
              return
            }
          } else {
            setUpdateError({
              message: errorMessage,
              timestamp: Date.now(),
              isRecoverable: consecutiveErrorsRef.current < 5,
            })

            if (consecutiveErrorsRef.current >= 3) {
              setConnectionStatus('disconnected')
            } else if (consecutiveErrorsRef.current >= 1) {
              setConnectionStatus('reconnecting')
            }
          }
        }
      }

      // Step 3: Poll for session data for UI rendering.
      try {
        const { session: sessionData, partnerLoc, partner } = await fetchSessionData()

        if (!sessionData) {
          // Avoid immediate redirect on a single null snapshot.
          return
        }

        setSession(sessionData)
        setPartnerUser(partner)
        setIsSessionLoaded(true)
        setPartnerLocation(partnerLoc)
        lastPartnerPollRef.current = Date.now()
      } catch {
        // Session data fetch failed - will retry on next cycle.
      }

    } finally {
      isUpdatingRef.current = false
    }
  }, [myLocation, sendLocationUpdate, fetchParticipantState, fetchSessionData, updateError, handleTerminalExit])

  /**
   * Manual retry handler
   */
  const handleManualRetry = useCallback(async () => {
    if (hasExitedSessionRef.current) return

    if (!userId) {
      setError('User not authenticated')
      return
    }

    if (!myLocation) {
      setError('Location not available')
      return
    }

    setIsManualRetrying(true)
    setRetryCount(prev => prev + 1)

    try {
      const participantState = await fetchParticipantState()

      if (!participantState.exists || participantState.status === 'closed' || participantState.status === 'missing') {
        handleTerminalExit('Session has ended. Returning to sessions...')
        return
      }

      if (!participantState.isParticipant) {
        handleTerminalExit('You are not part of this session. Redirecting to join...', 'join')
        return
      }

      if (participantState.canSendLocation) {
        await sendLocationUpdate(myLocation)
      }

      const { session: sessionData, partnerLoc, partner } = await fetchSessionData()
      if (sessionData) {
        setSession(sessionData)
        setPartnerUser(partner)
        setPartnerLocation(partnerLoc)
        setIsSessionLoaded(true)
      }

      terminalSessionSignalsRef.current = 0
      nonParticipantSignalsRef.current = 0
      consecutiveErrorsRef.current = 0
      setUpdateError(null)
      setConnectionStatus('connected')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reconnection failed'
      const normalizedMessage = message.toLowerCase()

      if (normalizedMessage.includes('session is closed') || normalizedMessage.includes('session not found')) {
        handleTerminalExit('Session has ended. Returning to sessions...')
        return
      }

      if (normalizedMessage.includes('not in session') || normalizedMessage.includes('user not in session')) {
        handleTerminalExit('You are not part of this session. Redirecting to join...', 'join')
        return
      }

      setUpdateError({
        message,
        timestamp: Date.now(),
        isRecoverable: false,
      })
    } finally {
      setIsManualRetrying(false)
    }
  }, [myLocation, userId, fetchParticipantState, sendLocationUpdate, fetchSessionData, handleTerminalExit])

  // Set up periodic updates
  useEffect(() => {
    if (!sessionId || !userId || !isAuthenticated || hasExitedSessionRef.current) return

    performUpdate()

    updateIntervalRef.current = setInterval(performUpdate, 2000)

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [sessionId, userId, isAuthenticated, performUpdate])

  const handleOpenUsersDrawer = useCallback(() => {
    setAlreadyConnectedName(null)
    setIsUsersDrawerOpen(true)
  }, [])

  const handleCloseUsersDrawer = useCallback(() => {
    setIsUsersDrawerOpen(false)
  }, [])

  const handleOnlineUserClick = useCallback((user: OnlineUser) => {
    setIsUsersDrawerOpen(false)
    clearActionError()
    setLeaveForInviteError(null)
    setSelectedInviteTarget(null)
    setLeaveToInviteTarget(null)

    if (isPartnerConnected && currentPartnerId && user._id === currentPartnerId) {
      setAlreadyConnectedName(user.username || partnerName || 'this user')
      return
    }

    if (isPartnerConnected) {
      setLeaveToInviteTarget(user)
      return
    }

    setSelectedInviteTarget(user)
  }, [clearActionError, currentPartnerId, isPartnerConnected, partnerName])

  const handleDismissConfirmInvite = useCallback(() => {
    setSelectedInviteTarget(null)
    clearActionError()
  }, [clearActionError])

  const handleDismissLeaveToInvite = useCallback(() => {
    setLeaveToInviteTarget(null)
    setLeaveForInviteError(null)
    clearActionError()
  }, [clearActionError])

  const handleDismissAlreadyConnected = useCallback(() => {
    setAlreadyConnectedName(null)
  }, [])

  const handleConfirmSendInvite = useCallback(async () => {
    if (!selectedInviteTarget) {
      return
    }

    try {
      await sendInvite(selectedInviteTarget._id)
      setSelectedInviteTarget(null)
    } catch {
      // Error is surfaced by inviteActionError state.
    }
  }, [selectedInviteTarget, sendInvite])

  const handleConfirmLeaveAndInvite = useCallback(async () => {
    if (!leaveToInviteTarget || !sessionId || !userId) {
      return
    }

    const inviteTarget = leaveToInviteTarget
    let didCloseCurrentSession = false

    setIsLeavingForInvite(true)
    setLeaveForInviteError(null)
    clearActionError()

    try {
      await convexMutation('sessions:close', { sessionId, userId }, { maxRetries: 3 })
      didCloseCurrentSession = true
      hasExitedSessionRef.current = true

      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }

      setSelectedInviteTarget(null)
      setLeaveToInviteTarget(null)
      setIsUsersDrawerOpen(false)
      setAlreadyConnectedName(null)

      await sendInvite(inviteTarget._id)
      navigate({ to: '/session' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch session'
      if (didCloseCurrentSession) {
        navigate({ to: '/session' })
        return
      }
      setLeaveForInviteError(message)
    } finally {
      setIsLeavingForInvite(false)
    }
  }, [clearActionError, leaveToInviteTarget, navigate, sendInvite, sessionId, userId])

  const handleRespondInvite = useCallback(async (accept: boolean) => {
    if (!incomingInvite) {
      return
    }

    try {
      const result = await respondToInvite(incomingInvite._id, accept)
      if (accept && result.status === 'accepted' && result.sessionId && result.sessionId !== sessionId) {
        handledInviteSessionIdRef.current = result.sessionId
        navigate({ to: '/map/$sessionId', params: { sessionId: result.sessionId } })
      }
    } catch {
      // Error is surfaced by inviteActionError state.
    }
  }, [incomingInvite, navigate, respondToInvite, sessionId])

  const handleCancelOutgoing = useCallback(async () => {
    if (!outgoingInvite || outgoingInvite.status !== 'pending') {
      return
    }

    try {
      await cancelOutgoingInvite(outgoingInvite._id)
    } catch {
      // Error is surfaced by inviteActionError state.
    }
  }, [cancelOutgoingInvite, outgoingInvite])

  const handleEndSession = async () => {
    if (!sessionId || !userId) return
    setIsLoading(true)
    try {
      await convexMutation('sessions:close', { sessionId, userId }, { maxRetries: 3 })
      hasExitedSessionRef.current = true
      setIsUsersDrawerOpen(false)
      setSelectedInviteTarget(null)
      setLeaveToInviteTarget(null)
      setLeaveForInviteError(null)
      setAlreadyConnectedName(null)
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
      navigate({ to: '/session' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end session'
      setError(message)
      setIsLoading(false)
    }
  }

  const distance = (() => {
    if (!myLocation || !partnerLocation) return null
    return calculateDistance(myLocation.lat, myLocation.lng, partnerLocation.lat, partnerLocation.lng)
  })()

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

  // Determine connection status display
  const getConnectionStatusDisplay = () => {
    if (connectionStatus === 'disconnected') {
      return {
        icon: <WifiOff className="w-4 h-4" />,
        color: 'text-red-500',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/50',
        text: 'Connection lost',
      }
    }
    if (connectionStatus === 'reconnecting') {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/50',
        text: 'Reconnecting...',
      }
    }
    return null
  }

  const connectionDisplay = getConnectionStatusDisplay()

  return (
    <div className="relative h-screen w-full">
      <AlreadyConnectedDialog
        isOpen={Boolean(alreadyConnectedName)}
        connectedName={`@${alreadyConnectedName ?? 'user'}`}
        onClose={handleDismissAlreadyConnected}
      />

      <LeaveCurrentSessionConfirmDialog
        isOpen={Boolean(leaveToInviteTarget)}
        currentPartnerName={partnerName ? `@${partnerName}` : 'your current partner'}
        targetName={leaveToInviteTarget ? `@${leaveToInviteTarget.username}` : 'this user'}
        isLoading={isLeavingForInvite}
        error={leaveForInviteError}
        onCancel={handleDismissLeaveToInvite}
        onConfirm={() => { void handleConfirmLeaveAndInvite() }}
      />

      <InviteSendConfirmDialog
        isOpen={Boolean(selectedInviteTarget)}
        targetName={selectedInviteTarget?.username ?? 'this user'}
        isLoading={isSendingInvite}
        error={inviteActionError}
        onCancel={handleDismissConfirmInvite}
        onConfirm={() => { void handleConfirmSendInvite() }}
      />

      <IncomingInviteDialog
        isOpen={Boolean(incomingInvite)}
        requesterName={incomingInvite?.requesterName ?? 'Someone'}
        isLoading={isRespondingInvite}
        error={inviteActionError}
        onDecline={() => { void handleRespondInvite(false) }}
        onAccept={() => { void handleRespondInvite(true) }}
      />

      <OutgoingPendingDialog
        isOpen={Boolean(outgoingInvite && outgoingInvite.status === 'pending')}
        recipientName={outgoingInvite?.recipientName ?? 'user'}
        isCancelling={isCancellingInvite}
        onCancelInvite={() => { void handleCancelOutgoing() }}
      />

      <OnlineUsersDrawer
        isOpen={isUsersDrawerOpen}
        users={onlineUsers}
        currentUserId={userId}
        currentUsername={username}
        isLoading={isOnlineUsersLoading}
        error={onlineUsersError?.message ?? null}
        onUserClick={handleOnlineUserClick}
        onClose={handleCloseUsersDrawer}
      />

      {/* Map - Client only via lazy import */}
      <Suspense
        fallback={
          <div className="h-full w-full bg-[#0A1628] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF035B]" />
          </div>
        }
      >
        <Map
          myLocation={myLocation}
          partnerLocation={partnerLocation}
        />
      </Suspense>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[400] p-4">
        <div className="flex items-start justify-between">
          <button
            onClick={handleOpenUsersDrawer}
            className="w-11 h-11 bg-[#141D2B]/90 backdrop-blur-sm rounded-xl flex items-center justify-center"
            aria-label="Open online users sidebar"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          <div className="bg-[#141D2B]/90 backdrop-blur-sm rounded-2xl px-4 py-3 flex-1 mx-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-xs">Session Code</p>
                <p className="text-white text-xl font-bold">{session?.code || '...'}</p>
              </div>
              <div className="flex flex-col items-end min-w-0 max-w-[62%]">
                {isPartnerConnected ? (
                  <>
                    <div className="flex items-center justify-end gap-2 w-full min-w-0">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                      <span className="text-sm text-green-500 truncate" title="Connected">
                        Connected
                      </span>
                    </div>
                    <span
                      className="text-xs text-green-400/90 truncate w-full text-right"
                      title={connectedPartnerLabel}
                    >
                      {connectedPartnerLabel}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-end gap-2 w-full min-w-0">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shrink-0" />
                      <span
                        className="text-sm text-yellow-500 truncate"
                        title={isHost ? 'Waiting for partner' : 'Connecting to host'}
                      >
                        {isHost ? 'Waiting' : 'Connecting'}
                      </span>
                    </div>
                    <span
                      className="text-xs text-yellow-400/85 truncate w-full text-right"
                      title={isHost ? 'Waiting for partner' : 'Connecting to host'}
                    >
                      {waitingSecondaryLabel}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status Banner */}
        {connectionDisplay && (
          <div className="mt-4 flex justify-center">
            <div className={`${connectionDisplay.bgColor} border ${connectionDisplay.borderColor} rounded-full px-4 py-2 flex items-center gap-2`}>
              {connectionDisplay.icon}
              <span className={`${connectionDisplay.color} text-sm font-medium`}>
                {connectionDisplay.text}
              </span>
              {connectionStatus === 'disconnected' && (
                <button
                  onClick={handleManualRetry}
                  disabled={isManualRetrying}
                  className="ml-2 flex items-center gap-1 text-white text-sm hover:underline disabled:opacity-50"
                >
                  {isManualRetrying ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Waiting for partner banner */}
        {!isPartnerConnected && isSessionLoaded && !connectionDisplay && (
          <div className="mt-4 flex justify-center">
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-full px-4 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
              <span className="text-yellow-500 text-sm">
                {isHost
                  ? 'Waiting for partner to join...'
                  : 'Connecting to session...'}
              </span>
            </div>
          </div>
        )}

        {/* Distance display */}
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
        {/* Error messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-center text-sm">{error}</p>
          </div>
        )}

        {/* Location update error with retry */}
        {updateError && !error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-red-400 text-sm">
                  Location update failed: {updateError.message}
                </p>
                {!updateError.isRecoverable && (
                  <p className="text-red-400/70 text-xs mt-1">
                    Multiple failures detected. Please check your connection.
                  </p>
                )}
              </div>
              <Button
                onClick={handleManualRetry}
                isLoading={isManualRetrying}
                disabled={isManualRetrying}
                variant="secondary"
                className="ml-3 shrink-0"
              >
                {isManualRetrying ? 'Retrying...' : 'Reconnect'}
              </Button>
            </div>
            {retryCount > 0 && (
              <p className="text-white/40 text-xs mt-2 text-center">
                Retry attempt {retryCount}
              </p>
            )}
          </div>
        )}

        <Button
          onClick={handleEndSession}
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full"
          variant={isHost ? "primary" : "secondary"}
        >
          {isLoading ? 'Ending...' : isHost ? 'End Session' : 'Leave Session'}
        </Button>
      </div>
    </div>
  )
}

export default MapPage
