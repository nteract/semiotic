import { expect, it } from "vitest"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import { initializeCurrentPhysicsWorker } from "./physicsWorkerStartup"
import type { PhysicsWorkerResponsePayload } from "./PhysicsWorkerProtocol"

const spawn = {
  id: "new",
  x: 10,
  y: 20,
  shape: { type: "circle" as const, radius: 3 }
}
const frame = (payload: PhysicsWorkerResponsePayload) => {
  if (payload.type !== "frame") throw new Error("Expected frame")
  return payload.frame
}

it.each(["pause", "resume", "hide", "push", "restore"] as const)(
  "preserves a host %s during worker initialization",
  async (change) => {
    const store = new PhysicsPipelineStore()
    if (change === "resume") store.setPaused(true)
    const runtime = createPhysicsWorkerRuntime()
    let restores = 0
    const response = await initializeCurrentPhysicsWorker(
      {
        initFromSnapshot: async (_config, snapshot) => {
          const initial = frame(
            runtime.handle({
              type: "init",
              snapshot: structuredClone(snapshot)
            })
          )
          if (change === "pause") store.setPaused(true)
          if (change === "resume") store.setPaused(false)
          if (change === "hide") store.setVisible(false)
          if (change === "push") store.enqueue(spawn)
          if (change === "restore")
            store.restore({ ...store.snapshot(), elapsedSeconds: 7 })
          return initial
        },
        restore: async (snapshot) => {
          restores++
          return frame(
            runtime.handle({
              type: "restore",
              snapshot: structuredClone(snapshot)
            })
          )
        }
      },
      store,
      {},
      () => true
    )
    expect(restores).toBe(1)
    expect(response?.snapshot?.paused).toBe(change === "pause")
    expect(response?.snapshot?.visible).toBe(change !== "hide")
    if (change === "push") expect(response?.ids).toContain("new")
    if (change === "restore") expect(response?.snapshot?.elapsedSeconds).toBe(7)
  }
)

it("does not apply a response from a superseded worker generation", async () => {
  const store = new PhysicsPipelineStore()
  const runtime = createPhysicsWorkerRuntime()
  let current = true
  const result = await initializeCurrentPhysicsWorker(
    {
      initFromSnapshot: async (_config, snapshot) => {
        current = false
        return frame(runtime.handle({ type: "init", snapshot }))
      },
      restore: async () => {
        throw new Error("Must not restore an obsolete generation")
      }
    },
    store,
    {},
    () => current
  )
  expect(result).toBeNull()
})
