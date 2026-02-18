import { createFileRoute, Outlet, Navigate, useNavigate, useRouterState } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { MapPin, Menu } from 'lucide-react'
import {
  IncomingInviteDialog,
  InviteSendConfirmDialog,
  OutgoingPendingDialog,
} from '@/components/modals/SessionInviteDialogs'
import { OnlineUsersDrawer } from '@/components/sidebar/OnlineUsersDrawer'
import type { OnlineUser } from '@/hooks'
import { useOnlineUsers } from '@/hooks/useOnlineUsers'
import { useSessionInvites } from '@/hooks/useSessionInvites'
import { storage } from '@/lib/storage'

export const Route = createFileRoute('/session')({
  component: SessionLayout,
  beforeLoad: async () => {
    return {}
  },
})

function formatLocationLabel(payload: any): string | null {
  const address = payload?.address
  const area = address?.suburb || address?.neighbourhood || address?.quarter || address?.road
  const locality = address?.city || address?.town || address?.village || address?.municipality
  const region = address?.state

  const compactParts = [area, locality, region].filter(Boolean)
  if (compactParts.length > 0) {
    return compactParts.join(', ')
  }

  if (typeof payload?.display_name !== 'string') {
    return null
  }

  const fallbackParts = payload.display_name
    .split(',')
    .map((part: string) => part.trim())
    .filter(Boolean)
    .slice(0, 3)

  return fallbackParts.length > 0 ? fallbackParts.join(', ') : null
}

function SessionLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isUsersDrawerOpen, setIsUsersDrawerOpen] = useState(false)
  const [selectedInviteTarget, setSelectedInviteTarget] = useState<OnlineUser | null>(null)
  const [hostLocationLabel, setHostLocationLabel] = useState('Locating host...')
  const { users: onlineUsers, isLoading: isOnlineUsersLoading, error: onlineUsersError } = useOnlineUsers(isUsersDrawerOpen)
  const userId = storage.getUserId()
  const username = storage.getUsername()
  const shouldShowHostLocation = pathname === '/session/create'
  const handledSessionIdRef = useRef<string | null>(null)
  const {
    incomingInvite,
    outgoingInvite,
    actionError,
    isSendingInvite,
    isRespondingInvite,
    isCancellingInvite,
    sendInvite,
    respondToInvite,
    cancelOutgoingInvite,
    clearActionError,
  } = useSessionInvites(userId)

  useEffect(() => {
    setIsAuthenticated(storage.isAuthenticated())
  }, [])

  useEffect(() => {
    if (!shouldShowHostLocation) {
      return
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setHostLocationLabel('Location unavailable')
      return
    }

    let isCancelled = false

    const setFallbackLabel = (lat: number, lng: number) => {
      if (isCancelled) return
      setHostLocationLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setFallbackLabel(latitude, longitude)

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          )
          if (!response.ok) {
            return
          }

          const payload = await response.json()
          const label = formatLocationLabel(payload)
          if (!label || isCancelled) {
            return
          }
          setHostLocationLabel(label)
        } catch {
          // Keep fallback coordinate label.
        }
      },
      () => {
        if (isCancelled) return
        setHostLocationLabel('Location unavailable')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )

    return () => {
      isCancelled = true
    }
  }, [shouldShowHostLocation])

  useEffect(() => {
    if (!outgoingInvite || outgoingInvite.status !== 'accepted' || !outgoingInvite.sessionId) {
      return
    }

    if (handledSessionIdRef.current === outgoingInvite.sessionId) {
      return
    }

    handledSessionIdRef.current = outgoingInvite.sessionId
    setSelectedInviteTarget(null)
    setIsUsersDrawerOpen(false)
    navigate({ to: '/map/$sessionId', params: { sessionId: outgoingInvite.sessionId } })
  }, [outgoingInvite, navigate])

  const handleOnlineUserClick = useCallback((user: OnlineUser) => {
    setIsUsersDrawerOpen(false)
    clearActionError()
    setSelectedInviteTarget(user)
  }, [clearActionError])

  const handleDismissConfirmInvite = useCallback(() => {
    setSelectedInviteTarget(null)
    clearActionError()
  }, [clearActionError])

  const handleConfirmSendInvite = useCallback(async () => {
    if (!selectedInviteTarget) {
      return
    }

    try {
      await sendInvite(selectedInviteTarget._id)
      setSelectedInviteTarget(null)
    } catch {
      // Error is surfaced by actionError state.
    }
  }, [selectedInviteTarget, sendInvite])

  const handleRespondInvite = useCallback(async (accept: boolean) => {
    if (!incomingInvite) {
      return
    }

    try {
      const result = await respondToInvite(incomingInvite._id, accept)
      if (accept && result.status === 'accepted' && result.sessionId) {
        handledSessionIdRef.current = result.sessionId
        navigate({ to: '/map/$sessionId', params: { sessionId: result.sessionId } })
      }
    } catch {
      // Error is surfaced by actionError state.
    }
  }, [incomingInvite, navigate, respondToInvite])

  const handleCancelOutgoing = useCallback(async () => {
    if (!outgoingInvite || outgoingInvite.status !== 'pending') {
      return
    }

    try {
      await cancelOutgoingInvite(outgoingInvite._id)
    } catch {
      // Error is surfaced by actionError state.
    }
  }, [cancelOutgoingInvite, outgoingInvite])

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-[#FF035B] rounded-full" />
      </div>
    )
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" />
  }

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <InviteSendConfirmDialog
        isOpen={Boolean(selectedInviteTarget)}
        targetName={selectedInviteTarget?.username ?? 'this user'}
        isLoading={isSendingInvite}
        error={actionError}
        onCancel={handleDismissConfirmInvite}
        onConfirm={handleConfirmSendInvite}
      />

      <IncomingInviteDialog
        isOpen={Boolean(incomingInvite)}
        requesterName={incomingInvite?.requesterName ?? 'Someone'}
        isLoading={isRespondingInvite}
        error={actionError}
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
        onClose={() => setIsUsersDrawerOpen(false)}
      />

      {/* Header with menu */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <button
            className="w-11 h-11 flex shrink-0 items-center justify-center rounded-xl hover:bg-white/10"
            onClick={() => setIsUsersDrawerOpen(true)}
            aria-label="Open online users sidebar"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          {shouldShowHostLocation && (
            <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#141D2B]/90 px-3 py-2 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-white/60" />
                <p className="truncate text-sm text-white/90">{hostLocationLabel}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Child routes render here */}
      <Outlet />
    </div>
  )
}

export default SessionLayout
