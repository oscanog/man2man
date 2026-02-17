/**
 * User Hook
 * 
 * Manages user creation and retrieval using Convex HTTP API.
 * Mirrors Android's UserRepository pattern.
 */

import { useState, useEffect, useCallback } from 'react'
import { convexQuery, convexMutation } from '@/lib/convex'
import { storage } from '@/lib/storage'

export interface User {
  _id: string
  _creationTime: number
  deviceId: string
  username: string
  isOnline: boolean
  lastSeen: number
}

interface UseUserReturn {
  user: User | null
  deviceId: string | null
  isLoading: boolean
  error: Error | null
  createUser: (username: string) => Promise<User>
  refreshUser: () => Promise<void>
  setOffline: () => Promise<void>
}

export function useUser(): UseUserReturn {
  const [deviceId, setDeviceId] = useState<string | null>(storage.getDeviceId())
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch user on mount if deviceId exists
  useEffect(() => {
    if (deviceId) {
      refreshUser()
    }
  }, [deviceId])

  const refreshUser = useCallback(async () => {
    if (!deviceId) return

    setIsLoading(true)
    setError(null)

    try {
      const userData = await convexQuery<User | null>('users:getByDevice', {
        deviceId,
      })
      setUser(userData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [deviceId])

  const createUser = useCallback(async (username: string): Promise<User> => {
    setIsLoading(true)
    setError(null)

    try {
      // Generate device ID
      const newDeviceId = crypto.randomUUID()
      
      // Create user in Convex
      const userData = await convexMutation<User>('users:upsert', {
        deviceId: newDeviceId,
        username,
      })

      // Store locally
      storage.setDeviceId(newDeviceId)
      storage.setUsername(username)
      storage.setUserId(userData._id)
      
      setDeviceId(newDeviceId)
      setUser(userData)

      return userData
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const setOffline = useCallback(async () => {
    if (!deviceId) return

    try {
      await convexMutation('users:setOffline', { deviceId })
    } catch (err) {
      console.error('Failed to set offline:', err)
    }
  }, [deviceId])

  return {
    user,
    deviceId,
    isLoading,
    error,
    createUser,
    refreshUser,
    setOffline,
  }
}
