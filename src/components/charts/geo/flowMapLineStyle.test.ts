import { buildFlowMapLineStyle, flowMapEdgeWidth } from "./flowMapLineStyle"

describe("flowMapLineStyle", () => {
  it("collapses non-finite values to the minimum width", () => {
    expect(flowMapEdgeWidth(NaN, [0, 10], [1, 8])).toBe(1)
    expect(flowMapEdgeWidth("n/a", [0, 10], [1, 8])).toBe(1)
    expect(flowMapEdgeWidth(10, [0, 10], [1, 8])).toBe(8)
  })

  it("applies styleRules on top of the scaled edge stroke", () => {
    const style = buildFlowMapLineStyle({
      valueAccessor: "passengers",
      valueDomain: [0, 100],
      edgeWidthRange: [1, 8],
      resolveStroke: () => "#007bff",
      edgeOpacity: 0.6,
      edgeLinecap: "round",
      styleRules: [{ when: { gte: 50 }, style: { stroke: "#d7263d" } }]
    })
    expect(style({ passengers: 80 })).toMatchObject({
      stroke: "#d7263d",
      strokeWidth: expect.any(Number),
      fillOpacity: 0
    })
    expect(style({ passengers: 10 }).stroke).toBe("#007bff")
  })
})
