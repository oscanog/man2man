/**
 * Local Storage Utilities
 * 
 * Simple key-value storage using localStorage.
 * Mirrors Android's UserDataStore.
 */

const STORAGE_KEYS = {
  deviceId: 'man2man_device_id',
  username: 'man2man_username',
  userId: 'man2man_user_id',
} as const

export const storage = {
  // Device ID
  getDeviceId(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEYS.deviceId)
  },

  setDeviceId(deviceId: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.deviceId, deviceId)
  },

  // Username
  getUsername(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEYS.username)
  },

  setUsername(username: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.username, username)
  },

  // User ID
  getUserId(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEYS.userId)
  },

  setUserId(userId: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.userId, userId)
  },

  // Check if user is logged in
  isAuthenticated(): boolean {
    return !!this.getDeviceId() && !!this.getUsername() && !!this.getUserId()
  },

  // Clear all data (logout)
  clear(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEYS.deviceId)
    localStorage.removeItem(STORAGE_KEYS.username)
    localStorage.removeItem(STORAGE_KEYS.userId)
  },
}
