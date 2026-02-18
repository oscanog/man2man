import { useEffect, useMemo, useRef } from 'react'
import { Circle, Users, X } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { OnlineUser } from '@/hooks/useOnlineUsers'

interface OnlineUsersDrawerProps {
  isOpen: boolean
  users: OnlineUser[]
  currentUserId: string | null
  currentUsername: string | null
  isLoading: boolean
  error: string | null
  onUserClick?: (user: OnlineUser) => void
  onClose: () => void
}

function formatLastSeen(lastSeen: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - lastSeen) / 1000))
  if (seconds < 30) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export function OnlineUsersDrawer({
  isOpen,
  users,
  currentUserId,
  currentUsername,
  isLoading,
  error,
  onUserClick,
  onClose,
}: OnlineUsersDrawerProps) {
  const openedAtRef = useRef(0)

  useEffect(() => {
    if (!isOpen) return
    openedAtRef.current = Date.now()
  }, [isOpen])

  const handleBackdropClick = () => {
    if (Date.now() - openedAtRef.current < 120) return
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const sortedUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      const aIsSelf = a._id === currentUserId
      const bIsSelf = b._id === currentUserId
      if (aIsSelf && !bIsSelf) return -1
      if (!aIsSelf && bIsSelf) return 1
      return b.lastSeen - a.lastSeen
    })

    if (currentUserId || !currentUsername) {
      return sorted
    }

    return [
      {
        _id: 'self-fallback',
        username: currentUsername,
        isOnline: true,
        lastSeen: Date.now(),
      },
      ...sorted,
    ]
  }, [users, currentUserId, currentUsername])

  return (
    <>
      <button
        aria-label="Close online users sidebar"
        onClick={handleBackdropClick}
        className={`fixed inset-0 z-[950] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'var(--color-drawer-backdrop)' }}
      />

      <aside
        aria-label="Online users"
        className={`fixed top-0 left-0 z-[960] h-full w-[82vw] max-w-[360px] transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          backgroundColor: 'var(--color-drawer-surface)',
          borderRight: '1px solid var(--color-drawer-border)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div className="safe-area-inset h-full flex flex-col px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-drawer-accent-soft)' }}
              >
                <Users className="w-5 h-5" style={{ color: 'var(--color-rose)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-drawer-text)' }}>
                  Online users
                </p>
                <p className="text-xs" style={{ color: 'var(--color-drawer-text-muted)' }}>
                  {sortedUsers.length} active right now
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-black/10"
              aria-label="Close online users sidebar"
            >
              <X className="w-5 h-5" style={{ color: 'var(--color-drawer-text)' }} />
            </button>
          </div>

          <div className="mt-5 flex-1 overflow-y-auto scrollbar-hide">
            {isLoading && (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="h-14 rounded-2xl animate-pulse-skeleton"
                    style={{ backgroundColor: 'var(--color-drawer-skeleton)' }}
                  />
                ))}
              </div>
            )}

            {!isLoading && error && (
              <div
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: 'var(--color-drawer-error-bg)',
                  border: '1px solid var(--color-drawer-error-border)',
                }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--color-drawer-error-text)' }}>
                  {error}
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-drawer-text-muted)' }}>
                  Close and reopen the sidebar to retry.
                </p>
              </div>
            )}

            {!isLoading && !error && sortedUsers.length === 0 && (
              <div
                className="rounded-2xl p-4 text-sm"
                style={{
                  backgroundColor: 'var(--color-drawer-muted-bg)',
                  color: 'var(--color-drawer-text-muted)',
                }}
              >
                No online users yet.
              </div>
            )}

            {!isLoading && !error && sortedUsers.length > 0 && (
              <div className="space-y-2">
                {sortedUsers.map((user, index) => {
                  const isSelf = user._id === currentUserId || (!currentUserId && user._id === 'self-fallback')
                  const isClickable = Boolean(onUserClick) && !isSelf && user._id !== 'self-fallback'
                  const rowContent = (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold"
                        style={{
                          backgroundColor: isSelf ? 'var(--color-drawer-accent-soft)' : 'var(--color-drawer-avatar-bg)',
                          color: 'var(--color-drawer-text)',
                        }}
                      >
                        {getInitials(user.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-drawer-text)' }}>
                            {user.username}
                          </p>
                          {isSelf && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                              style={{
                                color: 'var(--color-rose)',
                                backgroundColor: 'var(--color-drawer-accent-soft)',
                              }}
                            >
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-drawer-text-muted)' }}>
                          Last seen {formatLastSeen(user.lastSeen)}
                        </p>
                      </div>
                      <Circle className="w-2.5 h-2.5 fill-current" style={{ color: 'var(--color-success)' }} />
                    </div>
                  )

                  if (isClickable) {
                    return (
                      <button
                        key={user._id}
                        onClick={() => onUserClick?.(user)}
                        className={`w-full text-left rounded-2xl px-3 py-3 transition-all duration-300 hover:scale-[1.01] ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'}`}
                        style={{
                          transitionDelay: `${60 + index * 30}ms`,
                          backgroundColor: 'var(--color-drawer-item-bg)',
                          border: '1px solid var(--color-drawer-border)',
                        }}
                      >
                        {rowContent}
                      </button>
                    )
                  }

                  return (
                    <div
                      key={user._id}
                      className={`rounded-2xl px-3 py-3 transition-all duration-300 ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'}`}
                      style={{
                        transitionDelay: `${60 + index * 30}ms`,
                        backgroundColor: isSelf ? 'var(--color-drawer-self-bg)' : 'var(--color-drawer-item-bg)',
                        border: `1px solid ${isSelf ? 'var(--color-drawer-self-border)' : 'var(--color-drawer-border)'}`,
                      }}
                    >
                      {rowContent}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
