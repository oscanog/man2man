import { describe, expect, it } from 'vitest'
import { getMapCameraPreferenceKey, parseMapCameraMode } from '@/hooks/useMapCameraPreference'

describe('useMapCameraPreference helpers', () => {
  it('builds stable per-user storage keys', () => {
    expect(getMapCameraPreferenceKey('user_123')).toBe('man2man_map_camera_mode_user_123')
    expect(getMapCameraPreferenceKey(null)).toBe('man2man_map_camera_mode_anonymous')
  })

  it('parses camera mode values safely', () => {
    expect(parseMapCameraMode('manual')).toBe('manual')
    expect(parseMapCameraMode('auto')).toBe('auto')
    expect(parseMapCameraMode('unexpected')).toBe('auto')
    expect(parseMapCameraMode(null)).toBe('auto')
  })
})
