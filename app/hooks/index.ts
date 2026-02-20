/**
 * Custom Hooks
 * 
 * Export all custom hooks for easy importing.
 */

// Convex hooks
export {
  useConvexQuery,
  useConvexMutation,
  useConvexSubscription,
} from './useConvexQuery'

// User hooks
export { useUser } from './useUser'
export type { User } from './useUser'

// Session hooks
export {
  useSession,
  useSessionWatcher,
  useActiveSessions,
} from './useSession'
export type { Session } from './useSession'

// Location hooks
export {
  useGeolocation,
  useLocationUpdater,
  usePartnerLocation,
  calculateDistance,
  formatDistance,
} from './useLocation'
export type { Location } from './useLocation'

// PWA hooks
export {
  useServiceWorker,
  useOnlineStatus,
  useNotifications,
} from './useServiceWorker'

// Presence and online users hooks
export { usePresenceHeartbeat } from './usePresenceHeartbeat'
export { useOnlineUsers } from './useOnlineUsers'
export type { OnlineUser } from './useOnlineUsers'

// Invite/session handshake hooks
export { useSessionInvites } from './useSessionInvites'
export type { IncomingInvite, OutgoingInvite, InviteStatus } from './useSessionInvites'

// Meeting-place hooks
export { useMeetingPlace } from './useMeetingPlace'
export type { MeetingPlace, MeetingPlaceState, MeetingPlaceStatus } from './useMeetingPlace'
export { useMeetingPlaceSearch } from './useMeetingPlaceSearch'
export { useMeetingRoutes } from './useMeetingRoutes'
export { useMapCameraPreference } from './useMapCameraPreference'
export type { MapCameraMode } from './useMapCameraPreference'
