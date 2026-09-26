import { afterEach, describe, expect, it, vi } from "vitest"
import { renderChartWithEvidence } from "./renderToStaticSVG"

const charts = [
  {
    component: "LineChart",
    props: {
      data: [
        { x: 0, y: 1 },
        { x: 1, y: 2 }
      ]
    }
  },
  { component: "BarChart", props: { data: [{ category: "A", value: 2 }] } },
  {
    component: "SankeyDiagram",
    props: { edges: [{ source: "a", target: "b", value: 2 }] }
  },
  {
    component: "ChoroplethMap",
    props: {
      areas: [
        {
          type: "Feature",
          properties: { value: 2 },
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
        }
      ],
      valueAccessor: "value"
    }
  },
  {
    component: "CollisionSwarmChart",
    props: { data: [{ id: "a", x: 2 }], xAccessor: "x" }
  }
]

describe("static plot bounds", () => {
  it.each(charts)(
    "$component keeps small renders finite and nonnegative",
    ({ component, props }) => {
      for (const [width, height, plotWidth, plotHeight] of [
        [1, 1, 1, 1],
        [30, 20, 1, 1],
        [300, 20, 200, 1],
        [30, 200, 1, 100],
        [600, 300, 500, 200]
      ]) {
        const { svg, evidence } = renderChartWithEvidence(component, {
          ...props,
          width,
          height,
          showLegend: false,
          margin: { top: 50, right: 50, bottom: 50, left: 50 }
        })
        const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
        expect(doc.querySelector("parsererror")).toBeNull()
        expect(svg).not.toMatch(/NaN|Infinity/)
        for (const node of doc.querySelectorAll(
          "[width], [height], [r], [rx], [ry]"
        )) {
          for (const attr of ["width", "height", "r", "rx", "ry"]) {
            const value = node.getAttribute(attr)
            if (value !== null && !value.endsWith("%")) {
              expect(
                Number(value),
                `${node.tagName}.${attr}`
              ).toBeGreaterThanOrEqual(0)
            }
          }
        }
        expect(evidence.width).toBe(width)
        expect(evidence.height).toBe(height)
        expect(evidence.markCount).toBeGreaterThan(0)
        if (component !== "CollisionSwarmChart") {
          expect(evidence.plot?.width).toBe(plotWidth)
          expect(evidence.plot?.height).toBe(plotHeight)
        }
      }
    }
  )
})

describe("empty temporal snapshots", () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(["LineChart", "AreaChart", "Scatterplot", "RealtimeLineChart"])(
    "%s renders the same domain, ticks, and evidence at different wall-clock times",
    (component) => {
      const props = { data: [], xScaleType: "time", width: 600, height: 300 }
      const now = vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2025, 0, 1))
      const first = renderChartWithEvidence(component, props)
      now.mockReturnValue(Date.UTC(2026, 8, 25))
      const second = renderChartWithEvidence(component, props)
      expect(first.evidence.empty).toBe(true)
      expect(first.evidence.xDomain).toEqual([0, 86400000])
      expect(second.evidence).toEqual(first.evidence)
      expect(second.svg).toBe(first.svg)
    }
  )
})
