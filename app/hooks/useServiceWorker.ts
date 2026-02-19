import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  offlineReady: boolean;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => void;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    registration: null,
    updateAvailable: false,
    offlineReady: false,
  });

  // Check if service worker is supported
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isSupported = 'serviceWorker' in navigator;
    setState(prev => ({ ...prev, isSupported }));
  }, []);

  // Register service worker
  const register = useCallback(async () => {
    if (!state.isSupported || typeof window === 'undefined') {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // Check for existing registration
      setState(prev => ({
        ...prev,
        isRegistered: true,
        registration,
        offlineReady: true,
      }));

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({
                ...prev,
                updateAvailable: true,
              }));
            }
          });
        }
      });

      // Check for waiting worker on page load
      if (registration.waiting && navigator.serviceWorker.controller) {
        setState(prev => ({
          ...prev,
          updateAvailable: true,
        }));
      }

    } catch (error) {
      console.error('[useServiceWorker] Service Worker registration failed:', error);
    }
  }, [state.isSupported]);

  // Unregister service worker
  const unregister = useCallback(async () => {
    if (!state.registration) return;

    try {
      const success = await state.registration.unregister();
      
      if (success) {
        setState(prev => ({
          ...prev,
          isRegistered: false,
          registration: null,
          updateAvailable: false,
        }));
      }
    } catch (error) {
      console.error('[useServiceWorker] Service Worker unregister failed:', error);
    }
  }, [state.registration]);

  // Update service worker
  const update = useCallback(async () => {
    if (!state.registration) return;

    try {
      await state.registration.update();
    } catch (error) {
      console.error('[useServiceWorker] Service Worker update failed:', error);
    }
  }, [state.registration]);

  // Skip waiting and activate new service worker
  const skipWaiting = useCallback(() => {
    if (!state.registration?.waiting) return;

    // Message the waiting service worker to skip waiting
    state.registration.waiting.postMessage('skipWaiting');
    
    // Reload the page to activate the new service worker
    window.location.reload();
  }, [state.registration]);

  return {
    ...state,
    register,
    unregister,
    update,
    skipWaiting,
  };
}

// Hook to track online/offline status
export function useOnlineStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}

// Hook to request notification permission
export function useNotifications(): {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (title: string, options?: NotificationOptions) => void;
} {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'default'
  );

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied' as NotificationPermission;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('[useNotifications] Permission request failed:', error);
      return 'denied' as NotificationPermission;
    }
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (typeof window === 'undefined' || permission !== 'granted') return;

    try {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options,
      });
    } catch (error) {
      console.error('[useNotifications] Show notification failed:', error);
    }
  }, [permission]);

  return {
    permission,
    requestPermission,
    showNotification,
  };
}

export default useServiceWorker;
