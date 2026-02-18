import { useEffect } from 'react'
import { convexMutation } from '@/lib/convex'
import { storage } from '@/lib/storage'

const HEARTBEAT_INTERVAL_MS = 30000

export function usePresenceHeartbeat() {
  const deviceId = storage.getDeviceId()

  useEffect(() => {
    if (typeof window === 'undefined' || !deviceId) return

    let isDisposed = false

    const sendHeartbeat = async () => {
      if (isDisposed) return

      try {
        await convexMutation(
          'users:heartbeat',
          { deviceId },
          { maxRetries: 1, baseDelay: 250, maxDelay: 1000 }
        )
      } catch {
        // Keep this silent; next tick retries automatically.
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat()
      }
    }

    void sendHeartbeat()
    const intervalId = window.setInterval(() => {
      void sendHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)

    window.addEventListener('focus', sendHeartbeat)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isDisposed = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', sendHeartbeat)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [deviceId])
}
