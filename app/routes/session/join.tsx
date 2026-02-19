import { createFileRoute, useNavigate, Navigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { convexMutation, convexQuery, pollWithTimeout } from '@/lib/convex'
import { storage } from '@/lib/storage'
import { clearPendingJoinHandoff, savePendingJoinHandoff } from '@/lib/joinHandoff'
import {
  generateGuestUsername,
  parseSuggestedUsername,
  sanitizeUsernameInput,
  USERNAME_MIN_LENGTH,
} from '@/lib/username'

export const Route = createFileRoute('/session/join')({
  validateSearch: (search: Record<string, unknown>) => {
    const rawCode = typeof search.code === 'string' ? search.code : ''
    const normalizedCode = rawCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
    const from = search.from === 'list' ? 'list' : undefined

    return {
      code: normalizedCode || undefined,
      from,
    }
  },
  component: JoinSessionPage,
  beforeLoad: async () => {
    return {}
  },
})

interface JoinResult {
  sessionId: string
  joined: boolean
}

interface ParticipantState {
  exists: boolean
  status: 'waiting' | 'active' | 'closed' | 'missing'
  isParticipant: boolean
  role: 'host' | 'guest' | 'none'
  canSendLocation: boolean
}

interface User {
  _id: string
  username: string
}

function JoinSessionPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isBootstrappingIdentity, setIsBootstrappingIdentity] = useState(true)
  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [identityDeviceId, setIdentityDeviceId] = useState<string | null>(null)
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [suggestedUsername, setSuggestedUsername] = useState<string | null>(null)
  const [isSuggestionApplied, setIsSuggestionApplied] = useState(false)
  const [isSavingUsername, setIsSavingUsername] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const joinButtonRef = useRef<HTMLButtonElement | null>(null)
  const usernameInputRef = useRef<HTMLInputElement | null>(null)
  const appliedPrefillRef = useRef<string | null>(null)
  const autoCreatedIdentityRef = useRef(false)

  const userId = storage.getUserId()
  const prefilledCode = search.code ?? ''
  const isFromList = search.from === 'list'
  const isSharedLinkEntry = !isFromList && prefilledCode.length > 0

  const claimUsername = useCallback(async (deviceId: string, username: string): Promise<User> => {
    const normalizedUsername = sanitizeUsernameInput(username)
    return await convexMutation<User>('users:upsert', {
      deviceId,
      username: normalizedUsername,
    })
  }, [])

  useEffect(() => {
    let isCancelled = false

    const bootstrapIdentity = async () => {
      const auth = storage.getAuth()

      if (auth.deviceId && auth.userId && auth.username) {
        if (isCancelled) return
        setIdentityDeviceId(auth.deviceId)
        setUsernameDraft(auth.username)
        setIsAuthenticated(true)
        setIsBootstrappingIdentity(false)
        return
      }

      if (!isSharedLinkEntry) {
        if (isCancelled) return
        setIsAuthenticated(false)
        setIsBootstrappingIdentity(false)
        return
      }

      const deviceId = auth.deviceId ?? crypto.randomUUID()
      let candidate = sanitizeUsernameInput(auth.username ?? generateGuestUsername())
      if (candidate.length < USERNAME_MIN_LENGTH) {
        candidate = generateGuestUsername()
      }

      try {
        let user: User | null = null
        let nextCandidate = candidate

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            user = await claimUsername(deviceId, nextCandidate)
            break
          } catch (err) {
            const suggestion = err instanceof Error ? parseSuggestedUsername(err.message) : null
            if (suggestion && attempt === 0) {
              nextCandidate = suggestion
              continue
            }
            throw err
          }
        }

        if (!user) {
          throw new Error('Failed to auto-create username')
        }

        storage.setAuthData(deviceId, user.username, user._id)

        if (isCancelled) return

        autoCreatedIdentityRef.current = true
        setIdentityDeviceId(deviceId)
        setUsernameDraft(user.username)
        setUsernameError(null)
        setSuggestedUsername(null)
        setShowUsernameModal(true)
        setIsAuthenticated(true)
      } catch (err) {
        if (isCancelled) return

        setError(err instanceof Error ? err.message : 'Failed to initialize your profile')
        setIsAuthenticated(false)
      } finally {
        if (!isCancelled) {
          setIsBootstrappingIdentity(false)
        }
      }
    }

    void bootstrapIdentity()

    return () => {
      isCancelled = true
    }
  }, [claimUsername, isSharedLinkEntry])

  useEffect(() => {
    if (isAuthenticated && !showUsernameModal) {
      inputRefs.current[0]?.focus()
    }
  }, [isAuthenticated, showUsernameModal])

  useEffect(() => {
    if (!showUsernameModal) return

    setTimeout(() => {
      usernameInputRef.current?.focus()
    }, 0)
  }, [showUsernameModal])

  useEffect(() => {
    if (!isAuthenticated) return
    if (!prefilledCode || appliedPrefillRef.current === prefilledCode) return

    const nextCode = Array.from({ length: 6 }, (_, index) => prefilledCode[index] ?? '')
    setCode(nextCode)
    setError(null)
    appliedPrefillRef.current = prefilledCode

    setTimeout(() => {
      if (prefilledCode.length === 6 && !showUsernameModal) {
        joinButtonRef.current?.focus()
      } else {
        inputRefs.current[Math.min(prefilledCode.length, 5)]?.focus()
      }
    }, 0)
  }, [isAuthenticated, prefilledCode, showUsernameModal])

  const applySuggestedUsername = (nextUsername: string) => {
    setUsernameDraft(nextUsername)
    setUsernameError(null)
    setIsSuggestionApplied(true)
    setTimeout(() => {
      setIsSuggestionApplied(false)
      setSuggestedUsername(null)
    }, 650)
    usernameInputRef.current?.focus()
  }

  const handleConfirmUsername = useCallback(async () => {
    const deviceId = identityDeviceId ?? storage.getDeviceId()
    if (!deviceId) {
      setUsernameError('Unable to resolve device identity. Please refresh and try again.')
      return
    }

    const normalizedUsername = sanitizeUsernameInput(usernameDraft)

    if (normalizedUsername.length < USERNAME_MIN_LENGTH) {
      setUsernameError(`Username must be at least ${USERNAME_MIN_LENGTH} characters`)
      setSuggestedUsername(null)
      return
    }

    setIsSavingUsername(true)
    setUsernameError(null)

    try {
      const user = await claimUsername(deviceId, normalizedUsername)
      storage.setAuthData(deviceId, user.username, user._id)
      setUsernameDraft(user.username)
      setShowUsernameModal(false)
      setSuggestedUsername(null)

      if (code.every((char) => char.length === 1)) {
        setTimeout(() => {
          joinButtonRef.current?.focus()
          joinButtonRef.current?.click()
        }, 0)
      } else {
        setTimeout(() => {
          inputRefs.current[0]?.focus()
        }, 0)
      }
    } catch (err) {
      if (err instanceof Error) {
        const suggestion = parseSuggestedUsername(err.message)
        if (suggestion) {
          setUsernameError(`"${normalizedUsername}" is currently active. Try this available username.`)
          setSuggestedUsername(suggestion)
        } else {
          setUsernameError(err.message)
          setSuggestedUsername(null)
        }
      } else {
        setUsernameError('Failed to save username')
        setSuggestedUsername(null)
      }
    } finally {
      setIsSavingUsername(false)
    }
  }, [claimUsername, code, identityDeviceId, usernameDraft])

  const handleCancelUsernameModal = useCallback(() => {
    setShowUsernameModal(false)
    setSuggestedUsername(null)
    setUsernameError(null)
    if (autoCreatedIdentityRef.current) {
      navigate({ to: '/session' })
    }
  }, [navigate])

  const autoSubmitIfComplete = (nextCode: string[]) => {
    const isComplete = nextCode.every((char) => char.length === 1)
    if (!isComplete || isLoading || isVerifying || showUsernameModal || isSavingUsername) {
      return
    }

    setTimeout(() => {
      const activeElement = document.activeElement
      if (activeElement instanceof HTMLElement) {
        activeElement.blur()
      }
      joinButtonRef.current?.focus()
      joinButtonRef.current?.click()
    }, 0)
  }

  const handleChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

    if (cleanValue.length > 1) {
      const chars = cleanValue.slice(0, 6).split('')
      const newCode = [...code]
      chars.forEach((char, i) => { if (i < 6) newCode[i] = char })
      setCode(newCode)
      inputRefs.current[Math.min(chars.length, 5)]?.focus()
      autoSubmitIfComplete(newCode)
    } else {
      const newCode = [...code]
      newCode[index] = cleanValue
      setCode(newCode)
      if (cleanValue && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
      autoSubmitIfComplete(newCode)
    }
    setError(null)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code]
      newCode[index - 1] = ''
      setCode(newCode)
      inputRefs.current[index - 1]?.focus()
    }
  }

  /**
   * Verify that the user is actually part of the session
   * This handles the case where the join mutation succeeds but database isn't updated
   */
  const verifySessionJoined = async (sessionId: string, maxAttempts = 5): Promise<boolean> => {
    try {
      await pollWithTimeout<ParticipantState>(
        async () => {
          return await convexQuery<ParticipantState>('locationSessions:getParticipantState', {
            sessionId,
            userId,
          })
        },
        (state) => state.exists && state.isParticipant && state.status === 'active',
        {
          interval: 800,
          timeout: 5000,
          maxAttempts,
        }
      )

      return true
    } catch {
      return false
    }
  }

  const handleJoin = async () => {
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter a valid 6-character code')
      return
    }
    if (!userId) {
      setError('User not authenticated')
      return
    }

    setIsLoading(true)
    setIsVerifying(false)
    setError(null)

    try {
      const result = await convexMutation<JoinResult>('locationSessions:join', {
        code: fullCode,
        userId,
      }, {
        maxRetries: 3,
        baseDelay: 500,
      })
      
      if (!result.joined || !result.sessionId) {
        throw new Error('Join mutation returned unsuccessful result')
      }

      // Step 2: Verify session is actually joined before navigating
      setIsVerifying(true)
      const isVerified = await verifySessionJoined(result.sessionId)
      
      if (!isVerified) {
        throw new Error('Join verification failed. The session may be full or no longer available.')
      }
      
      savePendingJoinHandoff({
        sessionId: result.sessionId,
        code: fullCode,
        userId,
        source: isSharedLinkEntry ? 'shared_link' : isFromList ? 'list' : 'manual',
        createdAt: Date.now(),
      })
      navigate({ to: '/map/$sessionId', params: { sessionId: result.sessionId } })
      setTimeout(() => {
        if (typeof window === 'undefined') return
        const isOnMapRoute = window.location.pathname.startsWith('/map/')
        if (!isOnMapRoute) {
          window.location.assign(`/map/${result.sessionId}`)
        }
      }, 900)
      
    } catch (err) {
      clearPendingJoinHandoff()
      let message = 'Failed to join session'

      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase()
        if (errMsg.includes('not found')) {
          message = 'Invalid code. Session not found.'
        } else if (errMsg.includes('expired')) {
          message = 'This session has expired.'
        } else if (errMsg.includes('full')) {
          message = 'This session is already full.'
        } else if (errMsg.includes('own session')) {
          message = 'Cannot join your own session.'
        } else if (errMsg.includes('closed')) {
          message = 'Session has been closed.'
        } else {
          message = err.message
        }
      }
      
      setError(message)
    } finally {
      setIsLoading(false)
      setIsVerifying(false)
    }
  }

  if (isAuthenticated === null || isBootstrappingIdentity) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-[#FF035B] rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />
  }

  const isCodeComplete = code.every(char => char.length === 1)
  const getInputStateClass = () => {
    if (error) {
      return 'border-red-500 focus:border-red-500'
    }
    if (isCodeComplete) {
      return 'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/30'
    }
    return 'border-transparent focus:border-[#FF035B]'
  }

  return (
    <div className="relative min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-6">
      {showUsernameModal && (
        <>
          <button
            aria-label="Close username setup backdrop"
            onClick={handleCancelUsernameModal}
            className="fixed inset-0 z-[980]"
            style={{ backgroundColor: 'var(--color-modal-backdrop)' }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[990] flex items-center justify-center p-5"
          >
            <div
              className="w-full max-w-sm rounded-3xl p-5"
              style={{
                backgroundColor: 'var(--color-modal-surface)',
                border: '1px solid var(--color-modal-border)',
                boxShadow: '0 16px 48px rgba(0, 0, 0, 0.35)',
              }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-modal-text)' }}>
                Auto created username is:
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-modal-text-muted)' }}>
                You can edit this before entering the live map session.
              </p>

              <div className="mt-4">
                <Input
                  ref={usernameInputRef}
                  value={usernameDraft}
                  onChange={(e) => {
                    setUsernameDraft(e.target.value)
                    setUsernameError(null)
                    setSuggestedUsername(null)
                  }}
                  placeholder="Enter your username"
                  error={Boolean(usernameError)}
                  className={isSuggestionApplied ? 'username-input-autofill' : undefined}
                  maxLength={20}
                  autoComplete="off"
                  disabled={isSavingUsername}
                />
              </div>

              {suggestedUsername && (
                <div className="username-suggestion-card username-suggestion-enter mt-4">
                  <p className="text-sm" style={{ color: 'var(--color-onboard-suggestion-text)' }}>
                    Suggested available username
                  </p>
                  <button
                    type="button"
                    onClick={() => applySuggestedUsername(suggestedUsername)}
                    className={`username-suggestion-chip ${isSuggestionApplied ? 'is-applied' : ''}`}
                    aria-label={`Use suggested username ${suggestedUsername}`}
                    disabled={isSavingUsername}
                  >
                    {suggestedUsername}
                  </button>
                </div>
              )}

              {usernameError && (
                <p className="text-sm text-red-400 mt-3">{usernameError}</p>
              )}

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Button
                  variant="secondary"
                  onClick={handleCancelUsernameModal}
                  disabled={isSavingUsername}
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => { void handleConfirmUsername() }}
                  isLoading={isSavingUsername}
                  disabled={isSavingUsername || sanitizeUsernameInput(usernameDraft).length < USERNAME_MIN_LENGTH}
                  className="w-full"
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Join a Session</h1>
        <p className="text-white/60 text-center mb-8">Enter 6-digit code</p>

        {isFromList && (
          <div className="mb-4 text-center">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/80">
              Selected from Active Sessions
            </span>
          </div>
        )}

        <div className="flex gap-2 justify-center mb-6">
          {code.map((char, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el }}
              type="text"
              maxLength={1}
              value={char}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading || isVerifying || showUsernameModal || isSavingUsername}
              className={`
                w-12 h-12 text-center text-xl font-bold rounded-xl
                bg-[#141D2B] text-white
                border-2 transition-all duration-200
                focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                ${getInputStateClass()}
              `}
            />
          ))}
        </div>

        {error && (
          <div className="mb-6">
            <p className="text-red-400 text-center text-sm">{error}</p>
            <p className="text-white/40 text-center text-xs mt-2">
              If this persists, try refreshing the page
            </p>
          </div>
        )}

        {isVerifying && (
          <div className="mb-6 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-white/30 border-t-[#FF035B] rounded-full mx-auto mb-2" />
            <p className="text-white/60 text-sm">Verifying session...</p>
          </div>
        )}

        <Button 
          ref={joinButtonRef}
          onClick={handleJoin} 
          isLoading={isLoading && !isVerifying} 
          disabled={!isCodeComplete || isLoading || isVerifying || showUsernameModal || isSavingUsername} 
          className="w-full mb-4"
        >
          {isVerifying ? 'Verifying...' : isLoading ? 'Joining...' : 'Join Session'}
        </Button>

        <Button 
          variant="tertiary"
          onClick={() => {
            if (isFromList) {
              navigate({ to: '/session/list' })
              return
            }
            navigate({ to: '/session' })
          }}
          disabled={isLoading || isVerifying || isSavingUsername}
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default JoinSessionPage
