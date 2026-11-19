/**
 * The XY and ordinal brushes are browser-only: their props, controlled extent
 * included, leave static SVG unchanged and are accepted without validation
 * errors.
 */
import { describe, expect, it } from "vitest"
import * as server from "../semiotic-server"
import * as edge from "../semiotic-server-edge"

const rows = Array.from({ length: 12 }, (_, x) => [
  { x, y: 10 + (x % 4), series: "A" },
  { x, y: 4 + (x % 3), series: "B" },
]).flat()

const brushProps = {
  brush: true,
  brushExtent: { x: [2, 6] as [number, number] },
  onBrush: () => {},
  onBrushEnd: () => {},
}

for (const [entry, renderer] of [
  ["semiotic/server", server],
  ["semiotic/server/edge", edge],
] as const) {
  describe(`${entry} XY brush props`, () => {
    it.each([
      ["LineChart", { lineBy: "series" }],
      ["StackedAreaChart", { areaBy: "series" }],
    ] as const)("leave %s's SVG unchanged", (component, extra) => {
      const props = { data: rows, xAccessor: "x", yAccessor: "y", width: 320, height: 200, ...extra }
      const plain = renderer.renderChart(component, props)
      const brushed = renderer.renderChartWithEvidence(component, { ...props, ...brushProps })
      expect(brushed.svg).toBe(plain)
      expect(brushed.svg).not.toContain("brush")
      expect(brushed.evidence.warnings).toEqual([])
    })
  })
}

for (const [entry, renderer] of [
  ["semiotic/server", server],
  ["semiotic/server/edge", edge],
] as const) {
  describe(`${entry} ordinal brush props`, () => {
    it("leave Histogram's SVG unchanged", () => {
      const props = {
        data: rows.map((row) => ({ category: row.series, value: row.y })),
        categoryAccessor: "category",
        valueAccessor: "value",
        width: 320,
        height: 200,
      }
      const plain = renderer.renderChart("Histogram", props)
      const brushed = renderer.renderChartWithEvidence("Histogram", {
        ...props,
        brush: true,
        brushExtent: { r: [5, 10] as [number, number] },
        onBrush: () => {},
        onBrushEnd: () => {},
      })
      expect(brushed.svg).toBe(plain)
      expect(brushed.svg).not.toContain("brush")
      expect(brushed.evidence.warnings).toEqual([])
    })
  })
}
