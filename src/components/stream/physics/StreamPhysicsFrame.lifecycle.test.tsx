import * as React from "react"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { createFrameScheduler } from "../test-utils/frameScheduler"
import { RuntimeWorker } from "../test-utils/physicsRuntimeWorker"
import StreamPhysicsFrame, { type StreamPhysicsFrameHandle } from "./StreamPhysicsFrame"

const config = { fixedDt: 0.01, settleStepLimit: 100, kernel: {
  gravity: { x: 0, y: 0 }, sleepSpeed: 100, sleepAfter: 0.01
} }
const initialSpawns = [{ id: "body", x: 20, y: 20, shape: { type: "circle" as const, radius: 2 } }]

describe("physics frame idle policy", () => {
  let restoreCanvas: () => void
  beforeEach(() => { restoreCanvas = setupCanvasMock({ stubRaf: "noop" }) })
  afterEach(() => { cleanup(); restoreCanvas(); vi.unstubAllGlobals() })

  it.each([false, true, undefined])("honors controller continuous=%s once bodies settle", (continuous) => {
    let now = 0
    const scheduler = createFrameScheduler()
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const tick = vi.fn()
    render(<StreamPhysicsFrame ref={ref} config={config} initialSpawns={initialSpawns}
      frameScheduler={scheduler.scheduler} clock={() => now}
      controllers={[{ id: "observer", continuous, tick }]} />)
    for (let i = 0; i < 20; i++) act(() => { now += 20; scheduler.flush(now) })
    expect(ref.current!.getStore().atRest()).toBe(true)
    expect(tick).toHaveBeenCalled()
    expect(scheduler.pendingCount).toBe(continuous === false ? 0 : 1)
  })

  it("retains an active worker across equivalent inline config rerenders", async () => {
    const workers: RuntimeWorker[] = []
    vi.stubGlobal("Worker", class extends RuntimeWorker {
      constructor() { super(); workers.push(this) }
    })
    const execution = vi.fn()
    const scheduler = createFrameScheduler()
    const props = () => ({
      config: { ...config, kernel: { ...config.kernel, gravity: { x: 0, y: 0 } }, colliders: [
        { id: "sensor", sensor: true, shape: { type: "aabb" as const, x: 20, y: 20, width: 20, height: 20 } }
      ] },
      initialSpawns, frameScheduler: scheduler.scheduler,
      onSimulationExecutionChange: execution, simulationExecution: "worker" as const
    })
    const view = render(<StreamPhysicsFrame {...props()} />)
    await waitFor(() => expect(execution).toHaveBeenLastCalledWith(expect.objectContaining({ execution: "worker" })))
    expect(workers).toHaveLength(1)
    view.rerender(<StreamPhysicsFrame {...props()} />)
    await act(async () => { await vi.dynamicImportSettled() })
    expect(workers).toHaveLength(1)
    expect(workers[0].terminated).toBe(false)
    // A real physics change still rebuilds the worker with the new state.
    view.rerender(<StreamPhysicsFrame {...props()} config={{ ...props().config, timeScale: 2 }} />)
    await waitFor(() => expect(workers).toHaveLength(2))
    expect(workers[0].terminated).toBe(true)
  })

  it("does not spend the reduced-motion step budget on a non-continuous observer", () => {
    vi.stubGlobal("matchMedia", vi.fn((media: string) => ({
      media, matches: media === "(prefers-reduced-motion: reduce)",
      addEventListener() {}, removeEventListener() {}
    })))
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const tick = vi.fn()
    render(<StreamPhysicsFrame ref={ref} config={config} initialSpawns={initialSpawns}
      controllers={[{ id: "observer", continuous: false, tick }]} />)
    expect(ref.current!.getStore().atRest()).toBe(true)
    expect(tick.mock.calls.length).toBeLessThan(10)
    expect(ref.current!.getStore().elapsed()).toBeLessThan(0.1)
  })
})
