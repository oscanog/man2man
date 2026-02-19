export interface Location {
  lat: number
  lng: number
}

export interface RoutePoint {
  lat: number
  lng: number
}

export type RouteStatus = 'pending' | 'ready' | 'stale' | 'error'

export interface RoutePath {
  status: RouteStatus
  provider: 'tomtom'
  points: RoutePoint[]
  distanceMeters: number | null
  durationSeconds: number | null
  trafficDurationSeconds: number | null
  computedAt: number
  expiresAt: number
  ageMs: number
  isFresh: boolean
  isUsersMoving: boolean
  lastError?: string
}

export interface CameraState {
  center: Location
  zoom: number
}

export interface MapProviderProps {
  myLocation: Location | null
  partnerLocation: Location | null
  routePath?: RoutePath | null
  zoom?: number
  mapId?: string
  onCameraChange?: (camera: CameraState) => void
  initialCamera?: CameraState | null
}

