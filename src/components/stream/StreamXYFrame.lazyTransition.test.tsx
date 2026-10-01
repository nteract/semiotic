import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { renderToString } from "react-dom/server"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import { getXYTransitionEngine, loadXYTransitionEngine } from "./pipelineTransitionEngine"
import { xyTransitionEngine } from "./pipelineTransitions"
import { PipelineStore } from "./PipelineStore"
import StreamXYFrame from "./StreamXYFrame"
import type { PointSceneNode } from "./types"

vi.mock("./pipelineTransitionEngine", () => ({
  getXYTransitionEngine: vi.fn(),
  loadXYTransitionEngine: vi.fn()
}))

function captureComputations() {
  const stores: PipelineStore[] = []
  const original = PipelineStore.prototype.computeScene
  const compute = vi.spyOn(PipelineStore.prototype, "computeScene").mockImplementation(function (this: PipelineStore, layout) {
    stores.push(this)
    original.call(this, layout)
  })
  return { compute, stores }
}

describe("StreamXYFrame lazy transitions", () => {
  let restoreCanvas: () => void
  let resolveEngine: () => void
  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
    vi.mocked(getXYTransitionEngine).mockReturnValue(null)
    vi.mocked(loadXYTransitionEngine).mockImplementation(() => new Promise((resolve) => {
      resolveEngine = () => {
        vi.mocked(getXYTransitionEngine).mockReturnValue(xyTransitionEngine)
        resolve(xyTransitionEngine)
      }
    }))
  })
  afterEach(() => {
    cleanup()
    restoreCanvas()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it.each([false, true])("preserves the painted scene while an update waits for transitions (hydrated=%s)", async (hydrated) => {
    const scheduler = createFrameScheduler()
    let now = 0
    const { compute, stores } = captureComputations()
    const props = {
      chartType: "scatter" as const, xAccessor: "x", yAccessor: "y",
      size: [400, 300] as [number, number],
      xExtent: [0, 10] as [number, number], yExtent: [0, 10] as [number, number],
      frameScheduler: scheduler.scheduler, clock: () => now
    }
    const initial = <StreamXYFrame {...props} data={[{ x: 5, y: 2 }]} transition={hydrated ? { duration: 100 } : undefined} />
    const container = document.createElement("div")
    document.body.appendChild(container)
    if (hydrated) container.innerHTML = renderToString(initial)
    const { rerender } = render(initial, { container, hydrate: hydrated })
    act(() => scheduler.flush(now))
    const store = stores.at(-1)!
    expect(store.scene).toHaveLength(1)
    const previous = store.scene[0] as PointSceneNode
    const startY = previous.y
    compute.mockClear()

    rerender(<StreamXYFrame {...props} data={[{ x: 5, y: 8 }]} transition={{ duration: 100 }} />)
    now = 10
    act(() => scheduler.flush(now))
    expect(compute).not.toHaveBeenCalled()
    expect(store.scene[0]).toBe(previous)
    expect((store.scene[0] as PointSceneNode).y).toBe(startY)

    // Further updates while loading should coalesce to the latest target.
    rerender(<StreamXYFrame {...props} data={[{ x: 5, y: 9 }]} transition={{ duration: 100 }} />)
    act(() => scheduler.flush(now))
    expect(compute).not.toHaveBeenCalled()
    await act(async () => resolveEngine())
    act(() => scheduler.flush(now))
    expect(store.activeTransition).not.toBeNull()
    const moving = store.scene[0] as PointSceneNode
    expect(moving.y).toBe(startY)
    const targetY = moving._targetY!
    expect(targetY).toBeLessThan(startY)
    now = 60
    act(() => scheduler.flush(now))
    expect(moving.y).toBeLessThan(startY)
    expect(moving.y).toBeGreaterThan(targetY)
    now = 120
    act(() => scheduler.flush(now))
    expect(moving.y).toBe(targetY)
  })

  it("holds an animated intro until the engine arrives", async () => {
    const scheduler = createFrameScheduler()
    const { compute, stores } = captureComputations()
    render(<StreamXYFrame chartType="scatter" data={[{ x: 1, y: 2 }]} animate={{ duration: 100 }} frameScheduler={scheduler.scheduler} />)
    act(() => scheduler.flush(0))
    expect(compute).not.toHaveBeenCalled()
    await act(async () => resolveEngine())
    act(() => scheduler.flush(0))
    const store = stores[0]
    expect(store.scene).toHaveLength(1)
    expect(store.activeTransition).not.toBeNull()
  })

  it("paints without animation after repeated chunk failure", async () => {
    vi.useFakeTimers()
    vi.mocked(loadXYTransitionEngine).mockRejectedValue(new Error("offline"))
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const scheduler = createFrameScheduler()
    const { compute, stores } = captureComputations()
    render(<StreamXYFrame chartType="scatter" data={[{ x: 1, y: 2 }]} transition={{ duration: 100 }} frameScheduler={scheduler.scheduler} />)
    act(() => scheduler.flush(0))
    expect(compute).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    act(() => scheduler.flush(300))
    expect(stores[0].scene).toHaveLength(1)
    expect(error).toHaveBeenCalledWith(expect.stringContaining("XY transition engine"), expect.any(Error))
  })
})
