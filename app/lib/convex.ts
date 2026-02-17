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
  message?: string  // Some Convex errors use 'message' field
}

interface RetryConfig {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  shouldRetry?: (error: Error, attempt: number) => boolean
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error, attempt) => {
    // Retry on network errors or 5xx server errors
    const message = error.message.toLowerCase()
    const isNetworkError = message.includes('fetch') || 
                          message.includes('network') ||
                          message.includes('timeout') ||
                          message.includes('abort') ||
                          message.includes('failed')
    const isServerError = message.includes('500') || 
                         message.includes('502') || 
                         message.includes('503') || 
                         message.includes('504')
    return (isNetworkError || isServerError) && attempt < 3
  }
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  // Add random jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1)
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Extract meaningful error message from various error formats
 */
function extractErrorMessage(error: unknown, context: string): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object') {
    // Try to extract message from various error formats
    const errObj = error as Record<string, unknown>
    if (errObj.message) return String(errObj.message)
    if (errObj.error) return String(errObj.error)
    if (errObj.statusText) return String(errObj.statusText)
    return JSON.stringify(error)
  }
  return `${context}: Unknown error`
}

/**
 * Log request details for debugging
 */
function logRequest(type: 'query' | 'mutation', path: string, args: Record<string, unknown>): void {
  console.log(`[Convex ${type.toUpperCase()}] ${path}`, {
    timestamp: new Date().toISOString(),
    args: { ...args, userId: args.userId ? '***' : undefined }, // Mask userId in logs
  })
}

/**
 * Log response details for debugging
 */
function logResponse<T>(
  type: 'query' | 'mutation', 
  path: string, 
  success: boolean, 
  data?: T, 
  error?: string
): void {
  if (success) {
    console.log(`[Convex ${type.toUpperCase()}] ${path} - SUCCESS`, {
      timestamp: new Date().toISOString(),
      hasData: data !== undefined,
    })
  } else {
    console.error(`[Convex ${type.toUpperCase()}] ${path} - ERROR`, {
      timestamp: new Date().toISOString(),
      error,
    })
  }
}

/**
 * Retry wrapper for async operations
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  config: RetryConfig = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, shouldRetry } = { ...DEFAULT_RETRY_CONFIG, ...config }
  
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      if (attempt > 0) {
        console.log(`[Convex Retry] ${context} succeeded after ${attempt} retry(ies)`)
      }
      return result
    } catch (error) {
      lastError = new Error(extractErrorMessage(error, context))
      
      const isLastAttempt = attempt === maxRetries
      const shouldAttemptRetry = shouldRetry(lastError, attempt + 1)
      
      if (isLastAttempt || !shouldAttemptRetry) {
        throw lastError
      }
      
      const delay = getBackoffDelay(attempt, baseDelay, maxDelay)
      console.warn(`[Convex Retry] ${context} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms...`, {
        error: lastError.message,
      })
      
      await sleep(delay)
    }
  }
  
  throw lastError!
}

/**
 * Call a Convex query (read-only)
 */
export async function convexQuery<T>(
  path: string,
  args: Record<string, unknown> = {},
  retryConfig?: RetryConfig
): Promise<T> {
  logRequest('query', path, args)
  
  return withRetry(async () => {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, args } satisfies ConvexRequest),
    })

    const responseText = await response.text()

    if (!response.ok) {
      logResponse('query', path, false, undefined, `HTTP ${response.status}: ${responseText}`)
      throw new Error(`Convex query failed (${response.status}): ${responseText}`)
    }

    let data: ConvexResponse<T>
    try {
      data = JSON.parse(responseText) as ConvexResponse<T>
    } catch {
      logResponse('query', path, false, undefined, `Invalid JSON: ${responseText}`)
      throw new Error(`Invalid Convex response: ${responseText}`)
    }
    
    if (data.status === 'error') {
      const errorMsg = data.error || data.message || JSON.stringify(data) || 'Unknown Convex error'
      console.error(`[Convex ERROR] ${path}:`, { error: data.error, message: data.message, fullData: data })
      logResponse('query', path, false, undefined, errorMsg)
      throw new Error(errorMsg)
    }
    
    logResponse('query', path, true, data.value)
    return data.value as T
  }, `query:${path}`, retryConfig)
}

/**
 * Call a Convex mutation (write)
 */
