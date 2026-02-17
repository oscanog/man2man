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

  // Set all auth data at once
  setAuthData(deviceId: string, username: string, userId: string): void {
    this.setDeviceId(deviceId)
    this.setUsername(username)
    this.setUserId(userId)
  },

  // Get all auth data
  getAuth(): { deviceId: string | null; username: string | null; userId: string | null } {
    return {
      deviceId: this.getDeviceId(),
      username: this.getUsername(),
      userId: this.getUserId(),
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getDeviceId() && !!this.getUsername() && !!this.getUserId()
  },

  // Alias for isAuthenticated (for compatibility)
  hasAuthenticated(): boolean {
    return this.isAuthenticated()
  },

  // Clear all data (logout)
  clear(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEYS.deviceId)
    localStorage.removeItem(STORAGE_KEYS.username)
    localStorage.removeItem(STORAGE_KEYS.userId)
  },
}
