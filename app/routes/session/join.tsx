import { createFileRoute, useNavigate, Navigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { convexMutation, convexQuery, pollWithTimeout } from '@/lib/convex'
import { storage } from '@/lib/storage'

export const Route = createFileRoute('/session/join')({
  component: JoinSessionPage,
  beforeLoad: async () => {
    return {}
  },
})

interface JoinResult {
  sessionId: string
  joined: boolean
}

interface Session {
  _id: string
  code: string
  user1Id: string
  user2Id: string | null
  status: 'waiting' | 'active' | 'closed'
}

function JoinSessionPage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const userId = storage.getUserId()

  useEffect(() => {
    setIsAuthenticated(storage.isAuthenticated())
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      inputRefs.current[0]?.focus()
    }
  }, [isAuthenticated])

  const handleChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

    if (cleanValue.length > 1) {
      const chars = cleanValue.slice(0, 6).split('')
      const newCode = [...code]
      chars.forEach((char, i) => { if (i < 6) newCode[i] = char })
      setCode(newCode)
      inputRefs.current[Math.min(chars.length, 5)]?.focus()
    } else {
      const newCode = [...code]
      newCode[index] = cleanValue
      setCode(newCode)
      if (cleanValue && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
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
    // console.log(`[Join] Verifying session ${sessionId} joined status...`)
    
    try {
      const result = await pollWithTimeout<Session | null>(
        () => convexQuery<Session | null>('sessions:get', { sessionId }),
        (session) => {
          // Check if user is in the session (as user2 or user1)
          const isInSession = session !== null && 
            (session.user2Id === userId || session.user1Id === userId)
          return isInSession
        },
        {
          interval: 800,
          timeout: 5000,
          maxAttempts,
        }
      )
      
      // console.log(`[Join] Session verification successful:`, {
      //   sessionId: result._id,
      //   user2Id: result.user2Id,
      //   status: result.status,
      // })
      
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

    // console.log(`[Join] Starting join process - code: ${fullCode}, userId: ${userId}`)

    try {
      // Step 1: Call join mutation
      // console.log(`[Join] Step 1: Calling sessions:join mutation`)
      
      const result = await convexMutation<JoinResult>('sessions:join', {
        code: fullCode,
        userId,
      }, {
        maxRetries: 3,
        baseDelay: 500,
      })
      
      // console.log(`[Join] Step 1 complete - mutation result:`, result)
      
      if (!result.joined || !result.sessionId) {
        throw new Error('Join mutation returned unsuccessful result')
      }

      // Step 2: Verify session is actually joined before navigating
      setIsVerifying(true)
      const isVerified = await verifySessionJoined(result.sessionId)
      
      if (!isVerified) {
        throw new Error('Join verification failed. The session may be full or no longer available.')
      }
      
      // Step 3: Navigate to map page
      // console.log(`[Join] Navigating to map page for session: ${result.sessionId}`)
      navigate({ to: '/map/$sessionId', params: { sessionId: result.sessionId } })
      
    } catch (err) {
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
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Join a Session</h1>
        <p className="text-white/60 text-center mb-8">Enter 6-digit code</p>

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
              disabled={isLoading || isVerifying}
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
          onClick={handleJoin} 
          isLoading={isLoading && !isVerifying} 
          disabled={!isCodeComplete || isLoading || isVerifying} 
          className="w-full mb-4"
        >
          {isVerifying ? 'Verifying...' : isLoading ? 'Joining...' : 'Join Session'}
        </Button>

        <Button 
          variant="tertiary"
          onClick={() => navigate({ to: '/session' })} 
          disabled={isLoading || isVerifying}
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default JoinSessionPage
