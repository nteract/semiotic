import * as React from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "../../stream/physics/PhysicsWorkerRuntime"
import { createPhysicsWorkerConfig } from "../../stream/physics/PhysicsWorkerProtocol"
import { CollisionSwarmChart } from "./CollisionSwarmChart"
import {
  buildCollisionSwarmPhysics,
  type CollisionSwarmProjectionMetadata
} from "./collisionSwarmPhysics"

const data = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `row-${index}`, x: 50 }))
const build = (count: number, settle = false) =>
  buildCollisionSwarmPhysics({
    data: data(count),
    xAccessor: "x",
    xExtent: [0, 100],
    pointRadius: 6,
    seed: 1,
    size: [700, 360],
    settle
  })

describe("collision swarm quantitative axis", () => {
  it.each([true, false])(
    "preserves exact x during motion and settling (settle=%s)",
    (settle) => {
      const layout = build(20, settle)
      const store = new PhysicsPipelineStore(layout.config)
      store.enqueue(layout.initialSpawns)
      store.materializeDueSpawns()
      for (let i = 0; i < 600; i++) {
        store.tick(1 / 120)
        for (const body of store.readBodies()) expect(body.x).toBe(350)
      }
      const bodies = store.readBodies()
      expect(bodies).toHaveLength(20)
      const ys = bodies.map((body) => body.y).sort((a, b) => a - b)
      for (let i = 1; i < ys.length; i++)
        expect(ys[i] - ys[i - 1]).toBeGreaterThan(11.99)
      expect(ys[0]).toBeGreaterThanOrEqual(30)
      expect(ys[19]).toBeLessThanOrEqual(320)
      expect(
        (layout.metadata as unknown as CollisionSwarmProjectionMetadata)
          .groups[0].overlapping
      ).toBe(false)
    }
  )

  it("discloses an overfull lane while retaining every point at its value and radius", () => {
    const layout = build(50)
    expect(
      (layout.metadata as unknown as CollisionSwarmProjectionMetadata).groups[0]
        .overlapping
    ).toBe(true)
    const store = new PhysicsPipelineStore(layout.config)
    store.enqueue(layout.initialSpawns)
    store.settle()
    expect(store.readBodies()).toHaveLength(50)
    for (const body of store.readBodies()) {
      expect(body.x).toBe(350)
      expect(body.shape).toEqual({ type: "circle", radius: 6 })
      expect(body.y).toBeGreaterThanOrEqual(30)
      expect(body.y).toBeLessThanOrEqual(320)
    }
    const props = {
      data: data(50),
      xExtent: [0, 100] as [number, number],
      pointRadius: 6,
      width: 700,
      height: 360
    }
    const rendered = renderChartWithEvidence("CollisionSwarmChart", props)
    expect(rendered.evidence.markCount).toBe(50)
    for (const svg of [
      rendered.svg,
      renderToString(<CollisionSwarmChart {...props} />)
    ]) {
      expect(svg).toContain("Points overlap. Reduce radius or increase height.")
      expect(svg).toContain("50")
    }
  })

  it("carries the constraint through queued worker bodies and restore", () => {
    const layout = build(20)
    const worker = createPhysicsWorkerRuntime()
    worker.handle({
      type: "init",
      initialSpawns: layout.initialSpawns,
      config: createPhysicsWorkerConfig(layout.config)
    })
    for (let i = 0; i < 30; i++)
      worker.handle({ type: "tick", deltaSeconds: 1 / 60 })
    const saved = worker.handle({ type: "snapshot" })
    if (saved.type !== "snapshot") throw new Error("Missing worker snapshot")
    worker.handle({ type: "restore", snapshot: saved.snapshot })
    const next = worker.handle({ type: "tick", deltaSeconds: 1 / 60 })
    if (next.type !== "frame") throw new Error("Missing worker frame")
    for (const body of next.frame.bodies) {
      expect(body.x).toBe(350)
      expect(body.fixedPosition?.x).toBe(350)
    }
  })
})
