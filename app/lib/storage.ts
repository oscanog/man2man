/**
 * Local Storage Utilities
 * 
 * Simple key-value storage using localStorage.
 * Mirrors Android's UserDataStore.
 * 
 * NOTE: All functions check for browser environment (typeof window !== 'undefined')
 * to prevent SSR errors.
 */

const STORAGE_KEYS = {
  deviceId: 'man2man_device_id',
  username: 'man2man_username',
  userId: 'man2man_user_id',
  lastKnownUsername: 'man2man_last_username',
} as const

// Check if we're in browser environment
const isBrowser = (): boolean => typeof window !== 'undefined'

export const storage = {
  // Device ID
  getDeviceId(): string | null {
    if (!isBrowser()) return null
    try {
      return localStorage.getItem(STORAGE_KEYS.deviceId)
    } catch {
      return null
    }
  },

  setDeviceId(deviceId: string): void {
    if (!isBrowser()) return
    try {
      localStorage.setItem(STORAGE_KEYS.deviceId, deviceId)
    } catch {
      // Ignore storage errors
    }
  },

  // Username
  getUsername(): string | null {
    if (!isBrowser()) return null
    try {
      return localStorage.getItem(STORAGE_KEYS.username)
    } catch {
      return null
    }
  },

  setUsername(username: string): void {
    if (!isBrowser()) return
    try {
      localStorage.setItem(STORAGE_KEYS.username, username)
      localStorage.setItem(STORAGE_KEYS.lastKnownUsername, username)
    } catch {
      // Ignore storage errors
    }
  },

  getLastKnownUsername(): string | null {
    if (!isBrowser()) return null
    try {
      return localStorage.getItem(STORAGE_KEYS.lastKnownUsername)
    } catch {
      return null
    }
  },

  // User ID
  getUserId(): string | null {
    if (!isBrowser()) return null
    try {
      return localStorage.getItem(STORAGE_KEYS.userId)
    } catch {
      return null
    }
  },

  setUserId(userId: string): void {
    if (!isBrowser()) return
    try {
      localStorage.setItem(STORAGE_KEYS.userId, userId)
    } catch {
      // Ignore storage errors
    }
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
    if (!isBrowser()) return false
    return !!this.getDeviceId() && !!this.getUsername() && !!this.getUserId()
  },

  // Alias for isAuthenticated (for compatibility)
  hasAuthenticated(): boolean {
    return this.isAuthenticated()
  },

  // Clear all data (logout)
  clear(): void {
    if (!isBrowser()) return
    try {
      localStorage.removeItem(STORAGE_KEYS.deviceId)
      localStorage.removeItem(STORAGE_KEYS.username)
      localStorage.removeItem(STORAGE_KEYS.userId)
    } catch {
      // Ignore storage errors
    }
  },
}
