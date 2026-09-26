import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "./renderToStaticSVG"
import type { GeoCustomLayout } from "../stream/geoCustomLayout"
import {
  buildPredicate,
  type Selection,
  type SelectionClause
} from "../store/SelectionStore"

describe("custom layout selection in server rendering", () => {
  it("applies intersected Date and interval selections to static SVG marks", () => {
    const selection: Selection = {
      name: "dashboard",
      resolution: "crossfilter",
      clauses: new Map<string, SelectionClause>([
        [
          "range",
          {
            clientId: "range",
            type: "interval",
            fields: {
              value: { type: "interval", range: [-5, 5] }
            }
          }
        ],
        [
          "date",
          {
            clientId: "date",
            type: "point",
            fields: {
              time: { type: "point", values: new Set([new Date(0)]) }
            }
          }
        ]
      ])
    }
    const layout: GeoCustomLayout = (ctx) => ({
      nodes: ctx.points.map((datum, index) => ({
        type: "geoarea",
        pathData: `M${index * 20},0h10v10h-10Z`,
        centroid: [index * 20 + 5, 5],
        bounds: [
          [index * 20, 0],
          [index * 20 + 10, 10]
        ],
        screenArea: 100,
        datum,
        style: { fill: ctx.selection?.predicate(datum) ? "#125678" : "#888888" }
      }))
    })
    const result = renderChartWithEvidence("GeoCustomChart", {
      points: [
        { lon: 0, lat: 0, time: new Date(0), value: 0 },
        { lon: 1, lat: 1, time: new Date(1), value: 0 },
        { lon: 2, lat: 2, time: new Date(0), value: 10 },
        { lon: 3, lat: 3, time: new Date(0), value: null }
      ],
      layout,
      frameProps: {
        layoutSelection: {
          isActive: true,
          predicate: buildPredicate(selection, "geo")
        }
      }
    })
    const svg = new DOMParser().parseFromString(result.svg, "image/svg+xml")
    expect(svg.querySelectorAll('path[fill="#125678"]')).toHaveLength(1)
    expect(svg.querySelectorAll('path[fill="#888888"]')).toHaveLength(3)
    expect(result.evidence.markCount).toBe(4)
  })

  it("passes the selection into GeoCustomChart geometry and restyles its retained marks", () => {
    const layout: GeoCustomLayout = (ctx) => ({
      nodes: ctx.points.map((datum, index) => ({
        type: "geoarea",
        pathData: `M${index * 20},0h10v10h-10Z`,
        centroid: [index * 20 + 5, 5],
        bounds: [
          [index * 20, 0],
          [index * 20 + 10, 10]
        ],
        screenArea: 100,
        datum,
        style: { fill: ctx.selection?.predicate(datum) ? "#125678" : "#888888" }
      })),
      restyle: (node, selection) => ({
        opacity:
          selection?.isActive && !selection.predicate(node.datum!) ? 0.2 : 1
      })
    })
    const props = {
      points: [
        { id: "chosen", lon: 0, lat: 0 },
        { id: "other", lon: 1, lat: 1 }
      ],
      layout
    }
    const selected = renderChartWithEvidence("GeoCustomChart", {
      ...props,
      frameProps: {
        layoutSelection: {
          isActive: true,
          predicate: (datum: Record<string, unknown>) => datum.id === "chosen"
        }
      }
    })
    expect(selected.svg).toContain('fill="#125678"')
    expect(selected.svg).toContain('opacity="0.2"')
    expect(selected.evidence.markCount).toBe(
      renderChartWithEvidence("GeoCustomChart", props).evidence.markCount
    )
  })
})
