import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { scaleLinear } from "d3-scale"
import { describe, expect, it } from "vitest"
import type { AnnotationContext } from "../../realtime/types"
import { createDefaultAnnotationRules } from "./annotationRules"
import { renderStaticAnnotationFallback } from "../../server/staticAnnotationFallbacks"
import {
  ANOMALY_FIELD,
  SEGMENT_FIELD,
  buildAnomalyOverlay,
  buildForecast,
  markAnomalies,
} from "./statisticalOverlays"
import * as lazyFields from "./statisticalOverlaysLazy"
import { prepareLineSeriesForSsr } from "./lineSeriesSsr"
import type { Datum } from "./datumTypes"

// One spike at x = 17 on a gentle wave.
const wave: Datum[] = Array.from({ length: 40 }, (_, x) => ({
  x,
  y: 50 + Math.sin(x / 3) * 3 + (x === 17 ? 20 : 0),
}))

const boundaryOf = (annotations: Datum[]) =>
  annotations.filter((annotation) => annotation.type === "x-threshold")

describe("forecast boundary options", () => {
  it("keeps today's boundary by default", () => {
    const { annotations } = buildForecast(wave, "x", "y", { trainEnd: 20, steps: 5 })
    expect(boundaryOf(annotations)).toEqual([
      {
        type: "x-threshold",
        x: 20,
        color: "#94a3b8",
        strokeWidth: 1,
        strokeDasharray: "4,2",
        label: "Train / Forecast",
      },
    ])
  })

  it("restyles and relabels the boundary", () => {
    const { annotations } = buildForecast(wave, "x", "y", {
      trainEnd: 20,
      steps: 5,
      boundaryColor: "#123456",
      boundaryDasharray: "2 6",
      boundaryLabel: "Model fit ends",
      boundaryLabelColor: "#202020",
      boundaryLabelBackground: { type: "box", fill: "#fefefe" },
    })
    expect(boundaryOf(annotations)).toEqual([
      expect.objectContaining({
        color: "#123456",
        strokeDasharray: "2 6",
        label: "Model fit ends",
        labelColor: "#202020",
        labelBackground: { type: "box", fill: "#fefefe" },
      }),
    ])
  })

  it.each([false, ""] as const)("draws the line without a label for boundaryLabel %j", (boundaryLabel) => {
    const { annotations } = buildForecast(wave, "x", "y", { trainEnd: 20, steps: 5, boundaryLabel })
    const [boundary] = boundaryOf(annotations)
    expect(boundary.x).toBe(20)
    expect(boundary.label).toBeUndefined()
  })

  it("omits the boundary with showBoundary: false and keeps the envelope", () => {
    const { annotations } = buildForecast(wave, "x", "y", { trainEnd: 20, steps: 5, showBoundary: false })
    expect(boundaryOf(annotations)).toEqual([])
    expect(annotations.map((annotation) => annotation.type)).toContain("envelope")
  })

  it("draws one configured boundary for grouped series", () => {
    const grouped = [
      ...wave.map((row) => ({ ...row, series: "A" })),
      ...wave.map((row) => ({ ...row, y: (row.y as number) * 2, series: "B" })),
    ]
    const { annotations } = buildForecast(grouped, "x", "y", {
      trainEnd: 20,
      steps: 5,
      boundaryColor: "#123456",
      _groupBy: "series",
    })
    expect(boundaryOf(annotations)).toEqual([expect.objectContaining({ color: "#123456" })])
  })
})

const context: AnnotationContext = {
  frameType: "xy",
  xAccessor: "x",
  yAccessor: "y",
  width: 500,
  height: 200,
  scales: {
    x: scaleLinear().domain([0, 50]).range([0, 500]),
    y: scaleLinear().domain([0, 200]).range([0, 200]),
  },
}

const circleCenters = (node: React.ReactNode) =>
  [...renderToStaticMarkup(<svg>{node}</svg>).matchAll(/<circle[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"/g)]
    .map(([, cx, cy]) => [Number(cx), Number(cy)])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])

const markedCenters = (rows: Datum[], filter?: (row: Datum) => boolean) =>
  rows
    .filter((row) => row[ANOMALY_FIELD] === true && (!filter || filter(row)))
    .map((row) => [Number(row.x) * 10, Number(row.y)])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])

