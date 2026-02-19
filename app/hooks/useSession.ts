/**
 * Session Hook
 * 
 * Manages session creation, joining, and monitoring using Convex HTTP API.
 * Mirrors Android's SessionRepository pattern.
 */

import { useState, useEffect, useCallback } from 'react'
import { convexQuery, convexMutation, subscribeConvexQuery } from '@/lib/convex'
import { storage } from '@/lib/storage'

export interface Session {
  _id: string
  _creationTime: number
  code: string
  user1Id: string
  user2Id: string | null
  status: 'waiting' | 'active' | 'closed'
  createdAt: number
  expiresAt: number
}

interface CreateSessionResult {
  sessionId: string
  code: string
}

interface UseSessionReturn {
  session: Session | null
  isLoading: boolean
  error: Error | null
  createSession: () => Promise<CreateSessionResult>
  joinSession: (code: string) => Promise<string>
  closeSession: (sessionId: string) => Promise<void>
  getActiveSession: () => Promise<Session | null>
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const userId = storage.getUserId()

  const createSession = useCallback(async (): Promise<CreateSessionResult> => {
    if (!userId) throw new Error('User not authenticated')

    setIsLoading(true)
    setError(null)

    try {
      const result = await convexMutation<CreateSessionResult>('locationSessions:create', {
        userId,
      })
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const joinSession = useCallback(async (code: string): Promise<string> => {
    if (!userId) throw new Error('User not authenticated')

    setIsLoading(true)
    setError(null)

    try {
      const sessionId = await convexMutation<string>('locationSessions:join', {
        code: code.toUpperCase(),
        userId,
      })
      return sessionId
    } catch (err) {
      // Map Convex errors to user-friendly messages
      let message = 'Failed to join session'
      if (err instanceof Error) {
        if (err.message.includes('not found')) {
          message = 'Invalid code. Session not found.'
        } else if (err.message.includes('expired')) {
          message = 'This session has expired.'
        } else if (err.message.includes('full') || err.message.includes('no longer available')) {
          message = 'This session is already full.'
        } else if (err.message.includes('own session')) {
          message = 'Cannot join your own session.'
        }
      }
      const error = new Error(message)
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const closeSession = useCallback(async (sessionId: string): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    setIsLoading(true)
    setError(null)

    try {
      await convexMutation('locationSessions:close', {
        sessionId,
        userId,
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const getActiveSession = useCallback(async (): Promise<Session | null> => {
    if (!userId) return null

    setIsLoading(true)
    setError(null)

    try {
      const activeSession = await convexQuery<Session | null>('locationSessions:getActiveForUser', {
        userId,
      })
      setSession(activeSession)
      return activeSession
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  return {
    session,
    isLoading,
    error,
    createSession,
    joinSession,
    closeSession,
    getActiveSession,
  }
}

/**
 * Hook to watch a session for real-time updates
 */
export function useSessionWatcher(
  sessionId: string | null,
  onPartnerJoined?: () => void,
  onSessionClosed?: () => void
) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const cleanup = subscribeConvexQuery<Session>(
      'locationSessions:get',
      { sessionId },
      (data) => {
        // Check if partner just joined
        if (session?.user2Id === null && data.user2Id !== null) {
          onPartnerJoined?.()
        }
        
        // Check if session was closed
        if (session?.status !== 'closed' && data.status === 'closed') {
          onSessionClosed?.()
        }

        setSession(data)
        setIsLoading(false)
        setError(null)
      },
      (err) => {
        setError(err)
        setIsLoading(false)
      },
      2000 // Poll every 2 seconds
    )

    return cleanup
  }, [sessionId])

  return { session, isLoading, error }
}

/**
 * Hook to get all active sessions
 */
export function useActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await convexQuery<Session[]>('locationSessions:getAllActive', {})
      setSessions(data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return { sessions, isLoading, error, refetch: fetchSessions }
}
