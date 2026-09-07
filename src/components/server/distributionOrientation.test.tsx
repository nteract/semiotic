import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "./renderToStaticSVG"
import { CHART_CONFIGS } from "./serverChartConfigs"

describe("distribution server orientation and value domains", () => {
  for (const component of ["SwarmPlot", "BoxPlot", "ViolinPlot"] as const) {
    it(`${component} keeps the requested orientation and reference domain in SVG`, () => {
      const data = Array.from({ length: 12 }, (_, i) => ({
        category: "History",
        value: 20 + i * 2
      }))
      const props = {
        data,
        orientation: "horizontal",
        valueExtent: [0, 100],
        width: 500,
        height: 280,
        annotations: [{ type: "x-threshold", value: 80, color: "#123456" }],
        title: "Distribution with reference"
      }
      const built = CHART_CONFIGS[component].buildProps(
        data,
        undefined,
        undefined,
        {},
        props
      )
      expect(built.projection).toBe("horizontal")
      expect(built.rExtent).toEqual([0, 100])
      const horizontal = renderChartWithEvidence(component, props)
      const vertical = renderChartWithEvidence(component, {
        ...props,
        orientation: "vertical",
        annotations: []
      })
      expect(horizontal.evidence.markCount).toBeGreaterThan(0)
      expect(horizontal.evidence.sceneHash).not.toBe(
        vertical.evidence.sceneHash
      )
      const doc = new DOMParser().parseFromString(
        horizontal.svg,
        "image/svg+xml"
      )
      const reference = doc.querySelector('line[stroke="#123456"]')!
      expect(reference).not.toBeNull()
      expect(reference.getAttribute("x1")).toBe(reference.getAttribute("x2"))
      expect(Number(reference.getAttribute("x1"))).toBeGreaterThan(200)
      expect(Number(reference.getAttribute("x1"))).toBeLessThan(500)
    })
  }
})
