import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "./renderToStaticSVG"
import type { GeoCustomLayout } from "../stream/geoCustomLayout"

describe("custom layout selection in server rendering", () => {
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
