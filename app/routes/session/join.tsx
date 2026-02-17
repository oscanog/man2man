import { createFileRoute, useNavigate, Navigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { convexMutation } from '@/lib/convex'
import { storage } from '@/lib/storage'

export const Route = createFileRoute('/session/join')({
  component: JoinSessionPage,
  beforeLoad: async () => {
    return {}
  },
})

function JoinSessionPage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const userId = storage.getUserId()

  // Check auth client-side
  useEffect(() => {
    setIsAuthenticated(storage.isAuthenticated())
  }, [])

  // Auto-focus first input
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
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        const newCode = [...code]
        newCode[index - 1] = ''
        setCode(newCode)
        inputRefs.current[index - 1]?.focus()
      }
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
    setError(null)

    try {
      const sessionId = await convexMutation<string>('sessions:join', {
        code: fullCode,
        userId,
      })
      navigate({ to: '/map/$sessionId', params: { sessionId } })
    } catch (err) {
      let message = 'Failed to join session'
      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase()
        if (errMsg.includes('not found')) message = 'Invalid code. Session not found.'
        else if (errMsg.includes('expired')) message = 'This session has expired.'
        else if (errMsg.includes('full')) message = 'This session is already full.'
      }
      setError(message)
      setIsLoading(false)
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

  const isCodeComplete = code.every(char => char.length === 1)

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Join a Session</h1>
        <p className="text-white/60 text-center mb-8">Enter 6-digit code</p>

        {/* Code Input */}
        <div className="flex gap-2 justify-center mb-6">
          {code.map((char, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              maxLength={1}
              value={char}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`
                w-12 h-12 text-center text-xl font-bold rounded-xl
                bg-[#141D2B] text-white
                border-2 transition-all duration-200
                focus:outline-none focus:border-[#FF035B]
                ${error ? 'border-red-500' : isCodeComplete ? 'border-green-500' : 'border-transparent'}
              `}
            />
          ))}
        </div>

        {error && <p className="text-red-400 text-center text-sm mb-6">{error}</p>}

        <Button onClick={handleJoin} isLoading={isLoading} disabled={!isCodeComplete || isLoading} className="w-full mb-4">
          {isLoading ? 'Joining...' : 'Join Session'}
        </Button>

        <Button variant="outline" onClick={() => navigate({ to: '/session' })} className="w-full">
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default JoinSessionPage
