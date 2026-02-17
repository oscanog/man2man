import { createFileRoute, Outlet, useNavigate, Navigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { storage } from '@/lib/storage'

export const Route = createFileRoute('/session')({
  component: SessionLayout,
  beforeLoad: async () => {
    return {}
  },
})

function SessionLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    setIsAuthenticated(storage.isAuthenticated())
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

      {/* Child routes render here */}
      <Outlet />
    </div>
  )
}

export default SessionLayout
