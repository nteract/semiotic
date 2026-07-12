/**
 * Transport-level request limits for the hosted MCP service.
 *
 * Transport checks run before request dispatch. They are intentionally small,
 * deterministic, and dependency-free so proxy-level traffic still gets a fast,
 * predictable rejection path before render/inspect logic starts.
 */

export const DEFAULT_MCP_MAX_CONCURRENT_REQUESTS = 16
export const DEFAULT_MCP_MAX_REQUESTS_PER_WINDOW = 240
export const DEFAULT_MCP_REQUEST_WINDOW_MS = 60_000

export type McpRequestLimitCode = "MCP_REQUEST_CONCURRENCY" | "MCP_REQUEST_RATE"

export type McpRequestLimits = {
  maxConcurrentRequests: number
  maxRequestsPerWindow: number
  requestWindowMs: number
}

export type McpRequestLimitState = {
  activeRequests: number
  requestWindowStart: number
  requestsInWindow: number
}

export type McpRequestLimitResult =
  | {
      ok: true
      release: () => void
    }
  | {
      ok: false
      code: McpRequestLimitCode
      message: string
      retryAfterMs: number
    }

type LimitEnvironment = Record<string, string | undefined>

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

/** Resolve request limits once at service startup. */
export function resolveMcpRequestLimits(
  env: LimitEnvironment = process.env,
): McpRequestLimits {
  return {
    maxConcurrentRequests: positiveInteger(
      env.MCP_MAX_CONCURRENT_REQUESTS,
      DEFAULT_MCP_MAX_CONCURRENT_REQUESTS,
    ),
    maxRequestsPerWindow: positiveInteger(
      env.MCP_MAX_REQUESTS_PER_WINDOW,
      DEFAULT_MCP_MAX_REQUESTS_PER_WINDOW,
    ),
    requestWindowMs: positiveInteger(env.MCP_REQUEST_WINDOW_MS, DEFAULT_MCP_REQUEST_WINDOW_MS),
  }
}

function defaultWindowStart(now: number): number {
  return now <= 0 ? 1 : now
}

/**
 * Create a shared limiter with in-memory request accounting.
 *
 * The limiter tracks an active-concurrency counter and a moving request-rate
 * window. Both dimensions are required because rate-only ceilings can still
 * allow sudden burst concurrency spikes that trigger rendering spikes.
 */
export function createMcpRequestLimiter(limits: McpRequestLimits) {
  let activeRequests = 0
  let requestWindowStart = defaultWindowStart(Date.now())
  let requestsInWindow = 0

  const resetWindowIfExpired = (now: number) => {
    const elapsed = now - requestWindowStart
    // Reset on window expiry, and also when `now` predates the anchor: the
    // anchor is seeded from Date.now() at construction, but callers may drive
    // tryAcquire() with an injected clock (deterministic tests) or a wall clock
    // that stepped backward (NTP adjustment). A negative elapsed means the
    // anchor is stale relative to the caller's timeline — start a fresh window.
    if (elapsed >= limits.requestWindowMs || elapsed < 0) {
      requestWindowStart = now
      requestsInWindow = 0
    }
  }

  const snapshot = (): McpRequestLimitState => ({
    activeRequests,
    requestWindowStart,
    requestsInWindow,
  })

  const tryAcquire = (now: number = Date.now()): McpRequestLimitResult => {
    resetWindowIfExpired(now)

    if (activeRequests >= limits.maxConcurrentRequests) {
      return {
        ok: false,
        code: "MCP_REQUEST_CONCURRENCY",
        message:
          `Request concurrency limit exceeded. Set MCP_MAX_CONCURRENT_REQUESTS to raise the live limit.`,
        retryAfterMs: 1000,
      }
    }

    if (requestsInWindow >= limits.maxRequestsPerWindow) {
      const retryAfterMs = Math.max(
        0,
        requestWindowStart + limits.requestWindowMs - now,
      )
      return {
        ok: false,
        code: "MCP_REQUEST_RATE",
        message:
          `Request rate limit exceeded. Set MCP_MAX_REQUESTS_PER_WINDOW / MCP_REQUEST_WINDOW_MS to raise the rate window/capacity.`,
        retryAfterMs,
      }
    }

    activeRequests++
    requestsInWindow++

    let released = false
    return {
      ok: true,
      release: () => {
        if (released) return
        released = true
        activeRequests = Math.max(0, activeRequests - 1)
      },
    }
  }

  return {
    snapshot,
    tryAcquire,
  }
}
