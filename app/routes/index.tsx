import { createFileRoute, useNavigate, Navigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { convexMutation } from '@/lib/convex'
import { storage } from '@/lib/storage'
import { parseSuggestedUsername, sanitizeUsernameInput, USERNAME_MIN_LENGTH } from '@/lib/username'
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
  const [suggestedUsername, setSuggestedUsername] = useState<string | null>(null)
  const [isSuggestionApplied, setIsSuggestionApplied] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const applySuggestedUsername = (nextUsername: string) => {
    setUsername(nextUsername)
    setError(null)
    setIsSuggestionApplied(true)
    setTimeout(() => {
      setIsSuggestionApplied(false)
      setSuggestedUsername(null)
    }, 650)
    inputRef.current?.focus()
  }

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

    const normalizedUsername = sanitizeUsernameInput(username)

    if (!normalizedUsername || normalizedUsername.length < USERNAME_MIN_LENGTH) {
      setError(`Username must be at least ${USERNAME_MIN_LENGTH} characters`)
      setSuggestedUsername(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const deviceId = crypto.randomUUID()
      
      const user = await convexMutation<User>('users:upsert', {
        deviceId,
        username: normalizedUsername,
      })

      storage.setAuthData(deviceId, user.username, user._id)
      
      navigate({ to: '/session' })
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[Onboarding] users:upsert failed', err)
      }

      if (err instanceof Error) {
        const suggestion = parseSuggestedUsername(err.message)

        if (suggestion) {
          setError(`"${normalizedUsername}" is currently active. Try this available username.`)
          setSuggestedUsername(suggestion)
        } else {
          setError(err.message)
          setSuggestedUsername(null)
        }
      } else {
        setError('Failed to create user')
        setSuggestedUsername(null)
      }
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
            setSuggestedUsername(null)
          }}
          placeholder="Enter your username"
          error={Boolean(error)}
          className={isSuggestionApplied ? 'username-input-autofill' : undefined}
          maxLength={20}
          autoComplete="off"
        />

        {suggestedUsername && (
          <div className="username-suggestion-card username-suggestion-enter">
            <p className="text-sm" style={{ color: 'var(--color-onboard-suggestion-text)' }}>
              Suggested available username
            </p>
            <button
              type="button"
              onClick={() => applySuggestedUsername(suggestedUsername)}
              className={`username-suggestion-chip ${isSuggestionApplied ? 'is-applied' : ''}`}
              aria-label={`Use suggested username ${suggestedUsername}`}
            >
              {suggestedUsername}
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm text-center text-red-400 -mt-3">{error}</p>
        )}

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
