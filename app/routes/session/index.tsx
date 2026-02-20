import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { storage } from '@/lib/storage'
import {
  clearPendingJoinHandoff,
  getPendingJoinHandoff,
  isPendingJoinFresh,
} from '@/lib/joinHandoff'

export const Route = createFileRoute('/session/')({
  component: SessionHomePage,
})

function SessionHomePage() {
  const navigate = useNavigate()
  const username = storage.getUsername()

  useEffect(() => {
    const pending = getPendingJoinHandoff()
    if (!pending) {
      return
    }

    const activeUserId = storage.getUserId()
    if (!activeUserId || activeUserId !== pending.userId) {
      clearPendingJoinHandoff()
      return
    }

    if (!isPendingJoinFresh(pending)) {
      clearPendingJoinHandoff()
      return
    }

    clearPendingJoinHandoff()
    navigate({ to: '/map/$sessionId', params: { sessionId: pending.sessionId } })
  }, [navigate])

  return (
    <div className="flex flex-col items-center justify-center px-6 pt-8">
      {/* Logo */}
      <div className="w-20 h-20 rounded-full bg-[#FF035B] flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-white">M2M</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-white mb-2">Session</h1>
      <p className="text-white/60 text-center mb-12 max-w-xs">
        Create a new session or join an existing one
      </p>

      {/* Welcome message */}
      {username && (
        <p className="text-white/80 text-center mb-8">
          Welcome, {username}!
        </p>
      )}

      {/* Buttons */}
      <div className="w-full max-w-xs space-y-4">
        <Button
          onClick={() => navigate({ to: '/session/create' })}
          className="w-full"
        >
          Create Session
        </Button>

        <Button
          variant="secondary"
          onClick={() =>
            navigate({ to: '/session/join', search: { code: undefined, from: undefined } })
          }
          className="w-full"
        >
          Join Session
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate({ to: '/session/list' })}
          className="w-full"
        >
          List All Active Sessions
        </Button>
      </div>
    </div>
  )
}

export default SessionHomePage
