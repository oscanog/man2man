import { useEffect, useState } from 'react'
import { subscribeConvexQuery } from '@/lib/convex'

export interface OnlineUser {
  _id: string
  username: string
  isOnline: boolean
  lastSeen: number
}

interface UseOnlineUsersResult {
  users: OnlineUser[]
  isLoading: boolean
  error: Error | null
}

export function useOnlineUsers(enabled: boolean = true): UseOnlineUsersResult {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const cleanup = subscribeConvexQuery<OnlineUser[]>(
      'users:getOnlineUsers',
      {},
      (data) => {
        setUsers(data || [])
        setIsLoading(false)
        setError(null)
      },
      (err) => {
        setError(err)
        setIsLoading(false)
      },
      3000
    )

    return cleanup
  }, [enabled])

  return {
    users,
    isLoading,
    error,
  }
}
