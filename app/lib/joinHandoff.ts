const PENDING_JOIN_KEY = 'man2man_pending_join_handoff'
const PENDING_JOIN_TTL_MS = 45_000

export interface PendingJoinHandoff {
  sessionId: string
  code: string
  userId: string
  source: 'shared_link' | 'list' | 'manual'
  createdAt: number
}

const isBrowser = (): boolean => typeof window !== 'undefined'

export function savePendingJoinHandoff(payload: PendingJoinHandoff): void {
  if (!isBrowser()) return
  try {
    sessionStorage.setItem(PENDING_JOIN_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage errors.
  }
}

export function getPendingJoinHandoff(): PendingJoinHandoff | null {
  if (!isBrowser()) return null
  try {
    const raw = sessionStorage.getItem(PENDING_JOIN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingJoinHandoff
    if (!parsed?.sessionId || !parsed?.userId || !parsed?.createdAt) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearPendingJoinHandoff(): void {
  if (!isBrowser()) return
  try {
    sessionStorage.removeItem(PENDING_JOIN_KEY)
  } catch {
    // Ignore storage errors.
  }
}

export function isPendingJoinFresh(payload: PendingJoinHandoff, now: number = Date.now()): boolean {
  return payload.createdAt + PENDING_JOIN_TTL_MS > now
}
