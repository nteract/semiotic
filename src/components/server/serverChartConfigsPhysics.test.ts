import { describe, expect, it } from "vitest"
import {
  galtonBoardChart,
  unitPileChart,
  eventDropChart
} from "./serverChartConfigsPhysics"
import { renderChartWithEvidence } from "./renderToStaticSVG"

describe("physics server configuration parity", () => {
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
