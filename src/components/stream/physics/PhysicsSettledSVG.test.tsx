import { describe, expect, it } from "vitest"
import { buildPhysicsSettledProjection } from "./PhysicsAccessibility"
import type { PhysicsBodyState } from "./PhysicsKernel"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import { renderPhysicsSettledSVG } from "./PhysicsSettledSVG"

function circle(id: string, x: number, y: number, windowIndex = 0) {
  return {
    id,
    x,
    y,
    shape: { type: "circle" as const, radius: 4 },
    mass: 1,
    datum: { id, label: id, windowIndex }
  }
}

function box(id: string, x: number, y: number, windowIndex = 1) {
  return {
    id,
    x,
    y,
    shape: { type: "aabb" as const, width: 10, height: 12 },
    mass: 1,
    datum: { id, label: id, windowIndex }
  }
}

function windowContainerId(body: PhysicsBodyState): string | undefined {
  const datum = body.datum as { windowIndex?: number } | undefined
  return datum?.windowIndex == null ? undefined : `window-${datum.windowIndex}`
}

describe("physics settled SVG renderer", () => {
  it("renders a settled physics scene to standalone SVG with evidence", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      kernel: {
        seed: 17,
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.01
      }
    })
    store.spawnNow(circle("event-a", 24, 32, 0))
    store.spawnNow(box("event-b", 60, 70, 1))

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

    const result = renderPhysicsSettledSVG(store, {
      width: 160,
      height: 120,
      title: "Settled EventDrop",
      description: "Events settled into two event-time windows.",
      background: "#ffffff",
      idPrefix: "event drop",
      projectionRows,
      bodyStyle: (body) => ({
        fill: body.shape.type === "circle" ? "#2563eb" : "#dc2626"
      }),
      getBodyLabel: (body) => `Rendered ${body.id}`
    })

    expect(result.svg).toContain("<svg")
    expect(result.svg).toContain('role="img"')
    expect(result.svg).toContain('aria-labelledby="event_drop-title event_drop-desc"')
    expect(result.svg).toContain("<title")
    expect(result.svg).toContain("Settled EventDrop")
    expect(result.svg).toContain("<desc")
    expect(result.svg).toContain("Events settled into two event-time windows.")
    expect(result.svg).toContain("<circle")
    expect(result.svg).toContain('cx="24"')
    expect(result.svg).toContain("<rect")
    expect(result.svg).toContain('x="55"')
    expect(result.svg).toContain('fill="#2563eb"')
    expect(result.svg).toContain('fill="#dc2626"')
    expect(result.scene.sceneNodes.map((node) => node.type)).toEqual([
      "point",
      "rect"
    ])
    expect(result.scene.sceneNodes[0]).toMatchObject({
      accessibility: { label: "Rendered event-a" }
    })
    expect(result.evidence).toMatchObject({
      bodyCount: 2,
      sleepingCount: 2,
      settled: true,
      seed: 17,
      binCounts: [
        { id: "window-0", label: "0-12s", count: 1 },
        {
          id: "window-1",
          label: "12-24s",
          count: 1,
          secondary: 1,
          secondaryLabel: "late"
        }
      ]
    })
    expect(result.evidence.stepsRun).toBeGreaterThan(0)
  })

  it("resolves graphics callbacks around the settled body layer", () => {
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      kernel: {
        seed: 23,
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.01
      }
    })
    store.spawnNow(circle("layered-body", 40, 50))

    const contexts: Array<{
      size: number[]
      margin: { top: number; right: number; bottom: number; left: number }
    }> = []
    const result = renderPhysicsSettledSVG(store, {
      width: 180,
      height: 100,
      idPrefix: "layer order",
      margin: { top: 7, left: 11 },
      backgroundGraphics: (context) => {
        contexts.push(context)
        return <g data-testid="settled-background" />
      },
      foregroundGraphics: (context) => {
        contexts.push(context)
        return <g data-testid="settled-foreground" />
      }
    })

    expect(contexts).toEqual([
      {
        size: [180, 100],
        margin: { top: 7, right: 0, bottom: 0, left: 11 }
      },
      {
        size: [180, 100],
        margin: { top: 7, right: 0, bottom: 0, left: 11 }
      }
    ])
    const backgroundIndex = result.svg.indexOf('data-testid="settled-background"')
    const bodyIndex = result.svg.indexOf('id="layer_order-data-area"')
    const foregroundIndex = result.svg.indexOf('data-testid="settled-foreground"')
    expect(backgroundIndex).toBeGreaterThan(-1)
    expect(bodyIndex).toBeGreaterThan(backgroundIndex)
    expect(foregroundIndex).toBeGreaterThan(bodyIndex)
  })
})
