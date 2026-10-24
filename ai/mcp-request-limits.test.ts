import {
  DEFAULT_MCP_MAX_CONCURRENT_REQUESTS,
  DEFAULT_MCP_MAX_REQUESTS_PER_WINDOW,
  DEFAULT_MCP_REQUEST_WINDOW_MS,
  DEFAULT_MCP_MAX_RATE_LIMIT_CLIENTS,
  createMcpRequestLimiter,
  resolveMcpRequestLimits
} from "./mcp-request-limits"

describe("MCP request limits", () => {
  it("isolates client rate budgets while retaining a shared concurrency cap", () => {
    const limiter = createMcpRequestLimiter({
      maxConcurrentRequests: 2,
      maxRequestsPerWindow: 1,
      requestWindowMs: 100
    })
    const first = limiter.tryAcquire(0, "client-a")
    expect(first.ok).toBe(true)
    const repeated = limiter.tryAcquire(1, "client-a")
    expect(repeated).toMatchObject({ ok: false, code: "MCP_REQUEST_RATE" })
    const independent = limiter.tryAcquire(1, "client-b")
    expect(independent.ok).toBe(true)
    expect(limiter.tryAcquire(2, "client-c")).toMatchObject({
      ok: false,
      code: "MCP_REQUEST_CONCURRENCY"
    })
    if (!first.ok || !independent.ok) throw new Error("Expected client slots")
    first.release()
    first.release()
    independent.release()
    expect(limiter.snapshot().activeRequests).toBe(0)
  })

  it("refills continuously instead of granting a new burst at a fixed window boundary", () => {
    const limiter = createMcpRequestLimiter({
      maxConcurrentRequests: 10,
      maxRequestsPerWindow: 2,
      requestWindowMs: 100
    })
    const initial = limiter.tryAcquire(0)
    const late = limiter.tryAcquire(99)
    const lateAgain = limiter.tryAcquire(99)
    expect([initial.ok, late.ok, lateAgain.ok]).toEqual([true, true, true])
    expect(limiter.tryAcquire(100)).toMatchObject({
      ok: false,
      code: "MCP_REQUEST_RATE",
      retryAfterMs: 49
    })
    expect(limiter.tryAcquire(149).ok).toBe(true)
  })

  it("bounds client accounting without evicting an exhausted client's budget", () => {
    const limiter = createMcpRequestLimiter({
      maxConcurrentRequests: 10,
      maxRequestsPerWindow: 1,
      requestWindowMs: 100,
      maxRateLimitClients: 2
    })
    for (const key of ["a", "b"]) {
      const slot = limiter.tryAcquire(0, key)
      expect(slot.ok).toBe(true)
      if (slot.ok) slot.release()
    }
    expect(limiter.tryAcquire(1, "c").ok).toBe(false)
    expect(limiter.tryAcquire(1, "a").ok).toBe(false)
    expect(limiter.snapshot().trackedClients).toBe(2)
    expect(limiter.tryAcquire(101, "c").ok).toBe(true)
    expect(limiter.snapshot().trackedClients).toBeLessThanOrEqual(2)
  })

  it("does not replenish a budget when the clock moves backward", () => {
    const limiter = createMcpRequestLimiter({
      maxConcurrentRequests: 10,
      maxRequestsPerWindow: 1,
      requestWindowMs: 100
    })
    expect(limiter.tryAcquire(100).ok).toBe(true)
    expect(limiter.tryAcquire(90).ok).toBe(false)
    expect(limiter.tryAcquire(199).ok).toBe(false)
    expect(limiter.tryAcquire(200).ok).toBe(true)
  })

  it("uses positive environment overrides and keeps safe defaults for invalid values", () => {
    expect(
      resolveMcpRequestLimits({
        MCP_MAX_CONCURRENT_REQUESTS: "12",
        MCP_MAX_REQUESTS_PER_WINDOW: "40",
        MCP_REQUEST_WINDOW_MS: "30000"
      })
    ).toEqual({
      maxConcurrentRequests: 12,
      maxRequestsPerWindow: 40,
      requestWindowMs: 30000,
      maxRateLimitClients: DEFAULT_MCP_MAX_RATE_LIMIT_CLIENTS
    })

    expect(
      resolveMcpRequestLimits({
        MCP_MAX_CONCURRENT_REQUESTS: "0",
        MCP_MAX_REQUESTS_PER_WINDOW: "invalid",
        MCP_REQUEST_WINDOW_MS: "-100"
      })
    ).toEqual({
      maxConcurrentRequests: DEFAULT_MCP_MAX_CONCURRENT_REQUESTS,
      maxRequestsPerWindow: DEFAULT_MCP_MAX_REQUESTS_PER_WINDOW,
      requestWindowMs: DEFAULT_MCP_REQUEST_WINDOW_MS,
      maxRateLimitClients: DEFAULT_MCP_MAX_RATE_LIMIT_CLIENTS
    })
  })

  it("blocks concurrent requests past the configured limit", () => {
    const limiter = createMcpRequestLimiter({
      maxConcurrentRequests: 1,
      maxRequestsPerWindow: 10,
      requestWindowMs: 60000
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
      requestWindowMs: 100
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
