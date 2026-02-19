import { describe, expect, it } from 'vitest'
import { getRouteModeFromSnapshot, hydrateMeetingRoutePath, type RouteSnapshotResponse } from '@/hooks/useMeetingRoutes'

describe('useMeetingRoutes helpers', () => {
  it('hydrates route snapshots for map rendering', () => {
    const snapshot: RouteSnapshotResponse = {
      routeKey: 'meeting:user_1',
      routeOwnerUserId: 'user_1',
      destinationMode: 'meeting_place',
      status: 'ready',
      provider: 'tomtom',
      polyline: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }],
      distanceMeters: 3200,
      durationSeconds: 420,
      trafficDurationSeconds: 480,
      computedAt: 1,
      expiresAt: 2,
      ageMs: 50,
      isFresh: true,
    }

    const routePath = hydrateMeetingRoutePath(snapshot, true)
    expect(routePath.id).toBe('meeting:user_1')
    expect(routePath.destinationMode).toBe('meeting_place')
    expect(routePath.points.length).toBe(2)
    expect(routePath.isUsersMoving).toBe(true)
  })

  it('switches mode based on backend response', () => {
    expect(getRouteModeFromSnapshot(null)).toBe('pair')
    expect(getRouteModeFromSnapshot({
      mode: 'pair',
      meetingPlace: null,
      routes: [],
    })).toBe('pair')
    expect(getRouteModeFromSnapshot({
      mode: 'meeting_place',
      meetingPlace: {
        status: 'set',
        place: {
          name: 'Central Park',
          lat: 40.785091,
          lng: -73.968285,
        },
      },
      routes: [],
    })).toBe('meeting_place')
  })
})
