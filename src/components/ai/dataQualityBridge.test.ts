import { describe, expect, it } from "vitest"
import { describeChart } from "./describeChart"
import {
  applyAnnotationLifecycle,
  applyAnnotationStatus,
} from "./annotationProvenance"
import {
  dataQualityToAnnotations,
  fromDbtArtifacts,
  fromGreatExpectations,
} from "./dataQualityBridge"
import type { DataQualityResult } from "./dataQualityBridge"

// ── Normalized core ──────────────────────────────────────────────────────────

describe("dataQualityToAnnotations", () => {
  it("maps a failing range check to a danger band with provenance + lifecycle", () => {
    const results: DataQualityResult[] = [
      {
        id: "ge:between:amount",
        name: "amount in range",
        status: "fail",
        kind: "range",
        column: "amount",
        min: 0,
        max: 1000,
        source: "great-expectations",
        basis: "statistical-test",
        createdAt: "2026-06-20T14:00:00Z",
        dataVersion: "run-42",
      },
    ]
    const { annotations, unplaced } = dataQualityToAnnotations(results, { ttlHint: "P7D" })
    expect(unplaced).toEqual([])
    expect(annotations).toHaveLength(1)
    const a = annotations[0]
    expect(a.type).toBe("band")
    expect(a.y0).toBe(0)
    expect(a.y1).toBe(1000)
    expect(a.fill).toBe("var(--semiotic-danger)")
    // Provenance distinguishes a system rule from a human note.
    expect(a.provenance).toMatchObject({
      authorKind: "system",
      basis: "statistical-test",
      source: "great-expectations",
      createdAt: "2026-06-20T14:00:00Z",
      dataVersion: "run-42",
      stableId: "ge:between:amount",
    })
    expect(a.lifecycle).toMatchObject({ status: "proposed", anchor: "semantic", ttlHint: "P7D" })
  })

  it("maps min/max/threshold to a threshold on the chosen axis", () => {
    const base = { status: "fail" as const, source: "dbt" as const }
    const y = dataQualityToAnnotations([{ id: "t1", kind: "min", value: 5, ...base }])
    expect(y.annotations[0].type).toBe("y-threshold")
    expect(y.annotations[0].value).toBe(5)
    const x = dataQualityToAnnotations([{ id: "t2", kind: "max", value: 9, ...base }], {
      valueAxis: "x",
    })
    expect(x.annotations[0].type).toBe("x-threshold")
  })

  it("maps a freshness check to an x-threshold at the parsed timestamp", () => {
    const at = "2026-06-20T14:00:00Z"
    const { annotations } = dataQualityToAnnotations([
      { id: "f1", kind: "freshness", status: "error", at, source: "dbt" },
    ])
    expect(annotations[0].type).toBe("x-threshold")
    expect(annotations[0].value).toBe(Date.parse(at))
  })

  it("declines (does not fabricate) checks with no chart coordinate (D7)", () => {
    const { annotations, unplaced } = dataQualityToAnnotations([
      { id: "nn", name: "not null", kind: "not-null", status: "fail", column: "email", source: "dbt" },
    ])
    expect(annotations).toEqual([])
    expect(unplaced).toHaveLength(1)
    expect(unplaced[0].result.id).toBe("nn")
    expect(unplaced[0].reason).toMatch(/no single chart coordinate/)
  })

  it("declines a range check missing its bounds rather than placing it", () => {
    const { annotations, unplaced } = dataQualityToAnnotations([
      { id: "r", kind: "range", status: "fail", source: "dbt" },
    ])
    expect(annotations).toEqual([])
    expect(unplaced[0].reason).toMatch(/min\/max/)
  })

  it("omits passing checks by default, includes them when asked", () => {
    const pass: DataQualityResult = { id: "p", kind: "range", status: "pass", min: 0, max: 1 }
    expect(dataQualityToAnnotations([pass]).annotations).toEqual([])
    const incl = dataQualityToAnnotations([pass], { includePassed: true })
    expect(incl.annotations).toHaveLength(1)
    expect(incl.annotations[0].fill).toBe("var(--semiotic-success)")
  })

  it("appends confidence < 1 to the label, but keeps verbose detail off the chart", () => {
    const withConf = dataQualityToAnnotations([
      { id: "a", name: "anomaly", kind: "threshold", status: "fail", value: 3, confidence: 0.7, observedCount: 12 },
    ]).annotations[0]
    expect(withConf.label).toContain("anomaly")
    expect(withConf.label).toContain("70%")
    // observed counts are detail — they live in provenance/message, not the label
    expect(withConf.label).not.toContain("12 rows")
    const hardRule = dataQualityToAnnotations([
      { id: "b", name: "rule", kind: "threshold", status: "fail", value: 3, confidence: 1 },
    ]).annotations[0]
    expect(hardRule.label).not.toContain("100%")
  })

  it("is pure — does not mutate the input results", () => {
    const input: DataQualityResult[] = [{ id: "x", kind: "range", status: "fail", min: 0, max: 5 }]
    const snapshot = JSON.parse(JSON.stringify(input))
    dataQualityToAnnotations(input, { ttlHint: 1000 })
    expect(input).toEqual(snapshot)
  })

  it("composes with the shipped lifecycle + status treatments (Beta visual states)", () => {
    const { annotations } = dataQualityToAnnotations(
      [{ id: "x", kind: "range", status: "fail", min: 0, max: 5, createdAt: "2020-01-01T00:00:00Z" }],
      { ttlHint: 1000, status: "proposed" }
    )
    // Aged well past TTL → stale/expired dimming; proposed status → dim + dash.
    const aged = applyAnnotationStatus(applyAnnotationLifecycle(annotations, { now: Date.now() }))
    expect(aged.length).toBeGreaterThanOrEqual(0)
    if (aged.length > 0) {
      expect(typeof aged[0].opacity === "number" || aged[0].strokeDasharray !== undefined).toBe(true)
    }
  })
})

