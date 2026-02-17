import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * User interface matching Convex User type
 */
export interface User {
  _id: string;
  deviceId: string;
  username: string;
  isOnline: boolean;
  lastSeen: number;
  _creationTime: number;
}

/**
 * User store state interface
 */
interface UserState {
  // State
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  clearUser: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  isAuthenticated: boolean;
  deviceId: string | null;
}

/**
 * Zustand store for user state management
 * Persists user data to localStorage
 */
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) =>
        set({
          user,
          error: null,
          isLoading: false,
        }),

      clearUser: () =>
        set({
          user: null,
          error: null,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) =>
        set({
          error,
          isLoading: false,
        }),

      // Computed getters
      get isAuthenticated() {
        return get().user !== null;
      },

      get deviceId() {
        return get().user?.deviceId ?? null;
      },
    }),
    {
      name: "man2man-user-storage",
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);

export default useUserStore;
