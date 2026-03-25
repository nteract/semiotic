/**
 * Integration tests verifying HOC data transformation for chart patterns.
 * Mocks StreamXYFrame to capture the props the HOCs generate.
 */
import React from "react"
import { render } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"

// Capture props passed to StreamXYFrame
let capturedProps: Record<string, any> = {}

// Mock StreamXYFrame to capture props
vi.mock("../../stream/StreamXYFrame", () => ({
  __esModule: true,
  default: React.forwardRef((props: any, _ref: any) => {
    capturedProps = props
    return React.createElement("div", { "data-testid": "mock-frame" })
  })
}))

// Mock useResponsiveSize to avoid ResizeObserver issues in jsdom
vi.mock("../../stream/useResponsiveSize", () => ({
  useResponsiveSize: () => [800, 400]
}))

import { LineChart } from "./LineChart"
import { StackedAreaChart } from "./StackedAreaChart"
import { MultiAxisLineChart } from "./MultiAxisLineChart"

// ── Sample data mimicking chart shapes ────────────────────────────────

const processedData = [
  { x: "2003-01-06T00:00:00Z", value: 72, metricLabel: "valueA" },
  { x: "2003-01-07T00:00:00Z", value: 75, metricLabel: "valueA" },
  { x: "2003-01-08T00:00:00Z", value: 74, metricLabel: "valueA" },
  { x: "2003-01-06T00:00:00Z", value: 78, metricLabel: "valueB" },
  { x: "2003-01-07T00:00:00Z", value: 76, metricLabel: "valueB" },
  { x: "2003-01-08T00:00:00Z", value: 77, metricLabel: "valueB" }
]

const multiAxisRows = Array.from({ length: 10 }, (_, i) => ({
  x: new Date(2003, 0, 6 + i).toISOString(),
  requests: 50 + i * 10,
  latencyMs: 3000 + i * 350
}))

const CHART_COLORS = ["#9E8FFF", "#FF6BBC", "#30CBD5"]

beforeEach(() => {
  capturedProps = {}
})

describe("LineChart HOC → StreamXYFrame prop verification", () => {
  it("passes flat data with correct accessors to StreamXYFrame", () => {
    render(
      React.createElement(LineChart, {
        data: processedData,
        xAccessor: (d: any) => new Date(d.x),
        yAccessor: "value",
        lineBy: "metricLabel",
        colorBy: "metricLabel",
        colorScheme: CHART_COLORS,
        width: 600,
        height: 400
      })
    )

    // StreamXYFrame should have received props
    expect(capturedProps.chartType).toBe("line")
    expect(capturedProps.data).toBeDefined()
    expect(capturedProps.data.length).toBe(6) // all 6 points flattened
    expect(capturedProps.xAccessor).toBeDefined()
    expect(capturedProps.yAccessor).toBe("value")
    expect(capturedProps.groupAccessor).toBe("metricLabel")

    // Every data point should have metricLabel
    for (const d of capturedProps.data) {
      expect(d.metricLabel).toBeDefined()
      expect(["valueA", "valueB"]).toContain(d.metricLabel)
    }

    // lineStyle should return valid stroke for each group
    if (typeof capturedProps.lineStyle === "function") {
      const styleA = capturedProps.lineStyle(
        { x: "2003-01-06T00:00:00Z", value: 72, metricLabel: "valueA" },
        "valueA"
      )
      expect(styleA.stroke).toBeTruthy()
      expect(styleA.stroke).not.toBe("none")
      expect(styleA.strokeWidth).toBeGreaterThan(0)
    }
  })

  it("xAccessor returns Date objects that are valid", () => {
    render(
      React.createElement(LineChart, {
        data: processedData,
        xAccessor: (d: any) => new Date(d.x),
        yAccessor: "value",
        lineBy: "metricLabel",
        width: 600,
        height: 400
      })
    )

    const { xAccessor, data } = capturedProps
    expect(typeof xAccessor).toBe("function")

    // xAccessor applied to data should produce valid Date objects
    for (const d of data) {
      const result = xAccessor(d)
      expect(result instanceof Date).toBe(true)
      expect(isNaN(result.getTime())).toBe(false)
    }

    // +Date should produce valid epoch ms
    for (const d of data) {
      const epochMs = +xAccessor(d)
      expect(Number.isFinite(epochMs)).toBe(true)
      expect(epochMs).toBeGreaterThan(0)
    }
  })
})

