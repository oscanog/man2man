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
