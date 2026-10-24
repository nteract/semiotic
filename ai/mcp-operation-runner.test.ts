import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import * as childProcess from "node:child_process"
import { EventEmitter } from "node:events"
import {
  createMcpOperationRunner,
  resolveMcpExecutionLimits
} from "./mcp-operation-runner"

const fixture = path.resolve(__dirname, "__fixtures__/mcp-operation-child.cjs")
const job = (action: string, extra = {}) => ({
  name: "renderChart",
  profile: "developer" as const,
  arguments: { action, ...extra }
})
const limits = {
  maxOperationMs: 1500,
  maxConcurrentOperations: 1,
  maxHeapMb: 64
}

describe("isolated MCP execution", () => {
  const runners: ReturnType<typeof createMcpOperationRunner>[] = []
  const directories: string[] = []
  function runner(overrides = {}, launch?: typeof childProcess.fork) {
    const value = createMcpOperationRunner(
      fixture,
      { ...limits, ...overrides },
      launch
    )
    runners.push(value)
    return value
  }
  afterEach(async () => {
    for (const value of runners) value.close()
    await vi.waitFor(() =>
      expect(runners.every((value) => value.active() === 0)).toBe(true)
    )
    runners.length = 0
    for (const directory of directories)
      rmSync(directory, { recursive: true, force: true })
    directories.length = 0
  })

  it("terminates blocked synchronous work while the parent keeps ticking, then recovers", async () => {
    const value = runner()
    let ticks = 0
    const heartbeat = setInterval(() => ticks++, 10)
    const started = performance.now()
    try {
      await expect(value.run(job("block"))).rejects.toMatchObject({
        code: "MCP_RENDER_TIMEOUT"
      })
      expect(performance.now() - started).toBeLessThan(1000)
      expect(ticks).toBeGreaterThan(2)
      await vi.waitFor(() => expect(value.active()).toBe(0))
      await expect(value.run(job("success"))).resolves.toMatchObject({
        ok: true,
        execArgv: ["--max-old-space-size=64"]
      })
    } finally {
      clearInterval(heartbeat)
    }
  })

  it("shares one deadline across stages and startup", async () => {
    const value = runner({ maxOperationMs: 300 })
    await expect(value.run(job("stages"))).rejects.toMatchObject({
      code: "MCP_RENDER_TIMEOUT"
    })
  })

  it("does not replenish a stage budget when another stage begins", async () => {
    await expect(runner().run(job("repeat"))).rejects.toMatchObject({
      code: "MCP_RENDER_TIMEOUT"
    })
  })

  it("kills running work on abort and refuses excess work without a queue", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "mcp-execution-"))
    directories.push(directory)
    const startedFile = path.join(directory, "started")
    const value = runner()
    const controller = new AbortController()
    const operation = value.run(job("block", { startedFile }), [
      controller.signal
    ])
    const canceled = expect(operation).rejects.toMatchObject({
      code: "MCP_RENDER_CANCELLED"
    })
    await expect(value.run(job("success"))).rejects.toMatchObject({
      code: "MCP_OPERATION_BUSY"
    })
    await vi.waitFor(() => expect(existsSync(startedFile)).toBe(true), {
      interval: 5
    })
    controller.abort()
    await canceled
    await vi.waitFor(() => expect(value.active()).toBe(0))
    await expect(value.run(job("success"))).resolves.toMatchObject({ ok: true })
  })

  it("rejects an already canceled operation without starting a process", async () => {
    const value = runner()
    const controller = new AbortController()
    controller.abort()
    await expect(
      value.run(job("success"), [controller.signal])
    ).rejects.toMatchObject({ code: "MCP_RENDER_CANCELLED" })
    expect(value.active()).toBe(0)
  })

  it("settles a child crash and releases capacity", async () => {
    const value = runner()
    await expect(value.run(job("crash"))).rejects.toMatchObject({
      code: "MCP_OPERATION_FAILED"
    })
    await expect(value.run(job("success"))).resolves.toMatchObject({ ok: true })
  })

  it("releases a failed spawn that emits close without exit", async () => {
    const failed = Object.assign(new EventEmitter(), {
      kill: vi.fn(() => false),
      send: vi.fn()
    })
    const launch = vi.fn(childProcess.fork).mockImplementationOnce(() => {
      queueMicrotask(() => {
        failed.emit("error", new Error("spawn failed"))
        failed.emit("close", -1)
      })
      return failed as unknown as childProcess.ChildProcess
    })
    try {
      const value = runner({}, launch)
      await expect(value.run(job("success"))).rejects.toMatchObject({
        code: "MCP_OPERATION_FAILED"
      })
      expect(value.active()).toBe(0)
      await expect(value.run(job("success"))).resolves.toMatchObject({
        ok: true
      })
    } finally {
      launch.mockRestore()
    }
  })

  it("uses bounded defaults for invalid configuration", () => {
    expect(
      resolveMcpExecutionLimits({
        MCP_MAX_OPERATION_MS: "0",
        MCP_MAX_CONCURRENT_OPERATIONS: "bad",
        MCP_OPERATION_HEAP_MB: "-1"
      })
    ).toEqual({
      maxOperationMs: 10000,
      maxConcurrentOperations: 2,
      maxHeapMb: 256
    })
  })
})
