import { describe, expect, it } from "vitest"
import { physicsChartArea, styleFromColorAccessor } from "./physicsChartShared"

describe("physicsChartArea", () => {
  it("preserves the full chart plot geometry", () => {
    expect(physicsChartArea([300, 180]).plot).toEqual({
      x: 32,
      y: 24,
      width: 236,
      height: 122
    })
  })

  it("keeps a sparkline plot inside its requested bounds", () => {
    const area = physicsChartArea([118, 36])

    expect(area.plot.x).toBeGreaterThanOrEqual(0)
    expect(area.plot.y).toBeGreaterThanOrEqual(0)
    expect(area.plot.x + area.plot.width).toBeLessThanOrEqual(area.width)
    expect(area.plot.y + area.plot.height).toBeLessThanOrEqual(area.height)
    expect(area.plot.width).toBeGreaterThan(90)
    expect(area.plot.height).toBeGreaterThan(24)
  })
})

describe("styleFromColorAccessor", () => {
  it("layers declarative rules over the colorBy-derived particle style", () => {
    const bodyStyle = styleFromColorAccessor("outcome", "#2563eb", {
      styleRules: [
        {
          when: { field: "outcome", eq: "accepted" },
          style: { fill: "#57c7b7", stroke: "#f0e7cf" }
        },
        {
          when: { field: "value", gte: 10 },
          style: { strokeWidth: 2 }
        }
      ],
      valueAccessor: "value"
    })

    expect(
      bodyStyle({
        datum: { id: "accepted-route", outcome: "accepted", value: 12 }
      })
    ).toMatchObject({
      fill: "#57c7b7",
      stroke: "#f0e7cf",
      strokeWidth: 2
    })
  })
})
