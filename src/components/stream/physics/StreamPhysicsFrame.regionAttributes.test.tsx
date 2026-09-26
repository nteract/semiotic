import * as React from "react"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { createFrameScheduler } from "../test-utils/frameScheduler"
import { RuntimeWorker } from "../test-utils/physicsRuntimeWorker"
import { chargeGateRegion } from "../../recipes/processPhysics"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle
} from "./StreamPhysicsFrame"
import type { PhysicsQueuedSpawn } from "./PhysicsPipelineStore"

const quietKernel = {
  gravity: { x: 0, y: 0 },
  velocityDamping: 1,
  sleepSpeed: 100,
  sleepAfter: 0.01
}
function circle(id: string, x: number, y: number): PhysicsQueuedSpawn {
  return { id, x, y, mass: 1, shape: { type: "circle", radius: 5 } }
}
let restoreCanvas: () => void
beforeEach(() => {
  restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  vi.stubGlobal("Worker", RuntimeWorker)
})
afterEach(() => {
  cleanup()
  restoreCanvas()
  vi.unstubAllGlobals()
})

it.each(["step", "settle", "settleWithObservations"] as const)(
  "delivers worker region observations once for pushed bodies and mirrored %s calls",
  async (method) => {
    const scheduler = createFrameScheduler()
    let now = 0
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const execution = vi.fn()
    const onEnter = vi.fn()
    const onExit = vi.fn()
    const onObservation = vi.fn()
    render(
      <StreamPhysicsFrame
        ref={ref}
        size={[240, 120]}
        frameScheduler={scheduler.scheduler}
        clock={() => now}
        config={{
          fixedDt: 0.1,
          kernel: quietKernel,
          observation: { onObservation }
        }}
        initialSpawns={[circle("seed", 40, 30)]}
        simulationExecution="worker"
        onSimulationExecutionChange={execution}
        regionEffects={[
          chargeGateRegion({
            id: "gate",
            x: 70,
            y: 30,
            width: 120,
            height: 40,
            attributes: ({ body }) => ({
              bodyId: body.id,
              primitive: "spoofed"
            }),
            onEnter,
            onExit
          })
        ]}
      />
    )
    await waitFor(() =>
      expect(execution).toHaveBeenLastCalledWith(
        expect.objectContaining({ execution: "worker" })
      )
    )
    await act(async () => {
      ref.current!.push(circle("pushed", 90, 30))
    })
    for (const time of [0, 100, 200, 300]) {
      await act(async () => {
        now = time
        scheduler.flush(time)
      })
    }
    expect(ref.current!.getRegionState("pushed")).toMatchObject({
      activeRegionIds: ["gate"],
      attributes: { bodyId: "pushed", primitive: "chargeGate" }
    })
    expect(
      onEnter.mock.calls.filter(([event]) => event.bodyId === "pushed")
    ).toHaveLength(1)
    expect(
      onObservation.mock.calls.filter(
        ([event]) => event.type === "physics-spawn" && event.bodyId === "pushed"
      )
    ).toHaveLength(1)

    await act(async () => {
      ref.current!.applyImpulse("pushed", 1000, 0)
    })
    await act(async () => {
      if (method === "step") ref.current!.step(0.1)
      else ref.current![method](1)
    })
    expect(ref.current!.getRegionState("pushed")).toMatchObject({
      activeRegionIds: []
    })
    expect(
      onExit.mock.calls.filter(([event]) => event.bodyId === "pushed")
    ).toHaveLength(1)
  }
)
