import { createFileRoute, useNavigate, Navigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { convexMutation } from '@/lib/convex'
import { storage } from '@/lib/storage'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export const Route = createFileRoute('/')({
  component: OnboardingPage,
  beforeLoad: async () => {
    // Skip check during SSR - will handle client-side
    return {}
  },
})

interface User {
  _id: string
  deviceId: string
  username: string
  isOnline: boolean
  lastSeen: number
}

function OnboardingPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check if already authenticated (client-side only)
  useEffect(() => {
    if (storage.isAuthenticated()) {
      navigate({ to: '/session' })
    } else {
      setIsChecking(false)
    }
  }, [navigate])

  // Auto-focus input
  useEffect(() => {
    if (!isChecking) {
      inputRef.current?.focus()
    }
  }, [isChecking])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const deviceId = crypto.randomUUID()
      
      const user = await convexMutation<User>('users:upsert', {
        deviceId,
        username: username.trim(),
      })

      storage.setAuthData(deviceId, username.trim(), user._id)
      
      navigate({ to: '/session' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
      setIsLoading(false)
    }
  }

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-[#FF035B] rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="w-20 h-20 rounded-full bg-[#FF035B] flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-white">M2M</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-white mb-2">Man2Man</h1>
      <p className="text-white/60 text-center mb-12 max-w-xs">
        Share your location with someone you trust
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <Input
          ref={inputRef}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            setError(null)
          }}
          placeholder="Enter your username"
          error={error}
          maxLength={20}
          autoComplete="off"
        />

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading || username.length < 3}
          className="w-full"
        >
          Get Started
        </Button>
      </form>
    </div>
  )
}

export default OnboardingPage
