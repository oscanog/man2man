/**
 * Convex HTTP Client - Public API
 * 
 * Uses the public Convex HTTP API instead of generated types.
 * This makes it easier for Android devs to understand and replicate.
 * 
 * Convex Production URL: https://hushed-dog-982.convex.cloud
 */

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || 'https://hushed-dog-982.convex.cloud'

interface ConvexRequest {
  path: string
  args: Record<string, unknown>
}

interface ConvexResponse<T> {
  status: 'success' | 'error'
  value?: T
  error?: string
}

/**
 * Call a Convex query (read-only)
 */
export async function convexQuery<T>(
  path: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(`${CONVEX_URL}/api/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, args } satisfies ConvexRequest),
  })

  if (!response.ok) {
    throw new Error(`Convex query failed: ${response.statusText}`)
  }

  const data = await response.json() as ConvexResponse<T>
  
  if (data.status === 'error') {
    throw new Error(data.error || 'Unknown Convex error')
  }
  
  return data.value as T
}

/**
 * Call a Convex mutation (write)
 */
export async function convexMutation<T>(
  path: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, args } satisfies ConvexRequest),
  })

  if (!response.ok) {
    throw new Error(`Convex mutation failed: ${response.statusText}`)
  }

  const data = await response.json() as ConvexResponse<T>
  
  if (data.status === 'error') {
    throw new Error(data.error || 'Unknown Convex error')
  }
  
  return data.value as T
}

/**
 * Subscribe to a Convex query (using polling for HTTP)
 * For real-time updates, poll every interval
 */
export function subscribeConvexQuery<T>(
  path: string,
  args: Record<string, unknown> = {},
  onUpdate: (data: T) => void,
  onError: (error: Error) => void,
  interval: number = 2000
): () => void {
  let isActive = true
  let lastEtag: string | null = null

  const fetchData = async () => {
    if (!isActive) return

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Use etag for efficient polling
      if (lastEtag) {
        headers['If-None-Match'] = lastEtag
      }

      const response = await fetch(`${CONVEX_URL}/api/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ path, args } satisfies ConvexRequest),
      })

      if (response.status === 304) {
        // No change, skip
        return
      }

      if (!response.ok) {
        throw new Error(`Convex subscription failed: ${response.statusText}`)
      }

      // Store etag for next poll
      const etag = response.headers.get('ETag')
      if (etag) {
        lastEtag = etag
      }

      const data = await response.json() as ConvexResponse<T>
      
      if (data.status === 'error') {
        throw new Error(data.error || 'Unknown Convex error')
      }
      
      onUpdate(data.value as T)
    } catch (error) {
      if (isActive) {
        onError(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  // Initial fetch
  fetchData()

  // Set up polling
  const intervalId = setInterval(fetchData, interval)

  // Return cleanup function
  return () => {
    isActive = false
    clearInterval(intervalId)
  }
}

// Export URL for other uses
export { CONVEX_URL }
