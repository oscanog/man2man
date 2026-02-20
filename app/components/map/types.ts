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
  id?: string
  ownerUserId?: string | null
  destinationMode?: 'partner' | 'meeting_place'
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

export interface MeetingRouteSummary {
  mode: 'pair' | 'meeting_place'
  routes: RoutePath[]
}

export interface CameraState {
  center: Location
  zoom: number
}

export type CameraMode = 'auto' | 'manual'

export interface MapProviderProps {
  myLocation: Location | null
  partnerLocation: Location | null
  routePath?: RoutePath | null
  routePaths?: RoutePath[] | null
  meetingPlaceLocation?: Location | null
  currentUserId?: string | null
  cameraMode?: CameraMode
  recenterSignal?: number
  zoom?: number
  mapId?: string
  onCameraChange?: (camera: CameraState) => void
  initialCamera?: CameraState | null
}

