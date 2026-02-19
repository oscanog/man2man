let googleMapsLoaderPromise: Promise<any> | null = null

function getGoogleMapsFromWindow() {
  if (typeof window === 'undefined') return null
  return (window as any).google?.maps ?? null
}

export function loadGoogleMapsApi(apiKey: string): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in the browser'))
  }

  if (!apiKey) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'))
  }

  const existing = getGoogleMapsFromWindow()
  if (existing) {
    return Promise.resolve(existing)
  }

  if (googleMapsLoaderPromise) {
    return googleMapsLoaderPromise
  }

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const scriptId = 'man2man-google-maps-js-api'
    const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`

    const currentScript = document.getElementById(scriptId) as HTMLScriptElement | null
    if (currentScript) {
      currentScript.addEventListener('load', () => {
        const maps = getGoogleMapsFromWindow()
        if (maps) {
          resolve(maps)
          return
        }
        googleMapsLoaderPromise = null
        reject(new Error('Google Maps loaded but window.google.maps is unavailable'))
      }, { once: true })
      currentScript.addEventListener('error', () => {
        googleMapsLoaderPromise = null
        reject(new Error('Failed to load Google Maps API script'))
      }, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = src
    script.async = true
    script.defer = true

    script.onload = () => {
      const maps = getGoogleMapsFromWindow()
      if (maps) {
        resolve(maps)
        return
      }
      googleMapsLoaderPromise = null
      reject(new Error('Google Maps loaded but window.google.maps is unavailable'))
    }

    script.onerror = () => {
      googleMapsLoaderPromise = null
      reject(new Error('Failed to load Google Maps API script'))
    }

    document.head.appendChild(script)
  })

  return googleMapsLoaderPromise
}

