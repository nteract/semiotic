import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "./renderToStaticSVG"

const points = [
  { id: "A", lon: 0, lat: 0, value: 5, group: "first" },
  { id: "B", lon: 5, lat: 5, value: 10, group: "second" }
]
const areas = [
  {
    type: "Feature",
    properties: { value: 3 },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0]
        ]
      ]
    }
  },
  {
    type: "Feature",
    properties: { value: 7 },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [2, 0],
          [2, 1],
          [3, 1],
          [3, 0],
          [2, 0]
        ]
      ]
    }
  }
]

function sparse<T>(rows: T[]) {
  const result = new Array<T | null | undefined>(1)
  result.push(null, ...rows, undefined)
  return result
}

describe("server accessor preprocessing with sparse geographic data", () => {
  it.each(["ProportionalSymbolMap", "DistanceCartogram"] as const)(
    "%s filters points before color and size accessors",
    (component) => {
      const props = {
        center: "A",
        costAccessor: "value",
        sizeBy: (row: (typeof points)[number]) => row.value,
        colorBy: (row: (typeof points)[number]) => row.group,
        showLegend: true
      }
      const clean = renderChartWithEvidence(component, { ...props, points })
      const rendered = renderChartWithEvidence(component, {
        ...props,
        points: sparse(points)
      })
      expect(rendered.evidence.status).toBe("ok")
      expect(rendered.evidence.markCount).toBe(clean.evidence.markCount)
      expect(rendered.evidence.sceneHash).toBe(clean.evidence.sceneHash)
    }
  )

  it("ChoroplethMap filters areas before reading the color and legend domain", () => {
    const props = {
      valueAccessor: (feature: (typeof areas)[number]) =>
        feature.properties.value,
      showLegend: true
    }
    const clean = renderChartWithEvidence("ChoroplethMap", { ...props, areas })
    const rendered = renderChartWithEvidence("ChoroplethMap", {
      ...props,
      areas: sparse(areas)
    })
    expect(rendered.evidence.status).toBe("ok")
    expect(rendered.evidence.markCount).toBe(2)
    expect(rendered.evidence.sceneHash).toBe(clean.evidence.sceneHash)
  })

  it("FlowMap filters nodes before resolving coordinates", () => {
    const flows = [{ source: "A", target: "B", value: 4 }]
    const props = {
      xAccessor: (row: (typeof points)[number]) => row.lon,
      yAccessor: (row: (typeof points)[number]) => row.lat
    }
    const clean = renderChartWithEvidence("FlowMap", {
      ...props,
      nodes: points,
      flows
    })
    const rendered = renderChartWithEvidence("FlowMap", {
      ...props,
      nodes: sparse(points),
      flows: sparse(flows)
    })
    expect(rendered.evidence.status).toBe("ok")
    expect(rendered.evidence.markCount).toBe(clean.evidence.markCount)
    expect(rendered.evidence.sceneHash).toBe(clean.evidence.sceneHash)
  })
})