for (const [path, render] of [
  ["browser", createDefaultAnnotationRules("xy")],
  ["server", renderStaticAnnotationFallback],
] as const) {
  describe(`${path} anomaly dots and the row mark`, () => {
    const cases: Array<[string, () => { processedData: Datum[]; annotations: Datum[] }]> = [
      ["anomaly alone", () => buildAnomalyOverlay(wave, "y", { threshold: 2 })],
      ...(["zero", "break", "interpolate"] as const).map((gapStrategy): [string, () => { processedData: Datum[]; annotations: Datum[] }] => [
        `post-${gapStrategy} rows`,
        () => {
          const data: Datum[] = gapStrategy === "zero"
            ? [10, 10, 10, 10, null].map((y, x) => ({ x, y }))
            : [...[0, 0, 0, 0, 10].map((y, x) => ({ x, y })), { x: null, y: 1000 }]
          const result = prepareLineSeriesForSsr({ data, gapStrategy, anomaly: { threshold: 1.5 } })
          expect(result.data.filter((row) => row[ANOMALY_FIELD]).map((row) => row.x)).toEqual([4])
          return { processedData: result.data, annotations: result.annotations }
        },
      ]),
      ["a computed forecast", () => buildForecast(wave, "x", "y", { trainEnd: 30, steps: 8 }, { threshold: 2 })],
      [
        "a pre-computed forecast",
        () =>
          buildForecast(
            wave.map((row) => ({ ...row, isTraining: (row.x as number) < 20 })),
            "x",
            "y",
            { isTraining: "isTraining", trainUnderline: true },
            { threshold: 1.5 },
          ),
      ],
      [
        "grouped series",
        () =>
          buildForecast(
            [
              ...wave.map((row) => ({ ...row, series: "A" })),
              ...wave.map((row) => ({ ...row, y: 120 + (row.x === 5 ? -30 : 0), series: "B" })),
            ],
            "x",
            "y",
            { trainEnd: 30, steps: 4, _groupBy: "series" },
            { threshold: 2 },
          ),
      ],
    ]

    it.each(cases)("marks exactly the rows drawn as dots with %s", (_, build) => {
      const { processedData, annotations } = build()
      const bands = annotations.filter((annotation) => annotation.type === "anomaly-band")
      expect(bands.length).toBeGreaterThan(0)
      const drawn = bands
        .flatMap((band, index) => circleCenters(render(band, index, { ...context, data: processedData })))
        .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      expect(drawn.length).toBeGreaterThan(0)
      expect(markedCenters(processedData)).toEqual(drawn)
    })
  })
}

describe("markAnomalies", () => {
  it("copies only the flagged rows and leaves the input untouched", () => {
    const marked = markAnomalies(wave, "y", { threshold: 2 })
    expect(marked.filter((row) => row[ANOMALY_FIELD] === true).map((row) => row.x)).toEqual([17])
    marked.forEach((row, index) => {
      if (index === 17) expect(row).not.toBe(wave[index])
      else expect(row).toBe(wave[index])
    })
    expect(wave.some((row) => ANOMALY_FIELD in row)).toBe(false)
  })

  it("reads strings and Dates as the band does, and never flags a missing value", () => {
    const rows: Datum[] = ["0", 0, 0, 0, "10", null, "", Infinity].map((y, x) => ({ x, y }))
    expect(markAnomalies(rows, "y", { threshold: 1 }).filter((row) => row[ANOMALY_FIELD]).map((row) => row.x))
      .toEqual([4])
  })

  it("marks nothing with fewer than two values", () => {
    const rows: Datum[] = [{ x: 0, y: 5 }]
    expect(markAnomalies(rows, "y", {})).toBe(rows)
  })

  it("marks the server rows the static chart draws", () => {
    const series = prepareLineSeriesForSsr({ data: wave, anomaly: { threshold: 2 } })
    expect(series.data.filter((row) => row[ANOMALY_FIELD] === true).map((row) => row.x)).toEqual([17])
  })
})

describe("exported row fields", () => {
  it("match the fields the overlay pipeline writes", () => {
    expect(lazyFields.SEGMENT_FIELD).toBe(SEGMENT_FIELD)
    expect(lazyFields.ANOMALY_FIELD).toBe(ANOMALY_FIELD)
    const series = prepareLineSeriesForSsr({
      data: wave,
      xAccessor: (row) => row.x,
      yAccessor: (row) => row.y,
      forecast: { trainEnd: 30, steps: 2 },
    })
    const forecastRow = series.data.find((row) => row[SEGMENT_FIELD] === "forecast" && row.__forecastUpper != null)!
    expect(series.xAccessor).toBe(lazyFields.RESOLVED_X_FIELD)
    expect(series.yAccessor).toBe(lazyFields.RESOLVED_Y_FIELD)
    expect(typeof forecastRow[lazyFields.RESOLVED_X_FIELD]).toBe("number")
    expect(typeof forecastRow[lazyFields.RESOLVED_Y_FIELD]).toBe("number")
  })
})
