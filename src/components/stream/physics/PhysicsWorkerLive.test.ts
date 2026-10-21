import { describe, expect, it, vi } from "vitest"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import {
  PhysicsPipelineStore,
  type PhysicsPipelineConfig
} from "./PhysicsPipelineStore"
import { PhysicsWorkerDatums } from "./physicsWorkerDatums"
import { createPhysicsWorkerConfig } from "./PhysicsWorkerProtocol"
import { EventDropLedger } from "../../charts/physics/eventDropLedger"
import type {
  PhysicsWorkerCommand,
  PhysicsWorkerFrame
} from "./PhysicsWorkerProtocol"

const config: PhysicsPipelineConfig = {
  fixedDt: 0.01,
  maxSubsteps: 100,
  maxDeltaSeconds: 1,
  bodyLimit: 5,
  kernel: { gravity: { x: 0, y: 0 } },
  eventDrop: {
    live: { follow: "now", horizon: 2, retain: 2 },
    windowSize: 1,
    size: [600, 400],
    ballRadius: 3,
    seed: 5,
    timeUnit: "s",
    watermark: {
      delay: 0.2,
      perSource: true,
      idleTimeout: 1,
      allowedLateness: 0.5
    },
    sources: [{ id: "source", label: "Source" }],
    arrival: { mode: "travel", durationMs: 200 }
  },
  emitters: {
    templates: { source: { x: 0, y: 0, shape: { type: "circle", radius: 3 } } },
    sources: [{ id: "source", interval: 100, jitter: "watermarks" }],
    timeUnit: "s",
    seed: 5
  }
}

function harness() {
  const runtime = createPhysicsWorkerRuntime()
  const mirror = new PhysicsPipelineStore()
  const datums = new PhysicsWorkerDatums()
  const send = (
    command: PhysicsWorkerCommand,
    wireCommand = command
  ): PhysicsWorkerFrame => {
    const revision = datums.capture(command)
    const response = datums.receive(
      structuredClone(runtime.handle(wireCommand)),
      revision
    )
    if (response.type !== "frame") throw new Error("Expected frame")
    mirror.applyWorkerFrame(response.frame)
    return response.frame
  }
  send({ type: "init", config: createPhysicsWorkerConfig(config) })
  const authoritative = () => {
    const response = runtime.handle({ type: "snapshot" })
    if (response.type !== "snapshot") throw new Error("Expected snapshot")
    return response.snapshot
  }
  return { runtime, mirror, datums, send, authoritative }
}

