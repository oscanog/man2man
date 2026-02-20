import { Loader2, RefreshCw, UserRoundPlus } from 'lucide-react'

interface IdentityRecoveryDialogProps {
  isOpen: boolean
  lastUsername: string | null
  isLoading: boolean
  error: string | null
  onUseLastUsername: () => void
  onChooseOtherUsername: () => void
}

export function IdentityRecoveryDialog({
  isOpen,
  lastUsername,
  isLoading,
  error,
  onUseLastUsername,
  onChooseOtherUsername,
}: IdentityRecoveryDialogProps) {
  if (!isOpen) return null

  const trimmedLastUsername = lastUsername?.trim() ?? ''
  const canReuseLastUsername = trimmedLastUsername.length > 0

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[980]"
        style={{ backgroundColor: 'var(--color-modal-backdrop)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[995] flex items-center justify-center p-5"
      >
        <div className="identity-recovery-card w-full max-w-sm rounded-3xl p-5">
          <div className="identity-recovery-glow" aria-hidden="true" />

          <div className="relative">
            <div className="identity-recovery-badge">
              <RefreshCw className="w-4 h-4" />
              Profile recovery
            </div>

            <h2 className="mt-4 text-xl font-semibold" style={{ color: 'var(--color-modal-text)' }}>
              Continue as your last username?
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-modal-text-muted)' }}>
              Your previous profile was cleaned up after inactivity. We can bring you back online now.
            </p>

            <div className="identity-recovery-username-chip mt-4">
              <UserRoundPlus className="w-4 h-4" />
              {trimmedLastUsername ? `@${trimmedLastUsername}` : 'No remembered username'}
            </div>

            {error && (
              <div
                className="mt-4 rounded-xl p-3 text-sm"
                style={{
                  backgroundColor: 'var(--color-modal-error-bg)',
                  border: '1px solid var(--color-modal-error-border)',
                  color: 'var(--color-modal-error-text)',
                }}
              >
                {error}
              </div>
            )}

            <div className="mt-5 space-y-3">
              <button
                onClick={onUseLastUsername}
                disabled={isLoading || !canReuseLastUsername}
                className="identity-recovery-primary-btn"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isLoading
                  ? 'Restoring profile...'
                  : canReuseLastUsername
                    ? `Use @${trimmedLastUsername}`
                    : 'Use last username'}
              </button>

              <button
                onClick={onChooseOtherUsername}
                disabled={isLoading}
                className="identity-recovery-secondary-btn"
              >
                Choose another username
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
