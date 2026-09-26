import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { scaleBand, scaleLinear } from "d3-scale"
import { describe, expect, it } from "vitest"
import { bobaLayout } from "semiotic/recipes"
import { renderChartWithEvidence } from "semiotic/server"
import type { OrdinalLayoutContext } from "../stream/ordinalCustomLayout"
import type { BobaConfig } from "./boba"

function layout(row: Record<string, unknown>) {
  const context: OrdinalLayoutContext<BobaConfig> = {
    data: [{ name: "Cup", ...row }],
    config: {},
    scales: {
      o: scaleBand<string>().domain(["Cup"]).range([0, 400]),
      r: scaleLinear(),
      projection: "vertical"
    },
    dimensions: {
      width: 400,
      height: 400,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      plot: { x: 0, y: 0, width: 400, height: 400 }
    },
    theme: { semantic: {}, categorical: [] },
    resolveColor: () => "#123456"
  }
  const result = bobaLayout(context)
  const svg = renderToStaticMarkup(<svg>{result.overlays}</svg>)
  expect(svg).not.toMatch(/NaN|Infinity/)
  expect(result.nodes).toHaveLength(1)
  const node = result.nodes![0]
  if (node.type !== "rect") throw new Error("Expected a cup hit rectangle")
  for (const coordinate of [node.x, node.y, node.w, node.h]) {
    expect(Number.isFinite(coordinate)).toBe(true)
  }
  const document = new DOMParser().parseFromString(svg, "image/svg+xml")
  expect(document.querySelector("parsererror")).toBeNull()
  return { result, document, svg, datum: result.nodes![0].datum! }
}

describe("boba geometry validation and allocation", () => {
  // Run these only with the bounded implementation: the original zero-radius
  // path has an infinite allocation loop, so reproducing it would exhaust memory.
  it.each([0, -0.6, NaN, Infinity, -Infinity])(
    "uses the default pearl radius for %s",
    (bobaRadius) => {
      const { datum, document } = layout({ bobaRadius, bobaVolume: 110 })
      expect(datum.numBobas).toBe(97)
      expect(document.querySelectorAll("circle")).toHaveLength(97)
    }
  )

  it.each([0, -10])("draws no pearls for volume %s", (bobaVolume) => {
    const { datum, document } = layout({ bobaRadius: 0, bobaVolume })
    expect(datum.numBobas).toBe(0)
    expect(document.querySelectorAll("circle")).toHaveLength(0)
  })

  it("bounds tiny-radius packing while retaining the requested quantity and disclosing truncation", () => {
    const { datum, document, svg } = layout({
      bobaRadius: 1e-6,
      bobaVolume: 110
    })
    expect(datum.numBobas).toBeGreaterThan(2000)
    expect(document.querySelectorAll("circle")).toHaveLength(2000)
    expect(datum.renderedBobas).toBe(2000)
    expect(datum.bobaVolume).toBe(110)
    expect(svg).toContain("2000 shown")
  })

  it("bounds ice and pearl allocation for large cups and amounts", () => {
    const { document, datum } = layout({
      cupHeight: 1e4,
      cupTopRadius: 1e4,
      cupBottomRadius: 1e4,
      bobaVolume: 1e12,
      iceVolume: 1e12
    })
    expect(document.querySelectorAll("circle").length).toBeLessThanOrEqual(2000)
    expect(document.querySelectorAll("rect").length).toBeLessThanOrEqual(2000)
    expect(datum.renderedIce).toBeLessThanOrEqual(2000)
    expect(datum.numIce).toBeGreaterThan(datum.renderedIce)
  })

  it.each([
    { cupHeight: 0, cupTopRadius: -2, cupBottomRadius: 0 },
    { cupHeight: 1e308, cupTopRadius: 1e308, bobaRadius: Number.MIN_VALUE },
    {
      cupHeight: Number.MIN_VALUE,
      cupTopRadius: 1e100,
      cupBottomRadius: 1e100
    },
    { teaVolume: 1e300, bobaVolume: 0, iceVolume: 0 }
  ])("keeps invalid dimensions and excessive fill finite: %j", (row) => {
    layout(row)
  })

  it("rejects overflowing total volumes before building geometry", () => {
    expect(() =>
      layout({ teaVolume: 1e308, bobaVolume: 1e308, iceVolume: 1e308 })
    ).toThrow(/finite numeric range/)
  })

  it("never draws more pearls than the computed count", () => {
    for (const count of [1, 5, 12, 20, 40, 97]) {
      const { document, datum } = layout({
        bobaVolume: count * Math.PI * 0.6 * 0.6 + 0.001
      })
      expect(datum.numBobas).toBe(count)
      expect(document.querySelectorAll("circle")).toHaveLength(count)
    }
  })

  it.each([0, -1, 1e-6])(
    "uses bounded geometry through the public server renderer for radius %s",
    (bobaRadius) => {
      const { svg, evidence } = renderChartWithEvidence("OrdinalCustomChart", {
        data: [{ name: "Cup", bobaRadius }],
        categoryAccessor: "name",
        layout: bobaLayout,
        width: 400,
        height: 400,
        title: "Boba validation"
      })
      expect(svg).not.toMatch(/NaN|Infinity/)
      expect(evidence.markCount).toBe(1)
      expect(evidence.empty).toBe(false)
      const document = new DOMParser().parseFromString(svg, "image/svg+xml")
      expect(document.querySelectorAll("circle").length).toBeGreaterThan(0)
      expect(document.querySelectorAll("circle").length).toBeLessThanOrEqual(
        2000
      )
    }
  )
})
