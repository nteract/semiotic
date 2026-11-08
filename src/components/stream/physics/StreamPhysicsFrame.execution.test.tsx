import * as React from "react"
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { createFrameScheduler } from "../test-utils/frameScheduler"
import { RuntimeWorker } from "../test-utils/physicsRuntimeWorker"
import { PhysicsWorkerSession } from "./PhysicsWorkerClient"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle
} from "./StreamPhysicsFrame"

const config = {
  fixedDt: 0.1,
  maxSubsteps: 10,
  maxDeltaSeconds: 1,
  settleStepLimit: 10,
  kernel: {
    gravity: { x: 0, y: 0 },
    velocityDamping: 1,
    sleepAfter: 10,
    sleepSpeed: 0
  }
}
const initialSpawns = [
  {
    id: "body",
    x: 40,
    y: 40,
    mass: 1,
    shape: { type: "circle" as const, radius: 5 }
  }
]
const bodyForces = { x: 10, y: 0 }

describe("frame fixed-step execution", () => {
  let restoreCanvas: () => void
  let reduced = false
  beforeEach(() => {
    reduced = false
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
    vi.stubGlobal(
      "matchMedia",
      vi.fn((media: string) => ({
        media,
        get matches() {
          return reduced
        },
        addEventListener() {},
        removeEventListener() {}
      }))
    )
  })
  afterEach(() => {
    cleanup()
    restoreCanvas()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each(["resolve", "reject"] as const)(
    "keeps the current worker frame pending when a replaced worker request %ss",
    async (outcome) => {
      vi.stubGlobal("Worker", RuntimeWorker)
      const old = Promise.withResolvers<void>()
      const current = Promise.withResolvers<void>()
      const originalTick = PhysicsWorkerSession.prototype.tick
      const initialize = vi.spyOn(PhysicsWorkerSession.prototype, "initFromSnapshot")
      const tick = vi.spyOn(PhysicsWorkerSession.prototype, "tick")
        .mockImplementationOnce(async function (this: PhysicsWorkerSession, delta) {
          const frame = await originalTick.call(this, delta)
          await old.promise
          return frame
        })
        .mockImplementationOnce(async function (this: PhysicsWorkerSession, delta) {
          const frame = await originalTick.call(this, delta)
          await current.promise
          return frame
        })
      const ref = React.createRef<StreamPhysicsFrameHandle>()
      const execution = vi.fn()
      const scheduler = createFrameScheduler()
      const chart = (timeScale: number) => (
        <StreamPhysicsFrame ref={ref} size={[200, 120]}
          config={{ ...config, timeScale }} initialSpawns={initialSpawns}
          simulationExecution="worker" onSimulationExecutionChange={execution}
          frameScheduler={scheduler.scheduler} />
      )
      const view = render(chart(1))
      await waitFor(() => expect(execution).toHaveBeenLastCalledWith(
        expect.objectContaining({ execution: "worker" })
      ))
      await act(async () => scheduler.flush(0))
      expect(tick).toHaveBeenCalledTimes(1)
      view.rerender(chart(2))
      await waitFor(() => expect(initialize).toHaveBeenCalledTimes(2))
      await act(async () => { await initialize.mock.results[1].value })
      await act(async () => scheduler.flush(10))
      expect(tick).toHaveBeenCalledTimes(2)
      await act(async () => {
        if (outcome === "resolve") old.resolve()
        else old.reject(new Error("Retired worker failed"))
      })
      // Resume requests another render while the current frame is in flight.
      // A retired completion must neither free that slot nor consume its work.
      await act(async () => ref.current!.resume())
      await act(async () => scheduler.flush(20))
      expect(tick).toHaveBeenCalledTimes(2)
      await act(async () => current.resolve())
      await act(async () => scheduler.flush(30))
      expect(tick).toHaveBeenCalledTimes(3)
      expect(ref.current!.getStore().runtimeState().paused).toBe(false)
      expect(execution).toHaveBeenLastCalledWith(
        expect.objectContaining({ execution: "worker" })
      )
    }
  )

  it.each(["reduced", "paused", "step", "settle"])(
    "refreshes keyboard positions and descriptions after a %s bounded run",
    (mode) => {
      reduced = mode === "reduced"
      const ref = React.createRef<StreamPhysicsFrameHandle>()
      const onSemanticItemFocus = vi.fn()
      const { container, getByRole } = render(
        <StreamPhysicsFrame
          ref={ref}
          size={[240, 120]}
          config={config}
          initialSpawns={[{ ...initialSpawns[0], vx: 80 }]}
          frameScheduler={createFrameScheduler().scheduler}
          bodySemanticUpdateMs={60_000}
          bodySemanticItems={(body) => ({
            label: body.id,
            description: body.x > 100 ? "Reached the next stage" : "Waiting"
          })}
          onSemanticItemFocus={onSemanticItemFocus}
        />
      )
      if (mode !== "reduced")
        act(() => {
          if (mode === "settle") ref.current!.settle(10)
          else ref.current!.step(1)
          if (mode === "paused") ref.current!.pause()
        })
      const body = ref.current!.readBodies()[0]
      expect(body.x).toBeGreaterThan(100)
      fireEvent.keyDown(getByRole("group"), { key: "Home" })
      expect(onSemanticItemFocus).toHaveBeenCalledWith(
        expect.objectContaining({
          bodyId: "body",
          x: body.x,
          y: body.y,
          description: "Reached the next stage"
        })
      )
      expect(
        container.querySelector('circle[stroke-dasharray="4,2"]')
      ).toHaveAttribute("cx", String(body.x))
    }
  )

  it("matches bounded reduced motion with imperative batches and ignores decorative rerenders", () => {
    function mount() {
      const ref = React.createRef<StreamPhysicsFrameHandle>()
      const scheduler = createFrameScheduler()
      const props = {
        config,
        initialSpawns,
        bodyForces,
        frameScheduler: scheduler.scheduler,
        size: [200, 120] as [number, number]
      }
      const view = render(<StreamPhysicsFrame {...props} ref={ref} />)
      return { ref, scheduler, props, ...view }
    }
    const animated = mount()
    act(() => {
      animated.ref.current!.step(1)
    })
    const expected = animated.ref.current!.readBodies()
    expect(expected[0].x).toBeCloseTo(44.5, 8)
    expect(expected[0].vx).toBeCloseTo(10, 8)
    animated.unmount()

    reduced = true
    const snapshot = mount()
    expect(snapshot.ref.current!.readBodies()).toEqual(expected)
    expect(snapshot.ref.current!.snapshot().elapsedSeconds).toBeCloseTo(1, 8)
    snapshot.rerender(
      <StreamPhysicsFrame
        {...snapshot.props}
        ref={snapshot.ref}
        bodyStyle={{ fill: "red" }}
        title="Updated title"
      />
    )
    expect(snapshot.ref.current!.readBodies()).toEqual(expected)
    expect(snapshot.ref.current!.snapshot().elapsedSeconds).toBeCloseTo(1, 8)
    expect(snapshot.scheduler.pendingCount).toBe(0)
    snapshot.rerender(
      <StreamPhysicsFrame
        {...snapshot.props}
        ref={snapshot.ref}
        bodyForces={{ x: 20, y: 0 }}
      />
    )
    expect(snapshot.ref.current!.readBodies()[0].vx).toBeCloseTo(30, 8)
    expect(snapshot.ref.current!.readBodies()[0].x).toBeCloseTo(63.5, 8)
  })

  it("observes and removes a body mid-settle without recursively rendering", () => {
    reduced = true
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const times: number[] = []
    const removed: string[] = []
    function Example() {
      const [count, setCount] = React.useState(0)
      return (
        <StreamPhysicsFrame
          ref={ref}
          size={[200, 120]}
          config={config}
          initialSpawns={initialSpawns}
          continuous
          summary={`Removed ${count}`}
          onTick={(result) => {
            if (!result.steps) return
            times.push(result.elapsedSeconds)
            if (!removed.length && result.elapsedSeconds >= 0.3) {
              removed.push(...ref.current!.popBodies(["body"]))
              setCount(removed.length)
            }
          }}
        />
      )
    }
    const view = render(<Example />)
    expect(removed).toEqual(["body"])
    expect(times).toHaveLength(10)
    expect(times[2]).toBeCloseTo(0.3, 8)
    expect(ref.current!.readBodies()).toEqual([])
    expect(view.getByText("Removed 1").textContent).toBe("Removed 1")
  })
  it("falls back to sync when CSP blocks worker construction", async () => {
    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          throw new DOMException("blocked by CSP", "SecurityError")
        }
      }
    )
    const execution = vi.fn()
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const scheduler = createFrameScheduler()
    const view = render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        config={config}
        initialSpawns={initialSpawns}
        simulationExecution="worker"
        onSimulationExecutionChange={execution}
        frameScheduler={scheduler.scheduler}
      />
    )
    await act(async () => {
      scheduler.flush(0)
      await vi.dynamicImportSettled()
    })
    expect(view.container.querySelector("canvas")).not.toBeNull()
    expect(
      execution.mock.calls.some(
        ([state]) =>
          state.execution === "sync" && state.reason?.includes("blocked by CSP")
      )
    ).toBe(true)
    expect(ref.current!.readBodies()[0].id).toBe("body")
  })
  it("does not construct a worker after the frame unmounts during transport loading", async () => {
    const construct = vi.fn()
    vi.stubGlobal("Worker", construct)
    const scheduler = createFrameScheduler()
    const view = render(<StreamPhysicsFrame config={config} initialSpawns={initialSpawns}
      simulationExecution="worker" frameScheduler={scheduler.scheduler} />)
    act(() => scheduler.flush(0))
    view.unmount()
    await act(async () => { await vi.dynamicImportSettled() })
    expect(construct).not.toHaveBeenCalled()
  })

})
