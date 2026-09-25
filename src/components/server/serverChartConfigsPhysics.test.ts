import { describe, expect, it } from "vitest"
import {
  galtonBoardChart,
  unitPileChart,
  eventDropChart
} from "./serverChartConfigsPhysics"
import { renderChartWithEvidence } from "./renderToStaticSVG"
import { PhysicsPipelineStore } from "../stream/physics/PhysicsPipelineStore"
import { buildPhysicsSettledScene } from "../stream/physics/PhysicsSettledScene"
import { renderPhysicsFrame } from "./staticPhysics"

describe("physics server configuration parity", () => {
  it.each([
    { chart: galtonBoardChart, pacing: { pacing: { ratePerSec: 55 } }, data: [{ value: 1 }, { value: 2 }] },
    { chart: unitPileChart, pacing: { pacing: { ratePerSec: 20 } }, data: [{ category: "A" }, { category: "B" }] },
    { chart: eventDropChart, pacing: { pacing: "arrival", timeScale: 1 }, data: [{ time: 0, arrivalTime: 0 }, { time: 60, arrivalTime: 60 }] }
  ])("preserves browser arrival pacing in static physics configs", ({ chart, pacing, data }) => {
    const props = chart.buildProps(data, undefined, undefined, { size: [400, 260] }, {})
    expect(props.initialSpawnPacing).toMatchObject(pacing)
  })

  it("static frames preserve late spawn times and match the settled scene", () => {
    const config = {
      kernel: { gravity: { x: 0, y: 0 }, velocityDamping: 0.99, sleepAfter: 0.01 }
    }
    const initialSpawns = [
      { id: "early", x: 10, y: 10, vx: 30, spawnAt: 0, shape: { type: "circle" as const, radius: 1 } },
      { id: "late", x: 10, y: 10, vx: 0, spawnAt: 60, shape: { type: "circle" as const, radius: 1 } }
    ]
    const store = new PhysicsPipelineStore(config)
    store.enqueue(initialSpawns)
    const expected = buildPhysicsSettledScene(store)
    const svg = renderPhysicsFrame({ config, initialSpawns })

    const circleXs = Array.from(svg.matchAll(/<circle[^>]*cx="([^"]+)"/g), (match) => Number(match[1]))
    expect(circleXs).toEqual(expected.bodies.map((body) => body.x))
    expect(expected.snapshot.elapsedSeconds).toBeGreaterThan(60)
    expect(expected.evidence.queuedCount).toBe(0)
  })

  it.each([
    { chart: galtonBoardChart, radius: 6, data: [{ id: "a", value: 1 }] },
    {
      chart: unitPileChart,
      radius: 8,
      data: [{ id: "a", category: "A", value: 1 }]
    },
    { chart: eventDropChart, radius: 7, data: [{ id: "a", time: 1 }] }
  ])(
    "uses the browser's primary circle radius $radius",
    ({ chart, radius, data }) => {
      const result = chart.buildProps(
        data,
        undefined,
        undefined,
        { size: [400, 260] },
        {}
      )
      expect(result.initialSpawns[0].shape).toEqual({ type: "circle", radius })
    }
  )

  it("preserves an authored Galton domain during serialization", () => {
    const result = galtonBoardChart.buildProps(
      [{ id: "a", value: 5 }],
      undefined,
      undefined,
      { size: [400, 260] },
      { valueExtent: [0, 10], bins: 10 }
    )
    expect(result.initialSpawns[0].datum.bin).toBe(5)
  })

  it("uses the same compact Galton radii as the React HOC", () => {
    for (const [mode, radius] of [
      ["sparkline", 1.5],
      ["context", 4]
    ] as const) {
      const result = galtonBoardChart.buildProps(
        [{ value: 5 }],
        undefined,
        undefined,
        { size: [400, 260] },
        { mode }
      )
      expect(result.initialSpawns[0].shape.radius).toBe(radius)
    }
  })

  it("generates mechanical Galton samples when a display mode is also supplied", () => {
    const { evidence } = renderChartWithEvidence("GaltonBoardChart", {
      mode: "primary",
      simulationMode: "mechanical",
      mechanicalCount: 12,
      width: 400,
      height: 260
    })
    expect(evidence.markCount).toBe(12)
  })

  it("propagates an unfinished physical scene into public rendering evidence", () => {
    const { evidence } = renderChartWithEvidence("PhysicsCustomChart", {
      data: [{ id: "falling" }],
      width: 240,
      height: 160,
      layout: () => ({
        config: {
          settleStepLimit: 2,
          kernel: { gravity: { x: 0, y: 100 }, sleepAfter: 100 }
        },
        bodies: [
          { id: "falling", x: 50, y: 10, shape: { type: "circle", radius: 4 } }
        ]
      })
    })
    expect(evidence.markCount).toBe(1)
    expect(evidence.warnings).toContain("PHYSICS_NOT_SETTLED")
  })
})
