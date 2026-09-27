// @vitest-environment node
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { BarChart } from "semiotic/ordinal"
import { renderChartWithEvidence } from "semiotic/server"
import type { Datum } from "../charts/shared/datumTypes"

const data = [
  { region: "A", amount: 20 },
  { region: "B", amount: 10 },
  { region: "C", amount: 30 }
]
function points(svg: string) {
  expect(svg).not.toMatch(/NaN|Infinity/)
  const line = svg.match(/<polyline[^>]*points="([^"]+)"/)
  expect(line).not.toBeNull()
  return line![1].split(" ").map((point) => point.split(",").map(Number))
}

describe("ordinal trends through public React and static renderers (#1363)", () => {
  for (const orientation of ["vertical", "horizontal"] as const) {
    for (const callback of [false, true]) {
      it.each(["linear", "polynomial", "loess"] as const)(
        `${orientation} ${callback ? "callback" : "field"} %s trends follow category centers`,
        (method) => {
          const props = {
            data,
            orientation,
            categoryAccessor: callback ? (d: Datum) => d.region : "region",
            valueAccessor: callback ? (d: Datum) => d.amount : "amount",
            sort: "desc" as const,
            valueExtent: [0, 40] as [number, number],
            regression: { method, bandwidth: 1 },
            width: 400,
            height: 240,
            margin: { left: 0, right: 0, top: 0, bottom: 0 },
            showAxes: false,
            showLegend: false,
            frameProps: { barPadding: 0 }
          }
          const rendered = renderChartWithEvidence("BarChart", props)
          expect(rendered.evidence.markCount).toBe(3)
          expect(rendered.evidence.unrenderedAnnotationCount).toBe(0)
          const hocPoints = points(
            renderToStaticMarkup(<BarChart<Datum> {...props} />)
          )
          const staticPoints = points(rendered.svg)
          expect(staticPoints).toEqual(hocPoints)
          expect(staticPoints).toHaveLength(3)
          staticPoints.forEach(([x, y], i) => {
            const amount = 30 - 10 * i
            expect(x).toBeCloseTo(
              orientation === "horizontal"
                ? (400 * amount) / 40
                : (400 * (i + 0.5)) / 3,
              6
            )
            expect(y).toBeCloseTo(
              orientation === "horizontal"
                ? (240 * (i + 0.5)) / 3
                : 240 * (1 - amount / 40),
              6
            )
          })
        }
      )
    }
  }
})