describe("incremental live worker mirrors", () => {
  it("retains authored callbacks for evicted travellers across full and incremental frames", () => {
    const h = harness()
    h.send({ type: "configure", config: { bodyLimit: 0, emitters: false } })
    const format = () => "authored"
    const command: PhysicsWorkerCommand = {
      type: "enqueue",
      spawns: [
        {
          id: "authored",
          x: 0,
          y: 0,
          shape: { type: "circle", radius: 3 },
          datum: { time: 1, source: "source", format }
        }
      ]
    }
    h.send(command, JSON.parse(JSON.stringify(command)))
    expect(h.mirror.liveBodyCount()).toBe(0)
    for (let i = 0; i < 10; i++) {
      h.send({ type: "tick", deltaSeconds: 0.01 })
      expect(
        h.mirror.snapshot().eventDrop!.pending[0].spawn.datum
      ).toMatchObject({ format })
    }
    const snapshot = h.mirror.snapshot()
    const restore: PhysicsWorkerCommand = { type: "restore", snapshot }
    h.send(restore, {
      type: "restore",
      snapshot: {
        ...snapshot,
        eventDrop: {
          ...snapshot.eventDrop!,
          pending: snapshot.eventDrop!.pending.map((p) => ({
            ...p,
            spawn: {
              ...p.spawn,
              datum: {
                time: 1,
                eventTime: 1,
                source: "source",
                __phase: "travel"
              }
            }
          }))
        }
      }
    })
    h.send({ type: "tick", deltaSeconds: 0.01 })
    expect(h.mirror.snapshot().eventDrop!.pending[0].spawn.datum).toMatchObject(
      { format }
    )
  })

  it("preserves admissions, evicted handoffs, retirement, clocks and source state without full tick snapshots", () => {
    const h = harness()
    const restore = vi.spyOn(h.mirror, "restore")
    let structures = 0
    let motions = 0
    for (let i = 0; i < 600; i++) {
      const frame = h.send({ type: "tick", deltaSeconds: 0.01 })
      expect(frame.snapshot).toBeUndefined()
      if (frame.structure) structures++
      else motions++
      if (i % 30 === 0) {
        const saved = h.authoritative()
        expect(h.mirror.snapshot().eventDrop).toEqual(saved.eventDrop)
        expect(h.mirror.snapshot().emitters).toEqual(saved.emitters)
        expect(h.mirror.enqueueSequence()).toBe(saved.nextSequence)
        expect(h.mirror.readBodies().map((b) => b.id)).toEqual(
          saved.world.bodies.map((b) => b.id)
        )
        for (const body of h.mirror.readBodies()) {
          const expected = saved.world.bodies.find((b) => b.id === body.id)!
          expect(body.x).toBeCloseTo(expected.x, 3)
          expect(body.y).toBeCloseTo(expected.y, 3)
          expect(body.datum).toEqual(expected.datum)
        }
      }
    }
    expect(restore).not.toHaveBeenCalled()
    expect(structures).toBeGreaterThan(10)
    expect(motions).toBeGreaterThan(structures)
    // Resume from the host mirror, including travellers no longer represented by a body.
    const resumed = new PhysicsPipelineStore()
    resumed.restore(h.mirror.snapshot())
    for (let i = 0; i < 100; i++) {
      resumed.tick(0.01)
      h.send({ type: "tick", deltaSeconds: 0.01 })
    }
    expect(resumed.snapshot().eventDrop).toEqual(h.authoritative().eventDrop)
    expect(resumed.snapshot().emitters).toEqual(h.authoritative().emitters)
  })

  it("does not copy historical rows on motion ticks, even with thousands of windows", () => {
    const h = harness()
    const saved = h.authoritative()
    const ledger = new EventDropLedger(1, { delay: 0 })
    for (let i = 0; i < 3000; i++)
      ledger.append({ eventTime: i, arrivalTime: i, source: "source" })
    saved.eventDrop!.ledger = ledger.snapshot()
    saved.eventDrop!.elapsed = saved.elapsedSeconds = 3000
    saved.eventDrop!.anchor = 3000
    delete saved.emitters
    h.send({ type: "restore", snapshot: saved })
    const copyHistory = vi.spyOn(EventDropLedger.prototype, "getLedger")
    for (let i = 0; i < 10; i++) {
      const frame = h.send({ type: "tick", deltaSeconds: 0.01 })
      expect(frame.snapshot).toBeUndefined()
      expect(frame.structure).toBeUndefined()
      expect(frame.live!.ledger.windows).toHaveLength(0)
      expect(JSON.stringify(frame.live).length).toBeLessThan(1000)
    }
    expect(copyHistory).not.toHaveBeenCalled()
    copyHistory.mockRestore()
    expect(h.mirror.snapshot().eventDrop).toEqual(h.authoritative().eventDrop)
  })

  it("resets delta baselines across clear/restore and preserves configure/pause/visibility behavior", () => {
    const h = harness()
    for (let i = 0; i < 50; i++) h.send({ type: "tick", deltaSeconds: 0.01 })
    const saved = h.mirror.snapshot()
    h.send({ type: "setPaused", paused: true })
    const frozen = h.mirror.snapshot()
    h.send({ type: "tick", deltaSeconds: 0.1 })
    expect(h.mirror.snapshot()).toEqual(frozen)
    h.send({ type: "clear" })
    h.send({ type: "restore", snapshot: saved })
    h.send({ type: "configure", config: { emitters: false } })
    h.send({ type: "setVisible", visible: false })
    const hidden = h.mirror.snapshot()
    h.send({ type: "tick", deltaSeconds: 0.1 })
    expect(h.mirror.snapshot()).toEqual(hidden)
    h.send({ type: "setVisible", visible: true })
    for (let i = 0; i < 100; i++) h.send({ type: "tick", deltaSeconds: 0.01 })
    expect(h.mirror.snapshot().eventDrop).toEqual(h.authoritative().eventDrop)
    expect(h.mirror.snapshot().emitters).toBeUndefined()
  })
})
