import type { ReactNode } from 'react'
import { Loader2, MapPin, Search, X } from 'lucide-react'
import type { MeetingPlace } from '@/hooks/useMeetingPlace'

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
        className={`fixed inset-0 z-[990] flex items-end justify-center p-4 pb-[max(16px,var(--safe-area-bottom))] sm:items-center sm:p-5 transition-all duration-250 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div
          className={`w-full max-w-md rounded-3xl p-5 transform-gpu transition-transform duration-250 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-[0.98]'}`}
          style={{
            backgroundColor: 'var(--color-modal-surface)',
            border: '1px solid var(--color-meeting-dialog-border)',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.32)',
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

interface MeetingPlaceSearchDialogProps {
  isOpen: boolean
  query: string
  onQueryChange: (value: string) => void
  suggestions: MeetingPlace[]
  isLoading: boolean
  error: string | null
  onClose: () => void
  onSelect: (place: MeetingPlace) => void
}

export function MeetingPlaceSearchDialog({
  isOpen,
  query,
  onQueryChange,
  suggestions,
  isLoading,
  error,
  onClose,
  onSelect,
}: MeetingPlaceSearchDialogProps) {
  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Set Meetup"
      description="Search a place and pick one shared destination for both of you."
    >
      <div
        className="rounded-2xl px-3 py-2 flex items-center gap-2"
        style={{
          border: '1px solid var(--color-meeting-input-border)',
          background: 'var(--color-meeting-input-bg)',
        }}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--color-modal-text-muted)' }} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Coffee shop, station, mall..."
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: 'var(--color-modal-text)' }}
          autoFocus
        />
      </div>

      {error && (
        <div
          className="mt-3 rounded-xl p-3 text-sm"
          style={{
            backgroundColor: 'var(--color-modal-error-bg)',
            border: '1px solid var(--color-modal-error-border)',
            color: 'var(--color-modal-error-text)',
          }}
        >
          {error}
        </div>
      )}

      <div className="mt-3 max-h-[42vh] overflow-auto pr-1">
        {isLoading ? (
          <div className="py-5 flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--color-modal-text-muted)' }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching places...
          </div>
        ) : null}

        {!isLoading && suggestions.length === 0 ? (
          <div
            className="rounded-xl p-3 text-sm"
            style={{
              border: '1px solid var(--color-meeting-suggestion-border)',
              background: 'var(--color-meeting-suggestion-bg)',
              color: 'var(--color-modal-text-muted)',
            }}
          >
            Type at least 2 characters to get suggestions.
          </div>
        ) : null}

        {suggestions.map((suggestion) => (
          <button
            key={`${suggestion.providerPlaceId ?? suggestion.name}-${suggestion.lat}-${suggestion.lng}`}
            onClick={() => onSelect(suggestion)}
            className="w-full mt-2 rounded-xl p-3 text-left transition-colors hover:brightness-105"
            style={{
              border: '1px solid var(--color-meeting-suggestion-border)',
              background: 'var(--color-meeting-suggestion-bg)',
            }}
          >
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-meeting-accent)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-modal-text)' }}>
                  {suggestion.name}
                </p>
                {suggestion.address ? (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-modal-text-muted)' }}>
                    {suggestion.address}
                  </p>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </DialogShell>
  )
}

interface MeetingPlaceConfirmDialogProps {
  isOpen: boolean
  place: MeetingPlace | null
  partnerLabel: string
  isLoading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function MeetingPlaceConfirmDialog({
  isOpen,
  place,
  partnerLabel,
  isLoading,
  error,
  onCancel,
  onConfirm,
}: MeetingPlaceConfirmDialogProps) {
  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onCancel}
      title="Confirm meetup place"
      description={`Set ${place?.name ?? 'this place'} as your meeting place with ${partnerLabel}?`}
    >
      {place?.address ? (
        <p className="text-xs mb-3" style={{ color: 'var(--color-modal-text-muted)' }}>
          {place.address}
        </p>
      ) : null}

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
          disabled={isLoading || !place}
          className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-meeting-accent)',
            color: '#fff',
          }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? 'Setting...' : 'Set Meetup'}
        </button>
      </div>
    </DialogShell>
  )
}

interface MeetingPlaceRequestRemovalDialogProps {
  isOpen: boolean
  placeName: string
  isLoading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function MeetingPlaceRequestRemovalDialog({
  isOpen,
  placeName,
  isLoading,
  error,
  onCancel,
  onConfirm,
}: MeetingPlaceRequestRemovalDialogProps) {
  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onCancel}
      title="Meeting place already set"
      description={`There is already a meeting place (${placeName}). Request removal before setting a new one?`}
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
          Not now
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-meeting-accent)',
            color: '#fff',
          }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? 'Requesting...' : 'Request Removal'}
        </button>
      </div>
    </DialogShell>
  )
}

interface MeetingPlaceRemovalDecisionDialogProps {
  isOpen: boolean
  requesterLabel: string
  isLoading: boolean
  error: string | null
  onKeep: () => void
  onRemove: () => void
}

export function MeetingPlaceRemovalDecisionDialog({
  isOpen,
  requesterLabel,
  isLoading,
  error,
  onKeep,
  onRemove,
}: MeetingPlaceRemovalDecisionDialogProps) {
  return (
    <DialogShell
      isOpen={isOpen}
      title="Removal requested"
      description={`${requesterLabel} requested to remove the current meeting place. What do you want to do?`}
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
          onClick={onKeep}
          disabled={isLoading}
          className="h-11 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-modal-muted-bg)',
            color: 'var(--color-modal-text)',
            border: '1px solid var(--color-modal-border)',
          }}
        >
          Keep Place
        </button>
        <button
          onClick={onRemove}
          disabled={isLoading}
          className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-meeting-accent)',
            color: '#fff',
          }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? 'Applying...' : 'Remove Place'}
        </button>
      </div>
    </DialogShell>
  )
}