describe("StackedAreaChart HOC → StreamXYFrame prop verification", () => {
  it("passes correct data and groupAccessor", () => {
    render(
      React.createElement(StackedAreaChart, {
        data: processedData,
        xAccessor: (d: any) => new Date(d.x),
        yAccessor: "value",
        areaBy: "metricLabel",
        colorBy: "metricLabel",
        colorScheme: CHART_COLORS,
        width: 600,
        height: 400
      })
    )

    expect(capturedProps.chartType).toBe("stackedarea")
    expect(capturedProps.data).toBeDefined()
    expect(capturedProps.data.length).toBe(6)
    expect(capturedProps.groupAccessor).toBe("metricLabel")

    // Every point should have metricLabel (not undefined)
    for (const d of capturedProps.data) {
      expect(d.metricLabel).toBeDefined()
      expect(d.metricLabel).not.toBe("undefined")
      expect(["valueA", "valueB"]).toContain(d.metricLabel)
    }
  })

  it("does not include undefined group values", () => {
    render(
      React.createElement(StackedAreaChart, {
        data: processedData,
        xAccessor: (d: any) => new Date(d.x),
        yAccessor: "value",
        areaBy: "metricLabel",
        colorBy: "metricLabel",
        width: 600,
        height: 400
      })
    )

    const groups = new Set(capturedProps.data.map((d: any) => d.metricLabel))
    expect(groups.has(undefined)).toBe(false)
    expect(groups.has("undefined")).toBe(false)
    expect(groups.size).toBe(2)
  })
})

describe("MultiAxisLineChart HOC → StreamXYFrame prop verification", () => {
  it("passes unitized data with yExtent=[0,1]", () => {
    render(
      React.createElement(MultiAxisLineChart, {
        data: multiAxisRows,
        xAccessor: (d: any) => new Date(d.x),
        series: [
          { yAccessor: "requests", label: "requests" },
          { yAccessor: "latencyMs", label: "latencyMs" }
        ],
        colorScheme: CHART_COLORS,
        width: 800,
        height: 400
      })
    )

    expect(capturedProps.chartType).toBe("line")
    expect(capturedProps.yAccessor).toBe("__ma_unitized")
    expect(capturedProps.groupAccessor).toBe("__ma_series")
    expect(capturedProps.yExtent).toEqual([0, 1])

    // Data should be unitized — all __ma_unitized values in [0,1]
    for (const d of capturedProps.data) {
      expect(d.__ma_unitized).toBeGreaterThanOrEqual(0)
      expect(d.__ma_unitized).toBeLessThanOrEqual(1)
    }

    // Should have both series
    const series = new Set(capturedProps.data.map((d: any) => d.__ma_series))
    expect(series.has("requests")).toBe(true)
    expect(series.has("latencyMs")).toBe(true)
  })

  it("passes axes config with tickFormat that inverts unitization", () => {
    render(
      React.createElement(MultiAxisLineChart, {
        data: multiAxisRows,
        xAccessor: (d: any) => new Date(d.x),
        series: [
          { yAccessor: "requests", label: "requests" },
          { yAccessor: "latencyMs", label: "latencyMs" }
        ],
        width: 800,
        height: 400
      })
    )

    expect(capturedProps.axes).toBeDefined()
    expect(capturedProps.axes.length).toBeGreaterThanOrEqual(2)

    const leftAxis = capturedProps.axes.find((a: any) => a.orient === "left")
    const rightAxis = capturedProps.axes.find((a: any) => a.orient === "right")

    expect(leftAxis).toBeDefined()
    expect(rightAxis).toBeDefined()
    expect(typeof leftAxis.tickFormat).toBe("function")
    expect(typeof rightAxis.tickFormat).toBe("function")

    // tickFormat at 0 and 1 should return valid numbers (original scale bounds)
    const leftAt0 = leftAxis.tickFormat(0)
    const leftAt1 = leftAxis.tickFormat(1)
    expect(leftAt0).toBeTruthy()
    expect(leftAt1).toBeTruthy()
    // The values should be different (spanning original range)
    expect(leftAt0).not.toBe(leftAt1)
  })
})
