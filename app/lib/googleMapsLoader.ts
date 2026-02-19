let googleMapsLoaderPromise: Promise<any> | null = null
const CALLBACK_NAME = '__man2manGoogleMapsInit'

function getGoogleMapsFromWindow() {
  if (typeof window === 'undefined') return null
  return (window as any).google?.maps ?? null
}

function isMapsReady(maps: any): boolean {
  return Boolean(
    maps &&
    (typeof maps.Map === 'function' || typeof maps.importLibrary === 'function')
  )
}

export function loadGoogleMapsApi(apiKey: string): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in the browser'))
  }

  if (!apiKey) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'))
  }

  const existing = getGoogleMapsFromWindow()
  if (isMapsReady(existing)) {
    return Promise.resolve(existing)
  }

  if (googleMapsLoaderPromise) {
    return googleMapsLoaderPromise
  }

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const scriptId = 'man2man-google-maps-js-api'
    const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&libraries=marker&callback=${CALLBACK_NAME}`

    const cleanup = () => {
      try {
        delete (window as any)[CALLBACK_NAME]
      } catch {
        ;(window as any)[CALLBACK_NAME] = undefined
      }
    }

    const resolveIfReady = (): boolean => {
      const maps = getGoogleMapsFromWindow()
      if (isMapsReady(maps)) {
        cleanup()
        resolve(maps)
        return true
      }
      return false
    }

    const currentScript = document.getElementById(scriptId) as HTMLScriptElement | null
    if (currentScript) {
      if (resolveIfReady()) return
      currentScript.remove()
    }

    ;(window as any)[CALLBACK_NAME] = () => {
      if (resolveIfReady()) return
      cleanup()
      googleMapsLoaderPromise = null
      reject(new Error('Google Maps callback fired but API is not ready'))
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = src
    script.async = true
    script.defer = true

    // With loading=async, prefer callback for readiness, not load event.
    script.onload = () => {
      // no-op
    }

    script.onerror = () => {
      cleanup()
      googleMapsLoaderPromise = null
      reject(new Error('Failed to load Google Maps API script'))
    }

    document.head.appendChild(script)
  })

  return googleMapsLoaderPromise
}

