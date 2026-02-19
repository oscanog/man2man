/**
 * Client-only Map Component
 *
 * Keeps current import contract while delegating provider switching logic
 * to MapSwitcher (Leaflet <-> Google Maps).
 */

import { useEffect, useState } from 'react'
import { MapSwitcher } from '@/components/map/MapSwitcher'
import type { Location, RoutePath } from '@/components/map/types'

interface MapProps {
  myLocation: Location | null
  partnerLocation: Location | null
  routePath?: RoutePath | null
  routePaths?: RoutePath[] | null
  meetingPlaceLocation?: Location | null
  zoom?: number
  isPartnerConnected?: boolean
  userId?: string | null
}

export function Map({
  myLocation,
  partnerLocation,
  routePath = null,
  routePaths = null,
  meetingPlaceLocation = null,
  zoom = 15,
  isPartnerConnected = false,
  userId,
}: MapProps) {
  return (
    <MapSwitcher
      myLocation={myLocation}
      partnerLocation={partnerLocation}
      routePath={routePath}
      routePaths={routePaths}
      meetingPlaceLocation={meetingPlaceLocation}
      zoom={zoom}
      isPartnerConnected={isPartnerConnected}
      userId={userId}
    />
  )
}

export function useIsBrowser() {
  const [isBrowser, setIsBrowser] = useState(false)

  useEffect(() => {
    setIsBrowser(true)
  }, [])

  return isBrowser
}

