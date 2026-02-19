export interface Location {
  lat: number
  lng: number
}

export interface CameraState {
  center: Location
  zoom: number
}

export interface MapProviderProps {
  myLocation: Location | null
  partnerLocation: Location | null
  zoom?: number
  mapId?: string
  onCameraChange?: (camera: CameraState) => void
  initialCamera?: CameraState | null
}

