import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { xySceneNodeToSVG } from "../SceneToSVG"
import { buildPhysicsSettledProjection } from "./PhysicsAccessibility"
import {
  buildPhysicsSettledScene,
  physicsBodiesToXYSceneNodes
} from "./PhysicsSettledScene"
import type { PhysicsBodyState } from "./PhysicsKernel"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"

function circle(id: string, x = 0, y = 0, windowIndex = 0) {
  return {
    id,
    x,
    y,
    shape: { type: "circle" as const, radius: 3 },
    mass: 1,
    datum: { id, label: id, windowIndex }
  }
}

function box(id: string, x = 0, y = 0) {
  return {
    id,
    x,
    y,
    shape: { type: "aabb" as const, width: 8, height: 10 },
    mass: 1,
    datum: { id, label: id, windowIndex: 1 }
  }
}

function windowContainerId(body: PhysicsBodyState): string | undefined {
  const datum = body.datum as { windowIndex?: number } | undefined
  return datum?.windowIndex == null ? undefined : `window-${datum.windowIndex}`
}

function svgMarkup(nodes: ReturnType<typeof physicsBodiesToXYSceneNodes>): string {
  return renderToStaticMarkup(
    <svg>{nodes.map((node, index) => xySceneNodeToSVG(node, index, "physics"))}</svg>
  )
}

describe("physics settled scene helpers", () => {
  it("projects settled physics bodies into XY scene nodes reusable by SceneToSVG", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      kernel: {
        seed: 31,
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.01
      }
    })
    store.spawnNow(circle("circle-a", 12, 18, 0))
    store.spawnNow(box("box-b", 30, 40))

    const projectionRows = buildPhysicsSettledProjection(
      [
        { id: "window-0", label: "0-12s" },
        { id: "window-1", label: "12-24s", secondary: 1, secondaryLabel: "late" }
      ],
      {
        bodies: store.readBodies(),
        getContainerId: windowContainerId
      }
    )
    const result = buildPhysicsSettledScene(store, {
      projectionRows,
      bodyStyle: (body) => ({
        fill: body.shape.type === "circle" ? "#0ea5e9" : "#22c55e"
      }),
      getBodyLabel: (body) => `Settled ${body.id}`
    })

    expect(result.stepsRun).toBeGreaterThan(0)
    expect(result.evidence).toMatchObject({
      bodyCount: 2,
      sleepingCount: 2,
      settled: true,
      seed: 31
    })
    expect(result.sceneNodes.map((node) => node.type)).toEqual(["point", "rect"])
    expect(result.sceneNodes[0]).toMatchObject({
      type: "point",
      pointId: "circle-a",
      accessibility: { label: "Settled circle-a" }
    })
    expect(result.sceneNodes[1]).toMatchObject({
      type: "rect",
      x: 26,
      y: 35,
      w: 8,
      h: 10,
      accessibility: { label: "Settled box-b" }
    })

    const html = svgMarkup(result.sceneNodes)
    expect(html).toContain("<circle")
    expect(html).toContain('cx="12"')
    expect(html).toContain("<rect")
    expect(html).toContain('x="26"')
    expect(html).toContain('fill="#0ea5e9"')
    expect(html).toContain('fill="#22c55e"')
  })

  it("projects snapshot-style body state without mutating bodies", () => {
    const body: PhysicsBodyState = {
      id: "body",
      x: 4,
      y: 5,
      prevX: 1,
      prevY: 2,
      vx: 0,
      vy: 0,
      angle: 0,
      mass: 1,
      shape: { type: "circle", radius: 6 },
      sleeping: true,
      datum: { label: "Body label" }
    }

    const [node] = physicsBodiesToXYSceneNodes([body])
    expect(node).toMatchObject({
      type: "point",
      x: 4,
      y: 5,
      r: 6,
      datum: { label: "Body label" },
      accessibility: { label: "Body label" }
    })
    expect(body.shape).toEqual({ type: "circle", radius: 6 })
  })
})