export async function convexMutation<T>(
  path: string,
  args: Record<string, unknown> = {},
  retryConfig?: RetryConfig
): Promise<T> {
  logRequest('mutation', path, args)
  
  return withRetry(async () => {
    const response = await fetch(`${CONVEX_URL}/api/mutation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, args } satisfies ConvexRequest),
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      console.error(`[Convex HTTP ERROR] ${path}:`, {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      })
      logResponse('mutation', path, false, undefined, `HTTP ${response.status}: ${responseText}`)
      throw new Error(`Convex mutation failed (${response.status}): ${responseText}`)
    }

    let data: ConvexResponse<T>
    try {
      data = JSON.parse(responseText) as ConvexResponse<T>
    } catch {
      logResponse('mutation', path, false, undefined, `Invalid JSON: ${responseText}`)
      throw new Error(`Invalid Convex response: ${responseText}`)
    }
    
    // Log full response for debugging
    console.log(`[Convex DEBUG] ${path} response:`, data)
    
    if (data.status === 'error') {
      // Try multiple possible error message fields
      const errorMsg = data.error || data.message || JSON.stringify(data) || 'Unknown Convex error'
      console.error(`[Convex ERROR] ${path}:`, { error: data.error, message: data.message, fullData: data })
      logResponse('mutation', path, false, undefined, errorMsg)
      throw new Error(errorMsg)
    }
    
    logResponse('mutation', path, true, data.value)
    return data.value as T
  }, `mutation:${path}`, retryConfig)
}

/**
 * Subscribe to a Convex query (using polling for HTTP)
 */
export function subscribeConvexQuery<T>(
  path: string,
  args: Record<string, unknown> = {},
  onUpdate: (data: T) => void,
  onError: (error: Error) => void,
  interval: number = 2000
): () => void {
  let isActive = true
  let consecutiveErrors = 0
  const maxConsecutiveErrors = 5

  const fetchData = async () => {
    if (!isActive) return

    try {
      logRequest('query', path, args)
      
      const response = await fetch(`${CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, args } satisfies ConvexRequest),
      })

      if (response.status === 304) {
        consecutiveErrors = 0
        return
      }
      
      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error')
        throw new Error(`Convex subscription failed (${response.status}): ${text}`)
      }

      const data = await response.json() as ConvexResponse<T>
      
      if (data.status === 'error') {
        throw new Error(data.error || 'Unknown Convex error')
      }
      
      logResponse('query', path, true, data.value)
      consecutiveErrors = 0
      onUpdate(data.value as T)
    } catch (error) {
      consecutiveErrors++
      const errorMessage = extractErrorMessage(error, 'Subscription error')
      logResponse('query', path, false, undefined, errorMessage)
      
      if (isActive) {
        onError(new Error(errorMessage))
        
        // If too many consecutive errors, stop polling to prevent spam
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(`[Convex Subscription] ${path} stopped after ${maxConsecutiveErrors} consecutive errors`)
          isActive = false
        }
      }
    }
  }

  fetchData()
  const intervalId = setInterval(fetchData, interval)

  return () => {
    isActive = false
    clearInterval(intervalId)
  }
}

/**
 * Poll for a condition to become true with timeout
 */
export async function pollWithTimeout<T>(
  pollFn: () => Promise<T>,
  checkFn: (result: T) => boolean,
  options: {
    interval?: number
    timeout?: number
    maxAttempts?: number
  } = {}
): Promise<T> {
  const { interval = 1000, timeout = 10000, maxAttempts = 10 } = options
  
  const startTime = Date.now()
  let attempts = 0
  
  while (attempts < maxAttempts) {
    attempts++
    
    try {
      const result = await pollFn()
      
      if (checkFn(result)) {
        console.log(`[Poll] Condition met after ${attempts} attempt(s)`)
        return result
      }
      
      const elapsed = Date.now() - startTime
      if (elapsed >= timeout) {
        throw new Error(`Polling timeout after ${elapsed}ms`)
      }
      
      console.log(`[Poll] Attempt ${attempts}/${maxAttempts} - condition not met, waiting ${interval}ms...`)
      await sleep(interval)
    } catch (error) {
      // If it's the last attempt, throw the error
      if (attempts >= maxAttempts) {
        throw error
      }
      console.warn(`[Poll] Attempt ${attempts} failed, retrying...`, error)
      await sleep(interval)
    }
  }
  
  throw new Error(`Polling exceeded max attempts (${maxAttempts})`)
}

export { CONVEX_URL }