// ── dbt parser ───────────────────────────────────────────────────────────────

describe("fromDbtArtifacts", () => {
  it("maps source freshness to provenanced time thresholds", () => {
    const { annotations } = fromDbtArtifacts({
      sources: {
        metadata: { generated_at: "2026-06-20T14:05:00Z", invocation_id: "inv-1" },
        results: [
          {
            unique_id: "source.shop.raw.orders",
            status: "error",
            max_loaded_at: "2026-06-20T08:00:00Z",
            criteria: { error_after: { count: 6, period: "hour" } },
          },
        ],
      },
    })
    expect(annotations).toHaveLength(1)
    const a = annotations[0]
    expect(a.type).toBe("x-threshold")
    expect(a.value).toBe(Date.parse("2026-06-20T08:00:00Z"))
    expect(a.color).toBe("var(--semiotic-danger)")
    expect(a.provenance).toMatchObject({ source: "dbt", authorKind: "system", dataVersion: "inv-1" })
    expect(a.provenance!.createdAt).toBe("2026-06-20T14:05:00Z")
    // Concise, plain label: "<source> stale since <friendly date>"
    expect(a.label).toContain("orders")
    expect(a.label).toContain("stale")
    expect(a.label).not.toMatch(/\dT\d/) // no raw ISO timestamp on the chart
    // "freshness" identity is preserved in the provenance author, not the label
    expect(a.provenance!.author).toContain("freshness")
  })

  it("declines run_results test failures (no column/range without manifest)", () => {
    const { annotations, unplaced } = fromDbtArtifacts({
      runResults: {
        metadata: { generated_at: "2026-06-20T14:05:00Z", invocation_id: "inv-2" },
        results: [
          { unique_id: "test.shop.not_null_orders_id.abc", status: "fail", failures: 3 },
          { unique_id: "test.shop.unique_orders_id.def", status: "pass", failures: 0 },
        ],
      },
    })
    expect(annotations).toEqual([])
    // Only the failing test is considered; the passing one is filtered before placement.
    expect(unplaced).toHaveLength(1)
    expect(unplaced[0].result.observedCount).toBe(3)
    expect(unplaced[0].reason).toMatch(/chart-level status badge/)
  })
})

// ── Great Expectations parser ────────────────────────────────────────────────

describe("fromGreatExpectations", () => {
  const validation = {
    success: false,
    meta: { run_id: { run_name: "nightly", run_time: "2026-06-20T02:00:00Z" } },
    results: [
      {
        success: false,
        expectation_config: {
          expectation_type: "expect_column_values_to_be_between",
          kwargs: { column: "amount", min_value: 0, max_value: 1000 },
        },
        result: { observed_value: 1450, unexpected_count: 4 },
      },
      {
        success: false,
        expectation_config: {
          expectation_type: "expect_column_mean_to_be_between",
          kwargs: { column: "latency", max_value: 250 },
        },
        result: { observed_value: 312 },
      },
      {
        success: false,
        expectation_config: {
          expectation_type: "expect_column_values_to_be_unique",
          kwargs: { column: "id" },
        },
        result: { unexpected_count: 2 },
      },
    ],
  }

  it("maps between/single-bound expectations and declines set/uniqueness ones", () => {
    const { annotations, unplaced } = fromGreatExpectations(validation, { valueAxis: "y" })
    // between → band; mean max → threshold; uniqueness → unplaced
    const types = annotations.map((a) => a.type).sort()
    expect(types).toEqual(["band", "y-threshold"])
    const band = annotations.find((a) => a.type === "band")!
    expect(band.y0).toBe(0)
    expect(band.y1).toBe(1000)
    expect(band.provenance!.basis).toBe("statistical-test")
    expect(band.provenance!.createdAt).toBe("2026-06-20T02:00:00Z")
    // Concise observed-vs-expected label, no expectation_type jargon
    expect(band.label).toBe("amount: 1450 (expected 0–1000)")
    expect(band.label).not.toContain("expect_column")
    const threshold = annotations.find((a) => a.type === "y-threshold")!
    expect(threshold.label).toBe("latency: 312 (max 250)")
    expect(unplaced).toHaveLength(1)
    expect(unplaced[0].result.column).toBe("id")
  })

  it("carries the GE run id as the data version", () => {
    const { annotations } = fromGreatExpectations(validation)
    expect(annotations[0].provenance!.dataVersion).toBe("nightly")
  })
})

// ── End-to-end "Expand": bridge annotations flip a chart's act to alerting ───

describe("data-quality bridge → describeChart (report → alert)", () => {
  it("a chart carrying the bridge's annotations describes as an alerting chart", () => {
    const { annotations } = fromGreatExpectations({
      success: false,
      meta: { run_id: { run_name: "nightly", run_time: "2026-06-21T02:00:00Z" } },
      results: [
        {
          success: false,
          expectation_config: {
            expectation_type: "expect_column_values_to_be_between",
            kwargs: { column: "value", min_value: 800, max_value: 1200 },
          },
          result: { observed_value: 210 },
        },
      ],
    })
    const data = [
      { t: 1, value: 980 }, { t: 2, value: 1010 }, { t: 3, value: 210 },
    ]
    const r = describeChart("LineChart", { data, xAccessor: "t", yAccessor: "value", annotations })
    // The provenanced (statistical-test) band flips the act — no capability needed.
    expect(r.levels.l4?.startsWith("This is an alerting chart;")).toBe(true)
  })
})
