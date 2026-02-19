import { Loader2, X } from 'lucide-react'
import type { ReactNode } from 'react'

interface DialogShellProps {
  isOpen: boolean
  title: string
  description: string
  children: ReactNode
  onClose?: () => void
}

function DialogShell({ isOpen, title, description, children, onClose }: DialogShellProps) {
  return (
    <>
      <button
        aria-label="Close dialog backdrop"
        onClick={onClose}
        disabled={!onClose}
        className={`fixed inset-0 z-[980] transition-opacity duration-250 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'var(--color-modal-backdrop)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed inset-0 z-[990] flex items-center justify-center p-5 transition-all duration-250 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div
          className={`w-full max-w-sm rounded-3xl p-5 transform-gpu transition-transform duration-250 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-[0.98]'}`}
          style={{
            backgroundColor: 'var(--color-modal-surface)',
            border: '1px solid var(--color-modal-border)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-modal-text)' }}>
                {title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-modal-text-muted)' }}>
                {description}
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" style={{ color: 'var(--color-modal-text)' }} />
              </button>
            )}
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </>
  )
}

interface InviteSendConfirmDialogProps {
  isOpen: boolean
  targetName: string
  isLoading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function InviteSendConfirmDialog({
  isOpen,
  targetName,
  isLoading,
  error,
  onCancel,
  onConfirm,
}: InviteSendConfirmDialogProps) {
  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onCancel}
      title="Request Location Session"
      description={`Do you want to ask ${targetName} to share a location session with you?`}
    >
      {error && (
        <div
          className="mb-4 rounded-xl p-3 text-sm"
          style={{
            backgroundColor: 'var(--color-modal-error-bg)',
            border: '1px solid var(--color-modal-error-border)',
            color: 'var(--color-modal-error-text)',
          }}
        >
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="h-11 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-modal-muted-bg)',
            color: 'var(--color-modal-text)',
            border: '1px solid var(--color-modal-border)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-rose)',
            color: '#fff',
          }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? 'Sending...' : 'Send Request'}
        </button>
      </div>
    </DialogShell>
  )
}

interface IncomingInviteDialogProps {
  isOpen: boolean
  requesterName: string
  isLoading: boolean
  error: string | null
  onDecline: () => void
  onAccept: () => void
}

export function IncomingInviteDialog({
  isOpen,
  requesterName,
  isLoading,
  error,
  onDecline,
  onAccept,
}: IncomingInviteDialogProps) {
  return (
    <DialogShell
      isOpen={isOpen}
      title="Location Session Request"
      description={`${requesterName} is asking to share a location session with you. Do you want to continue?`}
    >
      {error && (
        <div
          className="mb-4 rounded-xl p-3 text-sm"
          style={{
            backgroundColor: 'var(--color-modal-error-bg)',
            border: '1px solid var(--color-modal-error-border)',
            color: 'var(--color-modal-error-text)',
          }}
        >
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onDecline}
          disabled={isLoading}
          className="h-11 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-modal-muted-bg)',
            color: 'var(--color-modal-text)',
            border: '1px solid var(--color-modal-border)',
          }}
        >
          Decline
        </button>
        <button
          onClick={onAccept}
          disabled={isLoading}
          className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-rose)',
            color: '#fff',
          }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? 'Processing...' : 'Accept'}
        </button>
      </div>
    </DialogShell>
  )
}

interface OutgoingPendingDialogProps {
  isOpen: boolean
  recipientName: string
  isCancelling: boolean
  onCancelInvite: () => void
}

export function OutgoingPendingDialog({
  isOpen,
  recipientName,
  isCancelling,
  onCancelInvite,
}: OutgoingPendingDialogProps) {
  return (
    <DialogShell
      isOpen={isOpen}
      title="Waiting for Response"
      description={`Request sent to ${recipientName}. You'll be connected automatically once they accept.`}
    >
      <button
        onClick={onCancelInvite}
        disabled={isCancelling}
        className="w-full h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
        style={{
          backgroundColor: 'var(--color-modal-muted-bg)',
          color: 'var(--color-modal-text)',
          border: '1px solid var(--color-modal-border)',
        }}
      >
        {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {isCancelling ? 'Cancelling...' : 'Cancel Request'}
      </button>
    </DialogShell>
  )
}

interface LeaveCurrentSessionConfirmDialogProps {
  isOpen: boolean
  currentPartnerName: string
  targetName: string
  isLoading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function LeaveCurrentSessionConfirmDialog({
  isOpen,
  currentPartnerName,
  targetName,
  isLoading,
  error,
  onCancel,
  onConfirm,
}: LeaveCurrentSessionConfirmDialogProps) {
  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onCancel}
      title="Leave current session?"
      description={`You're connected with ${currentPartnerName}. Leave this session and request ${targetName} instead?`}
    >
      {error && (
        <div
          className="mb-4 rounded-xl p-3 text-sm"
          style={{
            backgroundColor: 'var(--color-modal-error-bg)',
            border: '1px solid var(--color-modal-error-border)',
            color: 'var(--color-modal-error-text)',
          }}
        >
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="h-11 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-modal-muted-bg)',
            color: 'var(--color-modal-text)',
            border: '1px solid var(--color-modal-border)',
          }}
        >
          No
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-rose)',
            color: '#fff',
          }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? 'Switching...' : 'Yes'}
        </button>
      </div>
    </DialogShell>
  )
}

interface AlreadyConnectedDialogProps {
  isOpen: boolean
  connectedName: string
  onClose: () => void
}

export function AlreadyConnectedDialog({
  isOpen,
  connectedName,
  onClose,
}: AlreadyConnectedDialogProps) {
  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Already connected"
      description={`You already have an active session with ${connectedName}.`}
    >
      <button
        onClick={onClose}
        className="w-full h-11 rounded-xl text-sm font-semibold transition-opacity"
        style={{
          backgroundColor: 'var(--color-rose)',
          color: '#fff',
        }}
      >
        OK
      </button>
    </DialogShell>
  )
}
