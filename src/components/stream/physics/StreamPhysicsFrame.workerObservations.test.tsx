import * as React from "react"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { createFrameScheduler } from "../test-utils/frameScheduler"
import { RuntimeWorker } from "../test-utils/physicsRuntimeWorker"
import StreamPhysicsFrame from "./StreamPhysicsFrame"
import type { PhysicsObservationEvent } from "./PhysicsPipelineStore"

let restoreCanvas: () => void
beforeEach(() => {
  restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
})
afterEach(() => {
  cleanup()
  restoreCanvas()
  vi.unstubAllGlobals()
})

it("replays each worker-frame observation once, in order, and ignores empty frames", async () => {
  const observations: PhysicsObservationEvent[] = [
    { type: "physics-spawn", timestamp: 10, chartType: "custom", chartId: "worker-test", bodyId: "a", datum: { value: 1 } },
    { type: "physics-settle", timestamp: 11, chartType: "custom", chartId: "worker-test", bodyId: "a", datum: { value: 1 } }
  ]
  let nextObservations: PhysicsObservationEvent[] = []
  const deliveredFrames: PhysicsObservationEvent[][] = []
  vi.stubGlobal("Worker", class extends RuntimeWorker {
    constructor() {
      super()
      const handle = this.runtime.handle.bind(this.runtime)
      this.runtime.handle = (command) => {
        const payload = handle(command)
        if (payload.type === "frame") {
          const events = command.type === "tick" ? nextObservations : []
          payload.frame.result.observations = events
          if (command.type === "tick") {
            deliveredFrames.push(events)
            nextObservations = []
          }
        }
        return payload
      }
    }
  })
  const scheduler = createFrameScheduler()
  const onObservation = vi.fn()
  const execution = vi.fn()
  let now = 0
  render(
    <StreamPhysicsFrame
      size={[240, 120]}
      config={{
        fixedDt: 0.1,
        kernel: { gravity: { x: 0, y: 0 }, velocityDamping: 1 },
        observation: { onObservation }
      }}
      initialSpawns={[{ id: "a", x: 40, y: 30, shape: { type: "circle", radius: 5 } }]}
      frameScheduler={scheduler.scheduler}
      clock={() => now}
      simulationExecution="worker"
      onSimulationExecutionChange={execution}
    />
  )
  await waitFor(() => expect(execution).toHaveBeenLastCalledWith(expect.objectContaining({ execution: "worker" })))
  onObservation.mockClear()
  const flush = async () => {
    await act(async () => {
      now += 100
      scheduler.flush(now)
    })
  }
  nextObservations = observations
  await flush()
  await waitFor(() => expect(deliveredFrames).toContain(observations))
  expect(onObservation.mock.calls.map(([event]) => event)).toEqual(observations)
  const count = deliveredFrames.length
  await flush()
  await waitFor(() => expect(deliveredFrames.length).toBeGreaterThan(count))
  expect(deliveredFrames.at(-1)).toEqual([])
  expect(onObservation.mock.calls.map(([event]) => event)).toEqual(observations)
})
