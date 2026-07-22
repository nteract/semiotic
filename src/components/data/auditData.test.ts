import { afterEach, describe, expect, it } from "vitest"
import {
  auditData,
  formatDataAudit,
  profileNumericFields,
  toDataAuditNotifications,
} from "./auditData"
import {
  registerChartCapability,
  unregisterChartCapability,
} from "../ai/chartCapabilities"
import type { ChartCapability } from "../ai/chartCapabilityTypes"
import type { Datum } from "../charts/shared/datumTypes"

function codes(result: ReturnType<typeof auditData>): string[] {
  return result.diagnoses.map((item) => item.code)
}

describe("auditData", () => {
  afterEach(() => {
    unregisterChartCapability("RiskDial")
  })

  it("accepts a clean line dataset and reports the contracts it checked", () => {
    const result = auditData("LineChart", {
      data: [
        { month: 1, revenue: 12 },
        { month: 2, revenue: 18 },
        { month: 3, revenue: 15 },
      ],
      xAccessor: "month",
      yAccessor: "revenue",
    })

    expect(result.ok).toBe(true)
    expect(result.diagnoses).toEqual([])
    expect(result.summary.fieldsChecked).toBe(2)
    expect(result.contracts).toEqual([
      expect.objectContaining({ role: "x", accessor: "month", domain: true }),
      expect.objectContaining({ role: "y", accessor: "revenue", domain: true }),
    ])
  })

  it("finds non-finite values anywhere in the full dataset and bounds row evidence", () => {
    const data = Array.from({ length: 30 }, (_, index) => ({
      x: index + 1,
      y: index >= 20 && index < 27 ? Number.POSITIVE_INFINITY : index,
    }))
    const result = auditData("LineChart", {
      data,
      xAccessor: "x",
      yAccessor: "y",
    })
    const finding = result.diagnoses.find((item) => item.code === "NON_FINITE_VALUE")

    expect(result.ok).toBe(false)
    expect(finding).toMatchObject({
      field: "y",
      role: "y",
      count: 7,
      rows: [20, 21, 22, 23, 24],
    })
  })

  it("distinguishes a partially non-numeric accessor from an entirely degenerate one", () => {
    const partial = auditData("BarChart", {
      data: [
        { category: "A", amount: 10 },
        { category: "B", amount: "customer-17" },
      ],
      valueAccessor: "amount",
    })
    expect(codes(partial)).toContain("NON_NUMERIC_VALUE")
    expect(codes(partial)).not.toContain("DEGENERATE_EXTENT")

    const degenerate = auditData("BarChart", {
      data: [
        { category: "A", amount: "customer-17" },
        { category: "B", amount: undefined },
      ],
      valueAccessor: "amount",
    })
    expect(codes(degenerate)).toEqual(["DEGENERATE_EXTENT"])
    expect(degenerate.ok).toBe(false)
  })

  it("preserves null line gaps for gapStrategy/diagnoseConfig instead of calling them non-numeric", () => {
    const result = auditData("LineChart", {
      data: [
        { x: 1, y: 10 },
        { x: 2, y: null },
        { x: 3, y: 30 },
      ],
      xAccessor: "x",
      yAccessor: "y",
    })
    expect(result.diagnoses).toEqual([])
  })

  it("flags zero-span and single-row domains without treating them as hard failures", () => {
    const flat = auditData("LineChart", {
      data: [
        { x: 1, y: 10 },
        { x: 1, y: 20 },
      ],
      xAccessor: "x",
      yAccessor: "y",
    })
    expect(codes(flat)).toContain("ZERO_SPAN_DOMAIN")
    expect(flat.ok).toBe(true)

    const single = auditData("LineChart", {
      data: [{ x: 1, y: 10 }],
      xAccessor: "x",
      yAccessor: "y",
    })
    expect(codes(single)).toEqual(["SINGLE_ROW_DOMAIN"])
    expect(single.ok).toBe(true)
  })

  it("accepts non-positive linear values but rejects them on a log scale", () => {
    const props = {
      data: [
        { x: 1, y: 10 },
        { x: 2, y: 0 },
        { x: 3, y: -2 },
      ],
      xAccessor: "x",
      yAccessor: "y",
    }
    expect(codes(auditData("LineChart", props))).not.toContain("LOG_NON_POSITIVE")

    const log = auditData("LineChart", { ...props, yScaleType: "log" })
    expect(log.diagnoses.find((item) => item.code === "LOG_NON_POSITIVE")).toMatchObject({
      rows: [1, 2],
      count: 2,
      severity: "error",
    })

    const explicitlyPositiveLinear = auditData(
      "CustomPositiveAxis",
      {
        data: [{ x: 0 }, { x: 1 }],
        xAccessor: "x",
      },
      undefined,
      {
        contracts: {
          fields: [
            {
              role: "x",
              accessor: "xAccessor",
              requirements: ["positive"],
            },
          ],
        },
      },
    )
    expect(codes(explicitlyPositiveLinear)).toContain("NON_POSITIVE_VALUE")
    expect(codes(explicitlyPositiveLinear)).not.toContain("LOG_NON_POSITIVE")
  })

  it("supports function accessors and rejects negative size geometry", () => {
    const result = auditData("BubbleChart", {
      data: [
        { a: 1, b: 2, radius: 9 },
        { a: 2, b: 4, radius: -3 },
      ],
      xAccessor: (datum: Datum) => datum.a,
      yAccessor: (datum: Datum) => datum.b,
      sizeBy: (datum: Datum) => datum.radius,
    })

    expect(result.diagnoses.find((item) => item.code === "NEGATIVE_SIZE")).toMatchObject({
      role: "size",
      rows: [1],
      count: 1,
    })
  })

  it("checks edge weights in network collections", () => {
    const result = auditData("SankeyDiagram", {
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [
        { source: "A", target: "B", amount: 4 },
        { source: "B", target: "A", amount: -2 },
      ],
      valueAccessor: "amount",
    })

    expect(result.rowCount).toBe(2)
    expect(result.diagnoses.find((item) => item.code === "NEGATIVE_VALUE")).toMatchObject({
      field: "amount",
      rows: [1],
    })

    const unweighted = auditData("SankeyDiagram", {
      edges: [
        { source: "A", target: "B" },
        { source: "B", target: "C", value: null },
      ],
    })
    expect(unweighted.diagnoses).toEqual([])
  })

  it("detects zero-sum and mixed-sign normalized groups", () => {
    const result = auditData("StackedAreaChart", {
      data: [
        { x: 1, y: 5, series: "A" },
        { x: 1, y: -5, series: "B" },
        { x: 2, y: 3, series: "A" },
        { x: 2, y: 7, series: "B" },
      ],
      xAccessor: "x",
      yAccessor: "y",
      areaBy: "series",
      normalize: true,
    })

    expect(codes(result)).toEqual(
      expect.arrayContaining(["ZERO_NORMALIZED_TOTAL", "MIXED_SIGN_NORMALIZATION"]),
    )
    expect(result.ok).toBe(false)
  })

  it("requires a positive total for part-to-whole data", () => {
    const result = auditData("PieChart", {
      data: [
        { category: "A", value: 0 },
        { category: "B", value: 0 },
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
    })
    expect(codes(result)).toContain("NON_POSITIVE_TOTAL")
  })

  it("warns when an extreme value is likely to collapse the visible domain", () => {
    const result = auditData("LineChart", {
      data: [1, 1, 1, 1, 1, 1, 1, 1000].map((y, x) => ({ x, y })),
      xAccessor: "x",
      yAccessor: "y",
    })
    const finding = result.diagnoses.find(
      (item) => item.code === "OUTLIER_DOMINATED_DOMAIN",
    )
    expect(finding).toMatchObject({ field: "y", rows: [7], count: 1 })

    expect(
      codes(
        auditData(
          "LineChart",
          {
            data: [1, 1, 1, 1, 1, 1, 1, 1000].map((y, x) => ({ x, y })),
            xAccessor: "x",
            yAccessor: "y",
          },
          undefined,
          { checkOutliers: false },
        ),
      ),
    ).not.toContain("OUTLIER_DOMINATED_DOMAIN")
  })

  it("accepts numeric strings and date strings for a time scale", () => {
    const result = auditData("LineChart", {
      data: [
        { date: "2026-01-01", value: ".5" },
        { date: "2026-01-02", value: "+11." },
      ],
      xAccessor: "date",
      yAccessor: "value",
      xScaleType: "time",
    })
    expect(result.diagnoses).toEqual([])
  })

  it("matches the renderer's automatic Date detection without an explicit time scale", () => {
    const dates = auditData("LineChart", {
      data: [
        { x: new Date("2026-01-01"), y: 10 },
        { x: new Date("2026-01-02"), y: 12 },
      ],
      xAccessor: "x",
      yAccessor: "y",
    })
    const dateStrings = auditData("LineChart", {
      data: [
        { x: "2026-01-01", y: 10 },
        { x: "2026-01-02", y: 12 },
      ],
      xAccessor: "x",
      yAccessor: "y",
    })
    expect(dates.diagnoses).toEqual([])
    expect(dateStrings.diagnoses).toEqual([])

    const differenceDates = auditData("DifferenceChart", {
      data: [
        { x: new Date("2026-01-01"), a: 1, b: 2 },
        { x: new Date("2026-01-02"), a: 2, b: 3 },
      ],
    })
    expect(differenceDates.diagnoses).toEqual([])

    const unsupportedDifferenceStrings = auditData("DifferenceChart", {
      data: [
        { x: "2026-01-01", a: 1, b: 2 },
        { x: "2026-01-02", a: 2, b: 3 },
      ],
    })
    expect(codes(unsupportedDifferenceStrings)).toContain("DEGENERATE_EXTENT")
  })

  it("audits documented line-object coordinates instead of series metadata", () => {
    const result = auditData("LineChart", {
      data: [
        {
          label: "A",
          points: [
            { when: 1, value: 10 },
            { when: 2, value: Number.POSITIVE_INFINITY },
          ],
        },
      ],
      lineDataAccessor: "points",
      xAccessor: "when",
      yAccessor: "value",
    })
    expect(result.rowCount).toBe(2)
    expect(result.diagnoses.find((item) => item.code === "NON_FINITE_VALUE"))
      .toMatchObject({ field: "value", rows: [1] })
    expect(codes(result)).not.toContain("DEGENERATE_EXTENT")
  })

  it("checks built-in default and optional numeric channels", () => {
    const candles = auditData("CandlestickChart", {
      data: [
        { x: 1, high: 4, low: 1 },
        { x: 2, high: Number.POSITIVE_INFINITY, low: 2 },
      ],
    })
    expect(candles.diagnoses.find((item) => item.code === "NON_FINITE_VALUE"))
      .toMatchObject({ field: "high" })

    const rangeCandle = auditData("CandlestickChart", {
      data: [
        { x: 1, high: 4, low: 1, open: Number.NaN },
        { x: 2, high: 5, low: 2, open: Number.NaN },
      ],
      openAccessor: "open",
    })
    expect(rangeCandle.diagnoses).toEqual([])

    const difference = auditData("DifferenceChart", {
      data: [
        { x: 1, a: 2, b: 3 },
        { x: 2, a: 4, b: Number.NaN },
      ],
    })
    expect(difference.diagnoses.find((item) => item.code === "NON_FINITE_VALUE"))
      .toMatchObject({ field: "b" })

    const parallelConstants = auditData("DifferenceChart", {
      data: [
        { x: 1, a: 10, b: 5 },
        { x: 2, a: 10, b: 5 },
      ],
    })
    expect(codes(parallelConstants)).not.toContain("ZERO_SPAN_DOMAIN")

    const heatmap = auditData("Heatmap", {
      data: [
        { x: "A", y: "Q1", value: 2 },
        { x: "B", y: "Q2", value: Number.POSITIVE_INFINITY },
      ],
    })
    expect(heatmap.diagnoses.find((item) => item.code === "NON_FINITE_VALUE"))
      .toMatchObject({ field: "value" })
    expect(heatmap.diagnoses.filter((item) => item.field === "x" || item.field === "y"))
      .toEqual([])

    const scatter = auditData("Scatterplot", {
      data: [
        { x: 1, y: 2, size: 3 },
        { x: 2, y: 3, size: -1 },
      ],
      sizeBy: "size",
    })
    expect(codes(scatter)).toContain("NEGATIVE_SIZE")

    const map = auditData("ProportionalSymbolMap", {
      points: [
        { lon: -122.4, lat: 37.8, population: 10 },
        { lon: -73.9, lat: Number.NaN, population: 12 },
      ],
      sizeBy: "population",
    })
    expect(map.diagnoses.find((item) => item.code === "NON_FINITE_VALUE"))
      .toMatchObject({ field: "lat", role: "y", rows: [1] })
  })

  it("distinguishes intentional line gaps from missing required magnitudes", () => {
    const line = auditData("LineChart", {
      data: [{ x: 1, y: 2 }, { x: 2, y: null }, { x: 3, y: 4 }],
    })
    expect(codes(line)).not.toContain("MISSING_NUMERIC_VALUE")

    const bubble = auditData("BubbleChart", {
      data: [{ x: 1, y: 2, size: 3 }, { x: 2, y: 4, size: null }],
      sizeBy: "size",
    })
    expect(bubble.diagnoses.find((item) => item.code === "MISSING_NUMERIC_VALUE"))
      .toMatchObject({ field: "size", rows: [1], count: 1 })

    const pie = auditData("PieChart", {
      data: [{ category: "A", value: 2 }, { category: "B", value: null }],
    })
    expect(codes(pie)).toContain("MISSING_NUMERIC_VALUE")
  })

  it("rejects negative normalized contributions, including all-negative groups", () => {
    const result = auditData("StackedAreaChart", {
      data: [
        { x: 1, y: -2 },
        { x: 1, y: -3 },
      ],
      normalize: true,
    })
    expect(result.diagnoses.find((item) => item.code === "NEGATIVE_NORMALIZED_VALUE"))
      .toMatchObject({ rows: [0, 1], count: 2, severity: "error" })
  })

  it("reports explicitly empty sources but permits an omitted push-mode source", () => {
    const empty = auditData("LineChart", { data: [] })
    expect(empty).toMatchObject({ ok: false, rowCount: 0 })
    expect(empty.diagnoses).toEqual([
      expect.objectContaining({ code: "EMPTY_DATA", domain: "data" }),
    ])

    expect(auditData("LineChart", {}).diagnoses).toEqual([])

    const emptySeries = auditData("LineChart", {
      data: [{ label: "A", coordinates: [] }],
    })
    expect(emptySeries.diagnoses).toEqual([
      expect.objectContaining({
        code: "EMPTY_DATA",
        message: expect.stringContaining("data.coordinates"),
      }),
    ])
  })

  it("honors numeric contracts registered by a third-party capability", () => {
    const capability: ChartCapability = {
      component: "RiskDial",
      family: "custom",
      importPath: "semiotic/ai",
      rubric: { familiarity: 1, accuracy: 3, precision: 3 },
      numericContracts: {
        fields: [
          {
            role: "opacity",
            accessor: "riskAccessor",
            requirements: ["finite", "unit-interval"],
          },
        ],
      },
      fits: () => null,
      intentScores: {},
      buildProps: () => ({}),
    }
    registerChartCapability(capability)

    const result = auditData("RiskDial", {
      data: [{ risk: 0.4 }, { risk: 1.4 }],
      riskAccessor: "risk",
    })
    expect(codes(result)).toContain("OUTSIDE_UNIT_INTERVAL")

    unregisterChartCapability("RiskDial")
    expect(
      auditData("RiskDial", {
        data: [{ risk: 1.4 }],
        riskAccessor: "risk",
      }).summary.fieldsChecked,
    ).toBe(0)
  })

  it("profiles invalid and missing numeric candidates instead of discarding them", () => {
    const profile = profileNumericFields([
      { value: 1 },
      { value: "2" },
      { value: Number.NaN },
      { value: "bad" },
      {},
    ])
    expect(profile.value).toMatchObject({
      observedCount: 4,
      finiteCount: 2,
      missingCount: 1,
      nonFiniteCount: 1,
      nonNumericCount: 1,
      min: 1,
      max: 2,
    })
  })

  it("formats reports and maps them to bounded ChartContainer notifications", () => {
    const result = auditData("BubbleChart", {
      data: [
        { x: 1, y: 1, size: -1 },
        { x: 1, y: 2, size: Number.NaN },
      ],
      xAccessor: "x",
      yAccessor: "y",
      sizeBy: "size",
    })
    expect(formatDataAudit(result)).toContain("numeric hazards found")
    expect(formatDataAudit(result)).toContain("NEGATIVE_SIZE")

    const notifications = toDataAuditNotifications(result, { max: 1 })
    expect(notifications).toHaveLength(2)
    expect(notifications[0]).toMatchObject({
      id: expect.stringMatching(/^data-audit:/),
      source: "Semiotic data audit",
    })
    expect(notifications[1].id).toBe("data-audit:overflow:chart")
  })

  it("falls back to the default max when given a non-finite max", () => {
    const result = auditData("BubbleChart", {
      data: [
        { x: 1, y: 1, size: -1 },
        { x: 1, y: 2, size: Number.NaN },
      ],
      xAccessor: "x",
      yAccessor: "y",
      sizeBy: "size",
    })
    const notifications = toDataAuditNotifications(result, { max: Number.NaN })
    expect(notifications).toHaveLength(3)
    expect(notifications.some((item) => item.id === "data-audit:overflow:chart")).toBe(false)
  })

  it("gives repeated code/field findings distinct deterministic notification ids", () => {
    const result = auditData("LineChart", {
      data: [{ value: 3 }, { value: 3 }],
      xAccessor: "value",
      yAccessor: "value",
    })
    const notifications = toDataAuditNotifications(result)
    expect(notifications).toHaveLength(2)
    expect(new Set(notifications.map((item) => item.id)).size).toBe(2)
    expect(notifications.map((item) => item.id)).toEqual(
      toDataAuditNotifications(result).map((item) => item.id),
    )
  })
})
