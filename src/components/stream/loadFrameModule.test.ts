import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { loadFrameModule } from "./loadFrameModule"

describe("loadFrameModule", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("retries a rejected chunk load and resumes once", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined)
    const ready = vi.fn()
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    loadFrameModule(load, ready, "test layout")
    await vi.advanceTimersByTimeAsync(250)
    expect(load).toHaveBeenCalledTimes(2)
    expect(ready).toHaveBeenCalledTimes(1)
    expect(error).not.toHaveBeenCalled()
  })

  it("reports persistent failure and invokes fallback without an unhandled rejection", async () => {
    const failure = new Error("chunk not found")
    const load = vi.fn().mockRejectedValue(failure)
    const ready = vi.fn()
    const fallback = vi.fn()
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    loadFrameModule(load, ready, "test layout", fallback)
    await vi.runAllTimersAsync()
    expect(load).toHaveBeenCalledTimes(2)
    expect(ready).not.toHaveBeenCalled()
    expect(fallback).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith(expect.stringContaining("remount the chart"), failure)
  })

  it("cancels scheduled retries on unmount", async () => {
    const load = vi.fn().mockRejectedValue(new Error("offline"))
    const cancel = loadFrameModule(load, vi.fn(), "test layout")
    await vi.advanceTimersByTimeAsync(0)
    cancel()
    await vi.runAllTimersAsync()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it.each([true, false])("ignores an in-flight result after cancellation (success=%s)", async (success) => {
    let settle!: () => void
    const load = () => new Promise<void>((resolve, reject) => {
      settle = () => success ? resolve() : reject(new Error("offline"))
    })
    const ready = vi.fn()
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const cancel = loadFrameModule(load, ready, "test layout")
    cancel()
    settle()
    await vi.runAllTimersAsync()
    expect(ready).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})
