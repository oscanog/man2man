import { createFileRoute, useNavigate, Navigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, User } from 'lucide-react'
import { useConvexSubscription } from '@/hooks/useConvexQuery'
import { storage } from '@/lib/storage'

export const Route = createFileRoute('/session/list')({
  component: SessionListPage,
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
  createdAt: number
}

function SessionListPage() {
  const navigate = useNavigate()
  const currentUserId = storage.getUserId()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const {
    data: sessionData,
    isLoading: isLiveLoading,
    error: liveError,
  } = useConvexSubscription<Session[]>('locationSessions:getAllActive', {}, 2500)

  // Check auth client-side
  useEffect(() => {
    setIsAuthenticated(storage.isAuthenticated())
  }, [])

  const sessions = useMemo(() => {
    const next = [...(sessionData ?? [])]
    next.sort((a, b) =>
      sortOrder === 'latest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    )
    return next
  }, [sessionData, sortOrder])

  const isInitialLoading = isLiveLoading && sessionData === null

  const handleSessionClick = (session: Session) => {
    if (session.user1Id !== currentUserId) {
      navigate({
        to: '/session/join',
        search: {
          code: session.code,
          from: 'list',
        },
      })
      return
    }

    navigate({ to: '/map/$sessionId', params: { sessionId: session._id } })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'waiting': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
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

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-white/10 gap-3">
        <button onClick={() => navigate({ to: '/session' })} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Active Sessions</h1>
        <div className="ml-auto bg-[#141D2B] border border-white/10 rounded-xl p-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSortOrder('latest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              sortOrder === 'latest'
                ? 'bg-[#FF035B] text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            aria-pressed={sortOrder === 'latest'}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('oldest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              sortOrder === 'oldest'
                ? 'bg-[#FF035B] text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            aria-pressed={sortOrder === 'oldest'}
          >
            Oldest
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isInitialLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-[#FF035B] rounded-full" />
          </div>
        ) : liveError && sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-2">{liveError.message}</p>
            <p className="text-white/60 text-sm">Reconnecting automatically...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white text-xl font-semibold mb-2">No Active Sessions</p>
            <p className="text-white/60">There are no active sessions available to join right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {liveError && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <p className="text-yellow-300 text-sm">
                  Live updates interrupted. Reconnecting...
                </p>
              </div>
            )}
            {sessions.map((session) => (
              <button
                key={session._id}
                onClick={() => handleSessionClick(session)}
                className="w-full bg-[#141D2B] rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-[#1E2A3C] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#FF035B] flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Code: {session.code}</p>
                  <p className="text-white/60 text-sm">Host Session</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`} />
                  <span className={`text-sm ${session.status === 'active' ? 'text-green-500' : session.status === 'waiting' ? 'text-yellow-500' : 'text-gray-500'}`}>
                    {session.status === 'active' ? 'Active' : session.status === 'waiting' ? 'Waiting' : 'Closed'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionListPage
