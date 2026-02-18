import { useCallback, useEffect, useState } from 'react'
import { convexMutation, subscribeConvexQuery } from '@/lib/convex'

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'

export interface IncomingInvite {
  _id: string
  requesterId: string
  requesterName: string
  createdAt: number
  updatedAt: number
  expiresAt: number
  status: InviteStatus
}

export interface OutgoingInvite {
  _id: string
  recipientId: string
  recipientName: string
  status: InviteStatus
  createdAt: number
  updatedAt: number
  expiresAt: number
  sessionId: string | null
  sessionCode: string | null
}

interface SendInviteResult {
  inviteId: string
  status: InviteStatus
  recipientId: string
  recipientName: string
  expiresAt: number
}

interface RespondInviteResult {
  status: InviteStatus
  sessionId: string | null
  code: string | null
}

interface UseSessionInvitesResult {
  incomingInvite: IncomingInvite | null
  outgoingInvite: OutgoingInvite | null
  isLoading: boolean
  error: Error | null
  actionError: string | null
  isSendingInvite: boolean
  isRespondingInvite: boolean
  isCancellingInvite: boolean
  sendInvite: (recipientId: string) => Promise<SendInviteResult>
  respondToInvite: (inviteId: string, accept: boolean) => Promise<RespondInviteResult>
  cancelOutgoingInvite: (inviteId: string) => Promise<void>
  clearActionError: () => void
}

export function useSessionInvites(userId: string | null): UseSessionInvitesResult {
  const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null)
  const [outgoingInvite, setOutgoingInvite] = useState<OutgoingInvite | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [error, setError] = useState<Error | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [isRespondingInvite, setIsRespondingInvite] = useState(false)
  const [isCancellingInvite, setIsCancellingInvite] = useState(false)

  useEffect(() => {
    if (!userId) {
      setIncomingInvite(null)
      setOutgoingInvite(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const incomingCleanup = subscribeConvexQuery<IncomingInvite[]>(
      'invites:getIncomingPendingForUser',
      { userId },
      (data) => {
        setIncomingInvite((data || [])[0] ?? null)
        setIsLoading(false)
        setError(null)
      },
      (err) => {
        setError(err)
        setIsLoading(false)
      },
      2000
    )

    const outgoingCleanup = subscribeConvexQuery<OutgoingInvite | null>(
      'invites:getLatestOutgoingForUser',
      { userId },
      (data) => {
        setOutgoingInvite(data ?? null)
        setIsLoading(false)
        setError(null)
      },
      (err) => {
        setError(err)
        setIsLoading(false)
      },
      2000
    )

    return () => {
      incomingCleanup()
      outgoingCleanup()
    }
  }, [userId])

  const sendInvite = useCallback(async (recipientId: string): Promise<SendInviteResult> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    setIsSendingInvite(true)
    setActionError(null)

    try {
      return await convexMutation<SendInviteResult>('invites:send', {
        requesterId: userId,
        recipientId,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invite'
      setActionError(message)
      throw err
    } finally {
      setIsSendingInvite(false)
    }
  }, [userId])

  const respondToInvite = useCallback(async (inviteId: string, accept: boolean): Promise<RespondInviteResult> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    setIsRespondingInvite(true)
    setActionError(null)

    try {
      return await convexMutation<RespondInviteResult>('invites:respond', {
        inviteId,
        userId,
        accept,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to respond to invite'
      setActionError(message)
      throw err
    } finally {
      setIsRespondingInvite(false)
    }
  }, [userId])

  const cancelOutgoingInvite = useCallback(async (inviteId: string) => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    setIsCancellingInvite(true)
    setActionError(null)

    try {
      await convexMutation('invites:cancel', {
        inviteId,
        userId,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel invite'
      setActionError(message)
      throw err
    } finally {
      setIsCancellingInvite(false)
    }
  }, [userId])

  return {
    incomingInvite,
    outgoingInvite,
    isLoading,
    error,
    actionError,
    isSendingInvite,
    isRespondingInvite,
    isCancellingInvite,
    sendInvite,
    respondToInvite,
    cancelOutgoingInvite,
    clearActionError: () => setActionError(null),
  }
}
