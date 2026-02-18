import { Copy, Loader2, Share2, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useBottomSheetDrag } from '@/hooks/useBottomSheetDrag'

interface SessionDetailsBottomSheetProps {
  code: string
  createdAt: number | null
  copied: boolean
  isSharing?: boolean
  partnerJoined: boolean
  error: string | null
  onCopy: () => void
  onShare: () => void
  onCancel: () => void
  onCreateNew: () => void
  onGoToMap: () => void
}

const PEEK_HEIGHT = 96

function formatElapsed(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s ago`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s ago`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s ago`
}

export function SessionDetailsBottomSheet({
  code,
  createdAt,
  copied,
  isSharing = false,
  partnerJoined,
  error,
  onCopy,
  onShare,
  onCancel,
  onCreateNew,
  onGoToMap,
}: SessionDetailsBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const [sheetHeight, setSheetHeight] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return

    const updateHeight = () => {
      setSheetHeight(sheet.getBoundingClientRect().height)
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      updateHeight()
    })
    observer.observe(sheet)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!createdAt) {
      setElapsedSeconds(0)
      return
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - createdAt) / 1000)))
    }

    updateElapsed()
    const timer = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(timer)
  }, [createdAt])

  const collapsedOffset = Math.max(0, sheetHeight - PEEK_HEIGHT)

  const {
    isExpanded,
    isDragging,
    justDragged,
    translateY,
    toggleExpanded,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = useBottomSheetDrag({
    collapsedOffset,
    defaultExpanded: true,
    closeThreshold: 0.52,
    closeVelocity: 0.42,
    openVelocity: 0.4,
  })

  const handleToggle = () => {
    if (justDragged) return
    toggleExpanded()
  }

  return (
    <div
      ref={sheetRef}
      className="absolute bottom-0 left-0 right-0 z-[400] overflow-hidden rounded-t-3xl"
      style={{
        backgroundColor: 'var(--color-sheet-surface)',
        borderTop: '1px solid var(--color-sheet-border)',
        boxShadow: '0 -16px 45px rgba(0, 0, 0, 0.35)',
        maxHeight: 'min(78vh, 620px)',
        transform: `translateY(${translateY}px)`,
        transition: isDragging ? 'none' : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls="session-details-panel"
        className={`w-full px-5 pt-3 pb-4 text-left ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          backgroundColor: 'var(--color-sheet-tip)',
          borderBottom: '1px solid var(--color-sheet-border)',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          className="mx-auto mb-2 h-1.5 w-12 rounded-full"
          style={{ backgroundColor: 'var(--color-sheet-handle)' }}
        />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-sheet-text)' }}>
              Session details
            </p>
            <p className="text-xs" style={{ color: 'var(--color-sheet-muted)' }}>
              {partnerJoined ? 'Partner connected' : 'Waiting for partner to join'}
            </p>
          </div>
          <div
            className="rounded-full border px-3 py-1 text-xs font-semibold leading-none whitespace-nowrap"
            style={{
              color: 'var(--color-sheet-text)',
              borderColor: 'var(--color-sheet-border)',
              backgroundColor: 'var(--color-sheet-surface)',
            }}
          >
            Created {formatElapsed(elapsedSeconds)}
          </div>
        </div>
      </button>

      <div
        id="session-details-panel"
        className="overflow-y-auto px-6 pt-5"
        style={{
          maxHeight: 'calc(min(78vh, 620px) - 96px)',
          paddingBottom: 'max(var(--space-4), var(--safe-area-bottom))',
        }}
      >
        <p className="mb-3 text-center text-sm" style={{ color: 'var(--color-sheet-muted)' }}>
          Share this code with your partner
        </p>

        <div className="mb-5 flex items-center justify-center">
          <div
            className="rounded-2xl border px-4 py-2 font-mono text-[1.35rem] font-semibold tracking-[0.12em] leading-none whitespace-nowrap"
            style={{
              color: 'var(--color-sheet-text)',
              borderColor: 'var(--color-sheet-border)',
              backgroundColor: 'var(--color-sheet-tip)',
            }}
          >
            {code}
          </div>
        </div>

        <div className="mb-5 flex gap-3">
          <Button
            variant="secondary"
            onClick={onCopy}
            className="flex-1 whitespace-nowrap"
            leftIcon={copied ? undefined : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="secondary"
            onClick={onShare}
            className="flex-1 whitespace-nowrap"
            leftIcon={isSharing ? undefined : <Share2 className="w-4 h-4" />}
            disabled={isSharing}
            isLoading={isSharing}
          >
            Share
          </Button>
        </div>

        {partnerJoined ? (
          <div className="mb-5">
            <div className="mb-3 flex items-center justify-center gap-2 text-green-500">
              <Users className="w-4 h-4" />
              <span>Partner joined!</span>
            </div>
            <Button onClick={onGoToMap} className="w-full bg-green-500 hover:bg-green-600">
              Go to Map
            </Button>
          </div>
        ) : (
          <div className="mb-5 flex items-center justify-center gap-2" style={{ color: 'var(--color-sheet-muted)' }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for partner to join...</span>
          </div>
        )}

        {error && <p className="mb-4 text-center text-red-400">{error}</p>}

        <Button variant="tertiary" onClick={onCancel} className="mb-3 w-full">
          Cancel Session
        </Button>

        <Button variant="secondary" onClick={onCreateNew} className="w-full">
          Create New Session
        </Button>
      </div>
    </div>
  )
}
