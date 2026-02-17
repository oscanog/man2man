import { createFileRoute, useNavigate, Navigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { storage } from '@/lib/storage'

export const Route = createFileRoute('/session')({
  component: SessionHomePage,
  beforeLoad: async () => {
    // Let component handle auth check client-side
    return {}
  },
})

function SessionHomePage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  // Check auth client-side
  useEffect(() => {
    const auth = storage.isAuthenticated()
    setIsAuthenticated(auth)
    if (auth) {
      setUsername(storage.getUsername())
    }
  }, [])

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
      {/* Header with menu */}
      <div className="p-4">
        <button 
          className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white/10"
          onClick={() => {/* TODO: Open drawer */}}
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Main content */}
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
            onClick={() => navigate({ to: '/session/join' })}
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
    </div>
  )
}

export default SessionHomePage
