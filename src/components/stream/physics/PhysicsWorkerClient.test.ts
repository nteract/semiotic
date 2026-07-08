import { describe, expect, it } from "vitest"
import { PhysicsWorkerSession } from "./PhysicsWorkerClient"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import {
  createPhysicsWorkerConfig,
  isPhysicsWorkerConfigSupported,
  packPhysicsWorkerFrame,
  shouldUsePhysicsWorker,
  type PhysicsWorkerRequest,
  type PhysicsWorkerResponse,
  type PhysicsWorkerResponsePayload
} from "./PhysicsWorkerProtocol"
import type { PhysicsPipelineTickResult } from "./PhysicsPipelineStore"

class MockWorker {
  onmessage: ((event: MessageEvent<PhysicsWorkerResponse>) => void) | null =
    null
  onerror: ((event: ErrorEvent) => void) | null = null
  messages: PhysicsWorkerRequest[] = []
  terminated = false

  postMessage(request: PhysicsWorkerRequest): void {
    this.messages.push(request)
  }

  respond(
    payload: PhysicsWorkerResponsePayload,
    requestId = this.messages[this.messages.length - 1]?.requestId ?? 0
  ): void {
    this.onmessage?.({
      data: { ok: true, payload, requestId }
    } as MessageEvent<PhysicsWorkerResponse>)
  }

  terminate(): void {
    this.terminated = true
  }
}

function emptyTickResult(): PhysicsPipelineTickResult {
  return {
    budget: {
      action: "continue",
      liveBodies: 0,
      overflow: 0,
      projectedBodies: 0,
      queuedBodies: 0,
      state: "ok"
    },
    elapsedSeconds: 0,
    evicted: [],
    events: [],
    observations: [],
    queueSize: 0,
    revision: 0,
    sedimented: [],
    shouldContinue: false,
    sleeping: true,
    spawned: [],
    steps: 0
  }
}

describe("physics worker protocol", () => {
  it("uses body count threshold for automatic execution", () => {
    expect(shouldUsePhysicsWorker("sync", 5000)).toBe(false)
    expect(shouldUsePhysicsWorker("worker", 1)).toBe(true)
    expect(shouldUsePhysicsWorker("auto", 2499)).toBe(false)
    expect(shouldUsePhysicsWorker("auto", 2000, 500)).toBe(true)
  })

  it("sanitizes worker config to cloneable physics options", () => {
    const config = createPhysicsWorkerConfig({
      bodyLimit: 10,
      observation: {
        chartId: "chart-1",
        chartType: "PhysicsPileChart",
        onObservation: () => undefined,
        sensors: {
          lane: { binId: "lane-a" }
        }
      },
      sediment: {
        binAccessor: "lane",
        valueAccessor: "weight"
      }
    })

    expect(config).toEqual({
      bodyLimit: 10,
      observation: {
        chartId: "chart-1",
        chartType: "PhysicsPileChart",
        sensors: {
          lane: { binId: "lane-a" }
        }
      },
      sediment: {
        binAccessor: "lane",
        labelAccessor: undefined,
        retainBodyIds: undefined,
        valueAccessor: "weight"
      }
    })
    expect(
      isPhysicsWorkerConfigSupported({
        sediment: { binAccessor: () => "lane" }
      })
    ).toBe(false)
    expect(() =>
      createPhysicsWorkerConfig({ engine: (() => null) as never })
    ).toThrow("built-in kernel")
  })

  it("packs frames into structure-of-arrays transfer buffers", () => {
    const frame = packPhysicsWorkerFrame(emptyTickResult(), [
      {
        angle: 0,
        id: "a",
        mass: 1,
        prevX: 2,
        prevY: 3,
        shape: { type: "circle", radius: 4 },
        sleeping: false,
        vx: 5,
        vy: 6,
        x: 7,
        y: 8
      }
    ])

    expect(frame.ids).toEqual(["a"])
    expect(Array.from(frame.positions)).toEqual([7, 8])
    expect(Array.from(frame.velocities)).toEqual([5, 6])
    expect(Array.from(frame.sleeping)).toEqual([0])
  })
})

