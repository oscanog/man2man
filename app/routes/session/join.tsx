import { createFileRoute, useNavigate, Navigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { convexMutation } from '@/lib/convex'
import { storage } from '@/lib/storage'

export const Route = createFileRoute('/session/join')({
  component: JoinSessionPage,
  beforeLoad: async () => {
    const auth = storage.getAuth()
    if (!auth.deviceId || !auth.userId) {
      throw new Error('NOT_AUTHENTICATED')
    }
    return { auth }
  },
  errorComponent: ({ error }) => {
    if (error.message === 'NOT_AUTHENTICATED') {
      return <Navigate to="/" />
    }
    return <div>Error: {error.message}</div>
  },
})

function JoinSessionPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  const userId = storage.getUserId()
  
  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])
  
  const handleChange = (index: number, value: string) => {
    // Only allow alphanumeric
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    
    if (cleanValue.length > 1) {
      // Handle paste of full code
      const chars = cleanValue.slice(0, 6).split('')
      const newCode = [...code]
      chars.forEach((char, i) => {
        if (i < 6) newCode[i] = char
      })
      setCode(newCode)
      
      // Focus last filled input or first empty
      const lastFilledIndex = Math.min(chars.length, 5)
      inputRefs.current[lastFilledIndex]?.focus()
    } else {
      // Single character input
      const newCode = [...code]
      newCode[index] = cleanValue
      setCode(newCode)
      
      // Auto-advance to next input
      if (cleanValue && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    }
    
    setError(null)
  }
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // Go to previous input if current is empty
        const newCode = [...code]
        newCode[index - 1] = ''
        setCode(newCode)
        inputRefs.current[index - 1]?.focus()
      } else if (code[index]) {
        // Clear current input
        const newCode = [...code]
        newCode[index] = ''
        setCode(newCode)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }
  
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    
    if (pastedData.length === 6) {
      setCode(pastedData.split(''))
      inputRefs.current[5]?.focus()
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
      
      // Success! Navigate to map
      navigate({ to: '/map/$sessionId', params: { sessionId } })
    } catch (err) {
      let message = 'Failed to join session'
      
      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase()
        if (errMsg.includes('not found')) {
          message = 'Invalid code. Session not found.'
        } else if (errMsg.includes('expired')) {
          message = 'This session has expired.'
        } else if (errMsg.includes('full') || errMsg.includes('no longer available')) {
          message = 'This session is already full.'
        } else if (errMsg.includes('own session')) {
          message = 'Cannot join your own session.'
        } else {
          message = err.message
        }
      }
      
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCancel = () => {
    navigate({ to: '/session' })
  }
  
  const isCodeComplete = code.every(char => char.length === 1)
  
  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          Join a Session
        </h1>
        <p className="text-white/60 text-center mb-8">
          Enter 6-digit code
        </p>
        
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
              onPaste={handlePaste}
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
        
        {/* Error Message */}
        {error && (
          <p className="text-red-400 text-center text-sm mb-6">
            {error}
          </p>
        )}
        
        {/* Join Button */}
        <Button
          onClick={handleJoin}
          isLoading={isLoading}
          disabled={!isCodeComplete || isLoading}
          className="w-full mb-4"
        >
          {isLoading ? 'Joining...' : 'Join Session'}
        </Button>
        
        {/* Cancel Button */}
        <Button
          variant="outline"
          onClick={handleCancel}
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default JoinSessionPage
