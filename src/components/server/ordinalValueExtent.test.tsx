import { createRequire } from "node:module"
import Ajv from "ajv"
import { describe, expect, it } from "vitest"
import { prepareChart } from "semiotic/ai/core"
import { renderChartWithEvidence } from "./renderToStaticSVG"

const require = createRequire(import.meta.url)
const schema = require("../../../ai/schema.json") as {
  tools: Array<{
    function: {
      name: string
      parameters: { properties: Record<string, object> }
    }
  }>
}
const data = [
  { category: "North", value: 12, series: "First" },
  { category: "West", value: 18, series: "First" }
]
const corrected = [data[0], { ...data[1], value: 36 }]
const ordinalComponents = [
  "BarChart",
  "StackedBarChart",
  "GroupedBarChart",
  "DotPlot",
  "RidgelinePlot",
  "SwarmPlot",
  "BoxPlot",
  "ViolinPlot",
  "Histogram",
  "RadarChart",
  "SwimlaneChart",
  "LikertChart"
]

describe("ordinal valueExtent across static and serialized entry points", () => {
  it.each(ordinalComponents)(
    "%s advertises usable numeric bounds through its generated schema",
    (component) => {
      const property = schema.tools.find(
        (tool) => tool.function.name === component
      )!.function.parameters.properties.valueExtent
      const validate = new Ajv().compile(property)
      expect(validate([0, 40])).toBe(true)
      expect(validate([-100, 100])).toBe(true)
      expect(validate([0])).toBe(true)
      expect(validate([])).toBe(false)
      expect(validate([0, 40, 80])).toBe(false)
      expect(validate([0, "40"])).toBe(false)
      expect(validate([0, null])).toBe(false)
    }
  )

  for (const component of ["BarChart", "StackedBarChart", "GroupedBarChart"]) {
    it.each(["horizontal", "vertical"])(
      `${component} preserves bar scale after a source correction in %s output`,
      (orientation) => {
        const props = {
          categoryAccessor: "category",
          valueAccessor: "value",
          ...(component === "StackedBarChart" ? { stackBy: "series" } : {}),
          ...(component === "GroupedBarChart" ? { groupBy: "series" } : {}),
          sort: false,
          orientation,
          valueExtent: [0, 40],
          showLegend: false,
          width: 500,
          height: 300
        }
        const before = prepareChart(
          { component, props: { ...props, data } },
          { render: renderChartWithEvidence }
        )
        const after = prepareChart(
          { component, props: { ...props, data: corrected } },
          { render: renderChartWithEvidence }
        )
        expect(before.ok, before.reasons.join(", ")).toBe(true)
        expect(after.ok, after.reasons.join(", ")).toBe(true)
        expect(before.evidence?.yDomain).toEqual([0, 40])
        expect(after.evidence?.yDomain).toEqual([0, 40])
        const originalBars = [
          ...new DOMParser()
            .parseFromString(before.svg!, "image/svg+xml")
            .querySelectorAll("#data-area rect")
        ]
        const correctedBars = [
          ...new DOMParser()
            .parseFromString(after.svg!, "image/svg+xml")
            .querySelectorAll("#data-area rect")
        ]
        expect(originalBars).toHaveLength(2)
        expect(correctedBars).toHaveLength(2)
        const dimension = orientation === "horizontal" ? "width" : "height"
        const originalLengths = originalBars.map((bar) =>
          Number(bar.getAttribute(dimension))
        )
        const correctedLengths = correctedBars.map((bar) =>
          Number(bar.getAttribute(dimension))
        )
        expect(correctedLengths[0]).toBe(originalLengths[0])
        expect(correctedLengths[1] / originalLengths[1]).toBeCloseTo(2, 5)
        expect(correctedLengths[0] / correctedLengths[1]).toBeCloseTo(
          12 / 36,
          5
        )
        const partial = renderChartWithEvidence(component, {
          ...props,
          data: corrected,
          valueExtent: [0]
        })
        expect(partial.evidence.yDomain?.[0]).toBe(0)
        expect(partial.evidence.yDomain?.[1]).toBeGreaterThanOrEqual(36)
        expect(partial.evidence.yDomain?.[1]).toBeLessThan(40)
      }
    )
  }

  it.each(["horizontal", "vertical"])(
    "DotPlot preserves a point's position after other data change in %s output",
    (orientation) => {
      const props = {
        categoryAccessor: "category",
        valueAccessor: "value",
        orientation,
        sort: false,
        valueExtent: [0, 40],
        width: 500,
        height: 300
      }
      const before = renderChartWithEvidence("DotPlot", { ...props, data })
      const after = renderChartWithEvidence("DotPlot", {
        ...props,
        data: corrected
      })
      expect(before.evidence.yDomain).toEqual([0, 40])
      expect(after.evidence.yDomain).toEqual([0, 40])
      const originalDots = [
        ...new DOMParser()
          .parseFromString(before.svg, "image/svg+xml")
          .querySelectorAll("#data-area circle")
      ]
      const correctedDots = [
        ...new DOMParser()
          .parseFromString(after.svg, "image/svg+xml")
          .querySelectorAll("#data-area circle")
      ]
      expect(correctedDots).toHaveLength(2)
      const coordinate = orientation === "horizontal" ? "cx" : "cy"
      expect(correctedDots[0].getAttribute(coordinate)).toBe(
        originalDots[0].getAttribute(coordinate)
      )
      const distanceBefore = Math.abs(
        Number(originalDots[1].getAttribute(coordinate)) -
          Number(originalDots[0].getAttribute(coordinate))
      )
      const distanceAfter = Math.abs(
        Number(correctedDots[1].getAttribute(coordinate)) -
          Number(correctedDots[0].getAttribute(coordinate))
      )
      expect(distanceAfter / distanceBefore).toBeCloseTo(
        (36 - 12) / (18 - 12),
        5
      )
    }
  )

  it.each(["horizontal", "vertical"])(
    "RidgelinePlot keeps its reference domain when a distribution changes in %s output",
    (orientation) => {
      const distribution = Array.from({ length: 20 }, (_, i) => ({
        category: i < 10 ? "North" : "West",
        value: 10 + (i % 10)
      }))
      const changed = distribution.map((row) =>
        row.category === "West" ? { ...row, value: row.value + 15 } : row
      )
      const props = {
        categoryAccessor: "category",
        valueAccessor: "value",
        orientation,
        valueExtent: [0, 40],
        width: 500,
        height: 300
      }
      const before = renderChartWithEvidence("RidgelinePlot", {
        ...props,
        data: distribution
      })
      const after = renderChartWithEvidence("RidgelinePlot", {
        ...props,
        data: changed
      })
      expect(before.evidence.yDomain).toEqual([0, 40])
      expect(after.evidence.yDomain).toEqual([0, 40])
      const originalRidges = new DOMParser()
        .parseFromString(before.svg, "image/svg+xml")
        .querySelectorAll("#data-area path")
      const correctedRidges = new DOMParser()
        .parseFromString(after.svg, "image/svg+xml")
        .querySelectorAll("#data-area path")
      expect(originalRidges).toHaveLength(2)
      expect(correctedRidges).toHaveLength(2)
      expect(correctedRidges[0].getAttribute("d")).toBe(
        originalRidges[0].getAttribute("d")
      )
      expect(correctedRidges[1].getAttribute("d")).not.toBe(
        originalRidges[1].getAttribute("d")
      )
      expect(after.evidence.sceneHash).not.toBe(before.evidence.sceneHash)
    }
  )
})