describe("physics worker runtime", () => {
  it("owns a resident store and returns typed-array frames", () => {
    const runtime = createPhysicsWorkerRuntime()
    const init = runtime.handle({
      type: "init",
      config: createPhysicsWorkerConfig({
        fixedDt: 0.1,
        kernel: {
          gravity: { x: 0, y: 10 },
          sleepAfter: 999,
          velocityDamping: 1
        },
        maxSubsteps: 2
      }),
      initialSpawns: [
        {
          id: "ball",
          mass: 1,
          shape: { type: "circle", radius: 2 },
          x: 0,
          y: 0
        }
      ]
    })

    expect(init.type).toBe("frame")
    if (init.type !== "frame") return
    expect(init.frame.ids).toEqual(["ball"])

    const tick = runtime.handle({ type: "tick", deltaSeconds: 0.1 })
    expect(tick.type).toBe("frame")
    if (tick.type !== "frame") return
    expect(tick.frame.result.steps).toBe(1)
    expect(tick.frame.snapshot?.world.bodies.map((body) => body.id)).toEqual([
      "ball"
    ])
    expect(tick.frame.bodies[0].y).toBeCloseTo(0.1)
    expect(tick.frame.positions[0]).toBeCloseTo(tick.frame.bodies[0].x)
    expect(tick.frame.positions[1]).toBeCloseTo(tick.frame.bodies[0].y)
  })

  it("snapshots and restores the resident store", () => {
    const runtime = createPhysicsWorkerRuntime()
    runtime.handle({
      type: "init",
      initialSpawns: [
        {
          id: "a",
          shape: { type: "circle", radius: 2 },
          x: 0,
          y: 0
        }
      ]
    })
    const snapshot = runtime.handle({ type: "snapshot" })
    expect(snapshot.type).toBe("snapshot")
    if (snapshot.type !== "snapshot") return

    const removed = runtime.handle({ type: "remove", ids: ["a"] })
    expect(removed.type).toBe("removed")
    if (removed.type !== "removed") return
    expect(removed.removed).toEqual(["a"])
    expect(removed.frame.ids).toEqual([])

    const restored = runtime.handle({
      type: "restore",
      snapshot: snapshot.snapshot
    })
    expect(restored.type).toBe("frame")
    if (restored.type !== "frame") return
    expect(restored.frame.ids).toEqual(["a"])
  })
})

describe("PhysicsWorkerSession", () => {
  it("resolves worker responses without terminating the resident worker", async () => {
    const worker = new MockWorker()
    const session = new PhysicsWorkerSession(worker as unknown as Worker)
    const promise = session.tick(1 / 60)

    expect(worker.messages).toMatchObject([
      { command: { type: "tick", deltaSeconds: 1 / 60 } }
    ])

    const payload: PhysicsWorkerResponsePayload = {
      type: "frame",
      frame: packPhysicsWorkerFrame(emptyTickResult(), [])
    }
    worker.respond(payload)

    await expect(promise).resolves.toBe(payload.frame)
    expect(worker.terminated).toBe(false)

    session.terminate()
    expect(worker.terminated).toBe(true)
  })

  it("rejects aborted requests while keeping the session alive", async () => {
    const worker = new MockWorker()
    const session = new PhysicsWorkerSession(worker as unknown as Worker)
    const controller = new AbortController()
    const promise = session.tick(1 / 60, controller.signal)

    controller.abort()

    await expect(promise).rejects.toMatchObject({ name: "AbortError" })
    expect(worker.terminated).toBe(false)
    session.terminate()
  })

  it("posts sanitized init commands", async () => {
    const worker = new MockWorker()
    const session = new PhysicsWorkerSession(worker as unknown as Worker)
    const promise = session.init({
      observation: {
        chartId: "chart-1",
        onObservation: () => undefined
      }
    })

    expect(worker.messages[0].command).toMatchObject({
      type: "init",
      config: {
        observation: {
          chartId: "chart-1"
        }
      }
    })

    const payload: PhysicsWorkerResponsePayload = {
      type: "frame",
      frame: packPhysicsWorkerFrame(emptyTickResult(), [])
    }
    worker.respond(payload)

    await expect(promise).resolves.toBe(payload.frame)
    session.terminate()
  })
})
