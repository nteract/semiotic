import type { ChildProcess } from "child_process"
import {
  spawnReadyHTTPServer,
  waitForProcessExit
} from "./mcpHttpServerHarness"

describe("MCP HTTP client boundaries", () => {
  let proc: ChildProcess | undefined
  let port: number

  async function start(env: NodeJS.ProcessEnv = {}) {
    const server = await spawnReadyHTTPServer({
      MCP_MAX_REQUESTS_PER_WINDOW: "2",
      MCP_REQUEST_WINDOW_MS: "60000",
      ...env
    })
    proc = server.proc
    port = server.port
  }

  async function request(headers: Record<string, string> = {}) {
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...headers
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {}
      })
    })
    await response.text()
    return response
  }

  afterEach(async () => {
    proc?.kill("SIGTERM")
    if (proc) await waitForProcessExit(proc)
    proc = undefined
  })

  it("rejects trailing credential text without consuming execution quota", async () => {
    await start({ MCP_AUTH_TOKEN: "test-secret" })
    expect(
      (await request({ Authorization: "Bearer test-secret extra" })).status
    ).toBe(401)
    expect(
      (await request({ Authorization: "Bearer wrong-token" })).status
    ).toBe(401)
    expect(
      (await request({ Authorization: "Bearer test-secret" })).status
    ).toBe(200)
    expect(
      (await request({ Authorization: "bearer test-secret" })).status
    ).toBe(200)
  })

  it("does not let untrusted forwarded addresses reset a socket client's quota", async () => {
    await start()
    expect((await request({ "X-Forwarded-For": "192.0.2.1" })).status).toBe(200)
    expect((await request({ "X-Forwarded-For": "192.0.2.2" })).status).toBe(200)
    const limited = await request({ "X-Forwarded-For": "192.0.2.3" })
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0)
  })

  it("isolates configured proxy clients and ignores forged prefixes", async () => {
    await start({ MCP_TRUSTED_PROXY_HOPS: "1" })
    expect(
      (await request({ "X-Forwarded-For": "forged, 192.0.2.1" })).status
    ).toBe(200)
    expect(
      (await request({ "X-Forwarded-For": "different, 192.0.2.1" })).status
    ).toBe(200)
    expect(
      (await request({ "X-Forwarded-For": "192.0.2.99, ::ffff:192.0.2.1" }))
        .status
    ).toBe(429)
    expect((await request({ "X-Forwarded-For": "192.0.2.2" })).status).toBe(200)
  })
})
