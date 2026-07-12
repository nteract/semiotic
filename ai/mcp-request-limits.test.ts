import {
  DEFAULT_MCP_MAX_CONCURRENT_REQUESTS,
  DEFAULT_MCP_MAX_REQUESTS_PER_WINDOW,
  DEFAULT_MCP_REQUEST_WINDOW_MS,
  createMcpRequestLimiter,
  resolveMcpRequestLimits,
} from "./mcp-request-limits"

describe("MCP request limits", () => {
  it("uses positive environment overrides and keeps safe defaults for invalid values", () => {
    expect(resolveMcpRequestLimits({
      MCP_MAX_CONCURRENT_REQUESTS: "12",
      MCP_MAX_REQUESTS_PER_WINDOW: "40",
      MCP_REQUEST_WINDOW_MS: "30000",
    })).toEqual({
      maxConcurrentRequests: 12,
      maxRequestsPerWindow: 40,
      requestWindowMs: 30000,
    })

    expect(resolveMcpRequestLimits({
      MCP_MAX_CONCURRENT_REQUESTS: "0",
      MCP_MAX_REQUESTS_PER_WINDOW: "invalid",
      MCP_REQUEST_WINDOW_MS: "-100",
    })).toEqual({
      maxConcurrentRequests: DEFAULT_MCP_MAX_CONCURRENT_REQUESTS,
      maxRequestsPerWindow: DEFAULT_MCP_MAX_REQUESTS_PER_WINDOW,
      requestWindowMs: DEFAULT_MCP_REQUEST_WINDOW_MS,
    })
  })

  it("blocks concurrent requests past the configured limit", () => {
    const limiter = createMcpRequestLimiter({
      maxConcurrentRequests: 1,
      maxRequestsPerWindow: 10,
      requestWindowMs: 60000,
    })

    const first = limiter.tryAcquire()
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = limiter.tryAcquire()
    expect(second.ok).toBe(false)
    if (second.ok) return
    expect(second.code).toBe("MCP_REQUEST_CONCURRENCY")
    expect(second.message).toContain("MCP_MAX_CONCURRENT_REQUESTS")

    first.release()
    const third = limiter.tryAcquire()
    expect(third.ok).toBe(true)
    if (!third.ok) return
    third.release()
  })

  it("blocks additional requests after the rate window cap and recovers after expiry", () => {
    const limiter = createMcpRequestLimiter({
      maxConcurrentRequests: 10,
      maxRequestsPerWindow: 2,
      requestWindowMs: 100,
    })

    const first = limiter.tryAcquire(0)
    const second = limiter.tryAcquire(1)
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) return

    const rateLimited = limiter.tryAcquire(2)
    expect(rateLimited.ok).toBe(false)
    if (rateLimited.ok) return
    expect(rateLimited.code).toBe("MCP_REQUEST_RATE")
    expect(rateLimited.retryAfterMs).toBeGreaterThan(0)

    const afterWindow = limiter.tryAcquire(101)
    expect(afterWindow.ok).toBe(true)
    if (!afterWindow.ok) return
    first.release()
    second.release()
    afterWindow.release()
  })
})
