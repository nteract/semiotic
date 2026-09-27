import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { scaleBand, scaleLinear } from "d3-scale"
import { describe, expect, it } from "vitest"
import type { AnnotationContext } from "../../realtime/types"
import { createDefaultAnnotationRules } from "./annotationRules"
import { renderStaticAnnotationFallback } from "../../server/staticAnnotationFallbacks"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { buildForecast, SEGMENT_FIELD } from "./statisticalOverlays"
import { loess } from "./loess"
import {
  linearRegression,
  polynomialRegression
} from "./leastSquaresRegression"
import type { Datum } from "./datumTypes"

const epoch = Date.UTC(2026, 0, 1),
  day = 86400000
const context: AnnotationContext = {
  frameType: "xy",
  xAccessor: "x",
  yAccessor: "y",
  width: 400,
  height: 200,
  scales: {
    x: scaleLinear().domain([0, 10]).range([0, 10]),
    y: scaleLinear().domain([0, 200]).range([0, 200])
  }
}
function pointsOf(node: React.ReactNode): number[][] {
  const svg = renderToStaticMarkup(<svg>{node}</svg>)
  expect(svg).not.toMatch(/NaN|Infinity/)
  return svg
    .match(/points="([^"]+)"/)![1]
    .split(" ")
    .map((p) => p.split(",").map(Number))
}

for (const [name, render] of [
  ["browser", createDefaultAnnotationRules("xy")],
  ["server", renderStaticAnnotationFallback]
] as const) {
  describe(`${name} statistical annotations`, () => {
    it.each(["linear", "polynomial", "loess"])(
      "fits %s Date trends and filters missing/malformed rows",
      (method) => {
        const data = Array.from({ length: 5 }, (_, i) => ({
          x: new Date(epoch + i * day),
          y: 10 + 5 * i
        }))
        const rows: Datum[] = [
          ...data,
          { x: null, y: 4 },
          { x: new Date(NaN), y: 7 },
          { x: epoch, y: "" },
          { x: epoch, y: Infinity }
        ]
        const ctx = {
          ...context,
          data: rows,
          scales: {
            ...context.scales,
            x: scaleLinear()
              .domain([epoch, epoch + 4 * day])
              .range([0, 4])
          }
        }
        const points = pointsOf(
          render({ type: "trend", method, bandwidth: 1 }, 0, ctx)
        )
        expect(points).toHaveLength(5)
        points.forEach(([x, y], i) => {
          expect(x).toBeCloseTo(i, 8)
          expect(y).toBeCloseTo(10 + 5 * i, 8)
        })
      }
    )

    it("extrapolates a timestamp quadratic in fitted coordinates", () => {
      const data = Array.from({ length: 5 }, (_, i) => ({
        x: epoch + i * day,
        y: 2 * i * i + 3 * i + 4
      }))
      const ctx = {
        ...context,
        data,
        scales: {
          ...context.scales,
          x: scaleLinear()
            .domain([epoch, epoch + 6 * day])
            .range([0, 6])
        }
      }
      const points = pointsOf(
        render({ type: "forecast", method: "polynomial", steps: 2 }, 0, ctx)
      )
      expect(points).toHaveLength(3)
      points.forEach(([x, y], i) => {
        expect(x).toBeCloseTo(i + 4, 8)
        expect(y).toBeCloseTo([48, 69, 94][i], 8)
      })
    })

    it.each(["vertical", "horizontal"] as const)(
      "fits ordinal trends in displayed %s order",
      (projection) => {
        const o = scaleBand<string>().domain(["C", "A", "B"]).range([0, 300])
        const center = ((key: string) =>
          o(key)! + o.bandwidth() / 2) as unknown as NonNullable<
          NonNullable<AnnotationContext["scales"]>["x"]
        >
        const value = scaleLinear().domain([0, 100]).range([0, 100])
        const ctx: AnnotationContext = {
          ...context,
          frameType: "ordinal",
          projection,
          data: [
            { x: "A", y: 20 },
            { x: "B", y: 10 },
            { x: "C", y: 30 }
          ],
          scales: {
            o,
            x: projection === "horizontal" ? value : center,
            y: projection === "horizontal" ? center : value
          }
        }
        const points = pointsOf(render({ type: "trend" }, 0, ctx))
        expect(points).toHaveLength(3)
        points.forEach((point, i) =>
          expect(point).toEqual(
            projection === "horizontal"
              ? [30 - 10 * i, 50 + 100 * i]
              : [50 + 100 * i, 30 - 10 * i]
          )
        )
      }
    )

    it("computes anomaly bands from finite numeric observations in the selected series", () => {
      const values = ["0", 0, 0, 0, "10", null, "", Infinity]
      const data = values.map((y, x) => ({ x, y, series: "selected" }))
      data.push({ x: 9, y: 1000, series: "other" })
      const result = render(
        {
          type: "anomaly-band",
          threshold: 1,
          filter: (d: Datum) => d.series === "selected"
        },
        0,
        { ...context, data }
      )
      const svg = renderToStaticMarkup(<svg>{result}</svg>)
      expect(svg).not.toMatch(/NaN|Infinity/)
      expect(svg).toContain('y="-2"')
      expect(svg).toContain('height="8"')
      expect(svg.match(/<circle/g)).toHaveLength(1)
      expect(svg).toContain('cy="10"')
    })

    it("does not emit singular polynomial or zero-step forecast geometry", () => {
      const ctx = {
        ...context,
        data: [
          { x: 2, y: 1 },
          { x: 2, y: 4 },
          { x: 2, y: 7 }
        ]
      }
      expect(
        render({ type: "forecast", method: "polynomial" }, 0, ctx)
      ).toBeNull()
      expect(render({ type: "trend", method: "polynomial" }, 0, ctx)).toBeNull()
      expect(
        render({ type: "forecast", steps: 0 }, 0, {
          ...ctx,
          data: [
            { x: 1, y: 1 },
            { x: 2, y: 4 },
            { x: 3, y: 7 }
          ]
        })
      ).toBeNull()
    })
  })
}

