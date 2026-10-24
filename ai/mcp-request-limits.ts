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
export const DEFAULT_MCP_MAX_RATE_LIMIT_CLIENTS = 4096

export type McpRequestLimitCode = "MCP_REQUEST_CONCURRENCY" | "MCP_REQUEST_RATE"

export type McpRequestLimits = {
  maxConcurrentRequests: number
  maxRequestsPerWindow: number
  requestWindowMs: number
  maxRateLimitClients?: number
}

export type McpRequestLimitState = {
  activeRequests: number
  trackedClients: number
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
  env: LimitEnvironment = process.env
): McpRequestLimits {
  return {
    maxConcurrentRequests: positiveInteger(
      env.MCP_MAX_CONCURRENT_REQUESTS,
      DEFAULT_MCP_MAX_CONCURRENT_REQUESTS
    ),
    maxRequestsPerWindow: positiveInteger(
      env.MCP_MAX_REQUESTS_PER_WINDOW,
      DEFAULT_MCP_MAX_REQUESTS_PER_WINDOW
    ),
    requestWindowMs: positiveInteger(
      env.MCP_REQUEST_WINDOW_MS,
      DEFAULT_MCP_REQUEST_WINDOW_MS
    ),
    maxRateLimitClients: positiveInteger(
      env.MCP_MAX_RATE_LIMIT_CLIENTS,
      DEFAULT_MCP_MAX_RATE_LIMIT_CLIENTS
    )
  }
}

type ClientBucket = { tokens: number; updatedAt: number; active: number }

/** A bounded per-client token bucket plus a shared execution concurrency cap. */
export function createMcpRequestLimiter(limits: McpRequestLimits) {
  let activeRequests = 0
  const clients = new Map<string, ClientBucket>()
  const maxClients =
    limits.maxRateLimitClients ?? DEFAULT_MCP_MAX_RATE_LIMIT_CLIENTS
  const refillPerMs = limits.maxRequestsPerWindow / limits.requestWindowMs
  const rateRejection = (retryAfterMs: number): McpRequestLimitResult => ({
    ok: false,
    code: "MCP_REQUEST_RATE",
    message:
      "Client request rate limit exceeded. Set MCP_MAX_REQUESTS_PER_WINDOW / MCP_REQUEST_WINDOW_MS to change the rate budget.",
    retryAfterMs
  })

  const tryAcquire = (
    now = Date.now(),
    clientKey = "default"
  ): McpRequestLimitResult => {
    if (activeRequests >= limits.maxConcurrentRequests) {
      return {
        ok: false,
        code: "MCP_REQUEST_CONCURRENCY",
        message:
          "Request concurrency limit exceeded. Set MCP_MAX_CONCURRENT_REQUESTS to raise the live limit.",
        retryAfterMs: 1000
      }
    }

    let bucket = clients.get(clientKey)
    if (!bucket) {
      if (clients.size >= maxClients) {
        // Only retire budgets that would have fully refilled. Evicting a recent
        // key would let a stream of new keys reset an exhausted client's quota.
        for (const [key, candidate] of clients) {
          if (
            candidate.active === 0 &&
            now - candidate.updatedAt >= limits.requestWindowMs
          ) {
            clients.delete(key)
          }
        }
      }
      if (clients.size >= maxClients)
        return rateRejection(limits.requestWindowMs)
      bucket = {
        tokens: limits.maxRequestsPerWindow,
        updatedAt: now,
        active: 0
      }
      clients.set(clientKey, bucket)
    }

    const elapsed = Math.max(0, now - bucket.updatedAt)
    bucket.tokens = Math.min(
      limits.maxRequestsPerWindow,
      bucket.tokens + elapsed * refillPerMs
    )
    bucket.updatedAt = Math.max(bucket.updatedAt, now)
    if (bucket.tokens < 1 - 1e-9) {
      return rateRejection(Math.ceil((1 - bucket.tokens) / refillPerMs))
    }
    bucket.tokens = Math.max(0, bucket.tokens - 1)
    bucket.active++
    activeRequests++
    const acquired = bucket
    let released = false
    return {
      ok: true,
      release: () => {
        if (released) return
        released = true
        activeRequests--
        acquired.active--
      }
    }
  }

  return {
    snapshot: (): McpRequestLimitState => ({
      activeRequests,
      trackedClients: clients.size
    }),
    tryAcquire
  }
}
