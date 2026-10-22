import * as React from "react"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { createFrameScheduler } from "../test-utils/frameScheduler"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import type {
  PhysicsWorkerRequest,
  PhysicsWorkerResponse
} from "./PhysicsWorkerProtocol"
import StreamPhysicsFrame, { type StreamPhysicsFrameHandle } from "./StreamPhysicsFrame"

/** The real worker protocol, with acknowledgements that a test can hold back. */
class GatedWorker {
  static instances: GatedWorker[] = []
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessage: ((event: MessageEvent<PhysicsWorkerResponse>) => void) | null = null
  runtime = createPhysicsWorkerRuntime()
  terminated = false
  hold = new Set<string>()
  held: Array<() => void> = []
  constructor() {
    GatedWorker.instances.push(this)
  }
  postMessage(request: PhysicsWorkerRequest): void {
    Promise.resolve().then(() => {
      if (this.terminated) return
      const data = {
        ok: true as const,
        payload: this.runtime.handle(request.command),
        requestId: request.requestId
      }
      const deliver = () => {
        if (!this.terminated)
          this.onmessage?.({ data } as MessageEvent<PhysicsWorkerResponse>)
      }
      if (this.hold.has(request.command.type)) this.held.push(deliver)
      else deliver()
    })
  }
  terminate(): void {
    this.terminated = true
  }
}

const body = (id: string, x: number, spawnAt?: number) => ({
  id,
  x,
  y: 20,
  shape: { type: "circle" as const, radius: 3 },
  ...(spawnAt != null && { spawnAt })
})
const config = {
  fixedDt: 0.01,
  kernel: { gravity: { x: 0, y: 40 }, sleepSpeed: 0.001, sleepAfter: 5 }
}

describe("worker frames that predate host edits", () => {
  let restoreCanvas: () => void
  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
    GatedWorker.instances = []
    vi.stubGlobal("Worker", GatedWorker)
  })
  afterEach(() => {
    cleanup()
    restoreCanvas()
    vi.unstubAllGlobals()
  })

  async function mount(initialSpawns: ReturnType<typeof body>[], timeScale = 1) {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const execution = vi.fn()
    const scheduler = createFrameScheduler()
    let now = 0
    const frame = (scale: number) => (
      <StreamPhysicsFrame
        ref={ref}
        size={[240, 160]}
        config={{ ...config, timeScale: scale }}
        initialSpawns={initialSpawns}
        frameScheduler={scheduler.scheduler}
        clock={() => now}
        simulationExecution="worker"
        onSimulationExecutionChange={execution}
      />
    )
    const view = render(frame(timeScale))
    await waitFor(() =>
      expect(execution).toHaveBeenLastCalledWith(
        expect.objectContaining({ execution: "worker" })
      )
    )
    // Post one tick; the gated worker answers it after the current task.
    const postTick = () => {
      now += 100
      scheduler.flush(now)
    }
    return { ref, execution, view, frame, postTick }
  }

  it("keeps a host removal when an older motion frame still lists the body", async () => {
    const { ref, execution, postTick } = await mount([body("a", 40), body("b", 80)])
    await act(async () => {
      postTick()
      ref.current!.remove(["a"])
    })
    await act(async () => {})
    expect(execution).not.toHaveBeenLastCalledWith(
      expect.objectContaining({ execution: "sync" })
    )
    expect(ref.current!.getData().map((b) => b.id)).toEqual(["b"])
  })

  it("keeps a push through an older structural frame and a worker restart", async () => {
    const { ref, view, frame, postTick } = await mount([
      body("seed", 40),
      // Arrives during the in-flight tick, so its frame replaces the mirror queue.
      body("due", 80, 0.05)
    ])
    // The first tick after startup only records the frame clock.
    await act(async () => postTick())
    await act(async () => {})
    GatedWorker.instances[0].hold.add("enqueue")
    await act(async () => {
      postTick()
      ref.current!.push(body("pushed", 120, 10))
    })
    await act(async () => {})
    const queued = () =>
      ref.current!.getStore().snapshot().queue.map((spawn) => spawn.id)
    expect(ref.current!.getData().map((b) => b.id)).toContain("due")
    expect(queued()).toContain("pushed")
    // A config change replaces the worker before the held acknowledgement.
    view.rerender(frame(2))
    await waitFor(() => expect(GatedWorker.instances).toHaveLength(2))
    await waitFor(() =>
      expect(
        GatedWorker.instances[1].runtime.handle({ type: "snapshot" })
      ).toMatchObject({
        snapshot: { queue: [expect.objectContaining({ id: "pushed" })] }
      })
    )
    expect(queued()).toContain("pushed")
  })
})