describe("statistical related surfaces", () => {
  it("LOESS is invariant to timestamp translation and small x scaling", () => {
    const data: [number, number][] = Array.from({ length: 12 }, (_, x) => [
      x,
      x * x + Math.sin(x)
    ])
    const expected = loess(data, 0.7)
    for (const [origin, scale] of [
      [epoch, day],
      [0, 1e-9]
    ]) {
      loess(
        data.map(([x, y]) => [origin + scale * x, y]),
        0.7
      ).forEach(([, y], i) => expect(y).toBeCloseTo(expected[i][1], 8))
    }
  })

  it("declines invalid fits without manufacturing finite-looking observations", () => {
    expect(
      linearRegression([
        [null, 3],
        [1, ""],
        [2, NaN]
      ]).points
    ).toEqual([])
    for (const order of [-1, 1.5, Infinity, 10])
      expect(
        polynomialRegression(
          [
            [0, 1],
            [1, 2]
          ],
          order
        ).points
      ).toEqual([])
  })

  it.each(["field", "callback"])(
    "forecasts each series independently with a %s grouping accessor",
    (kind) => {
      const rows = Array.from({ length: 5 }, (_, x) => [
        { series: "up", x, y: 10 + 2 * x },
        { series: "down", x, y: 100 - 3 * x }
      ])
        .flat()
        .reverse()
      const snapshot = JSON.stringify(rows)
      const groupBy = kind === "field" ? "series" : (d: Datum) => d.series
      const result = buildForecast(rows, "x", "y", {
        trainEnd: 3,
        steps: 2,
        _groupBy: groupBy
      })
      for (const series of ["up", "down"]) {
        const future = result.processedData.filter(
          (d) => d.series === series && d.__forecastUpper != null
        )
        expect(future).toHaveLength(2)
        future.forEach((d, i) => {
          expect(d.x).toBe(i + 5)
          expect(d.y).toBeCloseTo(
            series === "up" ? 10 + 2 * d.x : 100 - 3 * d.x,
            10
          )
        })
        const bridge = result.processedData.filter(
          (d) =>
            d.series === series &&
            d[SEGMENT_FIELD] === "forecast" &&
            d.__forecastUpper == null
        )
        expect(bridge).toHaveLength(1)
        expect(bridge[0].x).toBe(4)
      }
      const envelopes = result.annotations.filter(
        (ann) => ann.type === "envelope"
      )
      expect(envelopes).toHaveLength(2)
      for (const envelope of envelopes) {
        const selected = result.processedData.filter((d) =>
          envelope.filter({ ...d })
        )
        expect(new Set(selected.map((d) => d.series)).size).toBe(1)
      }
      expect(
        result.annotations.filter((ann) => ann.type === "x-threshold")
      ).toHaveLength(1)
      expect(JSON.stringify(rows)).toBe(snapshot)
    }
  )

  it("honors LOESS method and bandwidth through auto forecasting", () => {
    const rows = Array.from({ length: 10 }, (_, x) => ({ x, y: x * x }))
    const forecast = (method: "linear" | "loess", bandwidth: number) =>
      buildForecast(rows, "x", "y", {
        trainEnd: 9,
        steps: 2,
        method,
        bandwidth
      }).processedData.filter((d) => d.__forecastUpper != null)
    const local = forecast("loess", 0.2)
    expect(local.map((d) => d.y)).toEqual([98, 115]) // continue the last smoothed secant: 17 per step
    expect(local[0].y).not.toBeCloseTo(forecast("linear", 1)[0].y, 4)
    expect(local[0].y).not.toBeCloseTo(forecast("loess", 1)[0].y, 4)
  })

  it.each(["LineChart", "AreaChart", "Scatterplot", "ConnectedScatterplot"])(
    "renders a correct timestamp trend through public %s static config",
    (component) => {
      const data = Array.from({ length: 5 }, (_, i) => ({
        x: epoch + i * day,
        y: 10 + 5 * i
      }))
      const { svg, evidence } = renderChartWithEvidence(component, {
        data,
        xAccessor: "x",
        yAccessor: "y",
        xScaleType: "time",
        ...(component === "LineChart" || component === "AreaChart"
          ? { annotations: [{ type: "trend" }] }
          : { regression: true }),
        width: 400,
        height: 240,
        margin: { left: 0, right: 0, top: 0, bottom: 0 },
        xExtent: [epoch, epoch + 4 * day],
        yExtent: [0, 40],
        title: "Daily growth",
        description: "Five measurements increasing from 10 to 30."
      })
      expect(evidence.empty).toBe(false)
      expect(evidence.unrenderedAnnotationCount).toBe(0)
      const points = svg
        .match(/<polyline[^>]*points="([^"]+)"/)![1]
        .split(" ")
        .map((p) => p.split(",").map(Number))
      expect(points).toHaveLength(5)
      points.forEach(([x, y], i) => {
        expect(x).toBeCloseTo(i * 100, 6)
        expect(y).toBeCloseTo(
          evidence.plot!.height * (1 - (10 + 5 * i) / 40),
          6
        )
      })
    }
  )
})
