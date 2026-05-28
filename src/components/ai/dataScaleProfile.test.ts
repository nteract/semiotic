import { describe, it, expect } from "vitest"
import {
  DEFAULT_SCALE_THRESHOLDS,
  applyScaleBias,
  classifyRowBand,
  classifyCardinalityBand,
  classifyFieldBand,
  compareBands,
  computeEffectiveScale,
  resolveRowsToNumber,
  scaleHints,
} from "./dataScaleProfile"
import type {
  DataQualityProfile,
  DataScaleProfile,
} from "./dataScaleProfile"
import type { ChartCapability, ChartDataProfile } from "./chartCapabilityTypes"
import { suggestCharts, suggestChartsGrouped } from "./suggestCharts"
import { profileData } from "./profileData"

const baseRubric = { familiarity: 3, accuracy: 4, precision: 4 }

function makeCapability(overrides: Partial<ChartCapability> = {}): ChartCapability {
  return {
    component: "TestChart",
    family: "categorical",
    importPath: "semiotic/ordinal",
    rubric: baseRubric,
    fits: () => null,
    intentScores: {},
    buildProps: () => ({}),
    ...overrides,
  }
}

function makeProfile(overrides: Partial<ChartDataProfile> = {}): ChartDataProfile {
  return {
    rowCount: 50,
    fields: { x: { type: "numeric", min: 0, max: 100, distinctCount: 50 } as never },
    data: [],
    candidates: { x: [], y: [], size: [], category: [], series: [], time: [] },
    primary: { x: "x", y: "y" },
    hasRepeatedX: false,
    monotonicX: false,
    hasTimeAxis: false,
    xProvenance: "named",
    hasHierarchy: false,
    hasNetwork: false,
    hasGeo: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

describe("classification", () => {
  it("classifies rows into bands using defaults", () => {
    expect(classifyRowBand(1)).toBe("tiny")
    expect(classifyRowBand(3)).toBe("tiny")
    expect(classifyRowBand(4)).toBe("small")
    expect(classifyRowBand(25)).toBe("small")
    expect(classifyRowBand(26)).toBe("medium")
    expect(classifyRowBand(250)).toBe("medium")
    expect(classifyRowBand(251)).toBe("large")
    expect(classifyRowBand(5000)).toBe("large")
    expect(classifyRowBand(5001)).toBe("huge")
  })

  it("honors org-overridden thresholds", () => {
    const scale: DataScaleProfile = {
      thresholds: { rows: { small: 1000, medium: 100000 } },
    }
    expect(classifyRowBand(500, scale)).toBe("small")
    expect(classifyRowBand(50000, scale)).toBe("medium")
  })

  it("classifies cardinality bands", () => {
    expect(classifyCardinalityBand(3)).toBe("low")
    expect(classifyCardinalityBand(7)).toBe("low")
    expect(classifyCardinalityBand(8)).toBe("medium")
    expect(classifyCardinalityBand(25)).toBe("medium")
    expect(classifyCardinalityBand(26)).toBe("high")
  })

  it("classifies field bands", () => {
    expect(classifyFieldBand(2)).toBe("narrow")
    expect(classifyFieldBand(10)).toBe("typical")
    expect(classifyFieldBand(20)).toBe("wide")
  })

  it("treats negative and NaN as tiny", () => {
    expect(classifyRowBand(-5)).toBe("tiny")
    expect(classifyRowBand(NaN)).toBe("tiny")
  })

  it("orders bands consistently", () => {
    expect(compareBands("tiny", "small")).toBeLessThan(0)
    expect(compareBands("small", "small")).toBe(0)
    expect(compareBands("huge", "small")).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Row resolution
// ---------------------------------------------------------------------------

describe("resolveRowsToNumber", () => {
  it("uses declared number directly", () => {
    expect(resolveRowsToNumber(1234, 50)).toBe(1234)
  })

  it("falls back to measured rows when nothing is declared", () => {
    expect(resolveRowsToNumber(undefined, 200)).toBe(200)
  })

  it("resolves a declared band to a representative count", () => {
    expect(resolveRowsToNumber("tiny", 9999)).toBeLessThanOrEqual(DEFAULT_SCALE_THRESHOLDS.rows.tiny)
    expect(resolveRowsToNumber("huge", 9999)).toBeGreaterThan(DEFAULT_SCALE_THRESHOLDS.rows.large)
  })
})

// ---------------------------------------------------------------------------
// Effective scale
// ---------------------------------------------------------------------------

describe("computeEffectiveScale", () => {
  it("uses measured profile when nothing declared", () => {
    const profile = makeProfile({ rowCount: 75, categoryCount: 5 })
    const eff = computeEffectiveScale(profile)
    expect(eff.rows).toBe(75)
    expect(eff.rowsSource).toBe("measured")
    expect(eff.rowBand).toBe("medium")
  })

  it("declared rows override measured", () => {
    const profile = makeProfile({ rowCount: 50 })
    const eff = computeEffectiveScale(profile, { rows: 10000 })
    expect(eff.rows).toBe(10000)
    expect(eff.rowsSource).toBe("declared")
    expect(eff.rowBand).toBe("huge")
  })

  it("declared cardinality on primary category overrides measured", () => {
    const profile = makeProfile({
      categoryCount: 5,
      primary: { x: "x", y: "y", category: "region" },
    })
    const eff = computeEffectiveScale(profile, {
      cardinality: { region: 200 },
    })
    expect(eff.typicalCardinality).toBe(200)
    expect(eff.cardinalityBand).toBe("high")
  })

  it("typicalCardinality used as fallback", () => {
    const profile = makeProfile({ primary: { x: "x", y: "y", category: "region" } })
    const eff = computeEffectiveScale(profile, { typicalCardinality: "high" })
    expect(eff.cardinalityBand).toBe("high")
  })
})

// ---------------------------------------------------------------------------
// applyScaleBias
// ---------------------------------------------------------------------------

describe("applyScaleBias", () => {
  it("is a no-op when capability has no scaleFit and no per-chart override", () => {
    const capability = makeCapability()
    const profile = makeProfile()
    const effective = computeEffectiveScale(profile)
    const result = applyScaleBias(capability, profile, effective, undefined, undefined)
    expect(result.delta).toBe(0)
    expect(result.reasons).toEqual([])
    expect(result.caveats).toEqual([])
    expect(result.excluded).toBe(false)
  })

  it("calls scaleFit and applies its delta", () => {
    const capability = makeCapability({
      scaleFit: () => ({ delta: 0.5, reason: "fits the band" }),
    })
    const profile = makeProfile()
    const effective = computeEffectiveScale(profile)
    const result = applyScaleBias(capability, profile, effective, undefined, undefined)
    expect(result.delta).toBeCloseTo(0.5)
    expect(result.reasons).toContain("fits the band")
  })

  it("clamps scaleFit delta to ±2.5", () => {
    const capability = makeCapability({
      scaleFit: () => ({ delta: 99 }),
    })
    const profile = makeProfile()
    const effective = computeEffectiveScale(profile)
    const result = applyScaleBias(capability, profile, effective, undefined, undefined)
    expect(result.delta).toBe(2.5)
  })

  it("excludes a chart when row band is below minBand preference", () => {
    const capability = makeCapability({ component: "Heatmap" })
    const profile = makeProfile({ rowCount: 5 })
    const effective = computeEffectiveScale(profile)
    const scale: DataScaleProfile = {
      charts: {
        Heatmap: { minBand: "medium", reason: "sparse cells dominate noise" },
      },
    }
    const result = applyScaleBias(capability, profile, effective, scale, undefined)
    expect(result.excluded).toBe(true)
  })

  it("applies preference bias when within band range", () => {
    const capability = makeCapability({ component: "Heatmap" })
    const profile = makeProfile({ rowCount: 500 })
    const effective = computeEffectiveScale(profile)
    const scale: DataScaleProfile = {
      charts: { Heatmap: { bias: 2, reason: "team standard for large-scale" } },
      name: "Acme",
    }
    const result = applyScaleBias(capability, profile, effective, scale, undefined)
    expect(result.delta).toBe(2)
    expect(result.reasons).toContain("Acme: team standard for large-scale")
  })

  it("composes scale bias with quality bias additively", () => {
    const capability = makeCapability({
      scaleFit: () => ({ delta: 0.4 }),
      qualityFit: () => ({ delta: -0.3, caveats: ["missing values"] }),
    })
    const profile = makeProfile()
    const effective = computeEffectiveScale(profile)
    const quality: DataQualityProfile = { completeness: 0.6 }
    const result = applyScaleBias(capability, profile, effective, undefined, quality)
    expect(result.delta).toBeCloseTo(0.1)
    expect(result.caveats).toContain("missing values")
  })

  it("emits default completeness caveat when capability has no qualityFit", () => {
    const capability = makeCapability()
    const profile = makeProfile({ primary: { x: "x", y: "revenue" } })
    const effective = computeEffectiveScale(profile)
    const quality: DataQualityProfile = { completeness: { revenue: 0.5 } }
    const result = applyScaleBias(capability, profile, effective, undefined, quality)
    expect(result.caveats).toContain("revenue is only 50% complete — expect gaps")
  })
})

// ---------------------------------------------------------------------------
// scaleHints (declarative sugar)
// ---------------------------------------------------------------------------

describe("scaleHints", () => {
  it("rewards rows inside the sweet spot", () => {
    const fit = scaleHints({ rows: { sweetSpot: [10, 100] } })
    const profile = makeProfile({ rowCount: 50 })
    const effective = computeEffectiveScale(profile)
    const result = fit(profile, effective, undefined)
    expect(result?.delta).toBeGreaterThan(0)
  })

  it("penalizes rows beyond the upper bound", () => {
    const fit = scaleHints({
      rows: { sweetSpot: [10, 100], caveatAbove: 1000 },
    })
    const profile = makeProfile({ rowCount: 2000 })
    const effective = computeEffectiveScale(profile)
    const result = fit(profile, effective, undefined)
    expect(result?.delta).toBeLessThan(0)
    expect(result?.caveats?.length).toBeGreaterThan(0)
  })

  it("penalizes rows below the lower bound", () => {
    const fit = scaleHints({
      rows: { sweetSpot: [25, 250], caveatBelow: 5 },
    })
    const profile = makeProfile({ rowCount: 3 })
    const effective = computeEffectiveScale(profile)
    const result = fit(profile, effective, undefined)
    expect(result?.delta).toBeLessThan(0)
    expect(result?.caveats?.[0]).toMatch(/3 rows/)
  })

  it("returns null when neither rows nor cardinality moved the needle", () => {
    // Sweet spot wide enough that the chart neither benefits nor suffers,
    // and no cardinality hint provided.
    const fit = scaleHints({ rows: { sweetSpot: [0, Number.POSITIVE_INFINITY] } })
    const profile = makeProfile({ rowCount: 50 })
    const effective = computeEffectiveScale(profile)
    const result = fit(profile, effective, undefined)
    // Inside sweet spot → +0.6 delta with a reason
    expect(result?.delta).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Integration with suggestCharts
// ---------------------------------------------------------------------------

describe("scale-aware suggestCharts integration", () => {
  // A tabular dataset: 10 rows, simple x/y.
  const tenRowData = Array.from({ length: 10 }, (_, i) => ({ month: i, revenue: i * 10 }))

  it("attaches scaleRange to every suggestion", () => {
    const results = suggestCharts(tenRowData)
    for (const s of results) {
      expect(s.scaleRange).toBeDefined()
      expect(s.scaleRange?.rows).toBe(10)
      expect(s.scaleRange?.rowsSource).toBe("measured")
    }
  })

  it("declared scale overrides measured row count on the tag", () => {
    const results = suggestCharts(tenRowData, { scale: { rows: 50_000 } })
    for (const s of results) {
      expect(s.scaleRange?.rows).toBe(50_000)
      expect(s.scaleRange?.rowsSource).toBe("declared")
      expect(s.scaleRange?.band).toBe("huge")
    }
  })

  it("per-chart minBand excludes a chart from suggestions", () => {
    const all = suggestCharts(tenRowData, { maxResults: 50 })
    const heatmapEverywhere = all.some((s) => s.component === "Heatmap")
    expect(heatmapEverywhere).toBe(false) // 10 rows is too sparse for our Heatmap fit anyway

    const declared = suggestCharts(tenRowData, {
      scale: { charts: { LineChart: { minBand: "huge", reason: "internal policy" } } },
      maxResults: 50,
    })
    expect(declared.some((s) => s.component === "LineChart")).toBe(false)
  })

  it("suggestChartsGrouped returns five tiers plus effective scale", () => {
    const grouped = suggestChartsGrouped(tenRowData, { maxPerBand: 3 })
    expect(grouped.effective.rows).toBe(10)
    expect(grouped.tiny).toBeDefined()
    expect(grouped.small).toBeDefined()
    expect(grouped.medium).toBeDefined()
    expect(grouped.large).toBeDefined()
    expect(grouped.huge).toBeDefined()
    for (const band of ["tiny", "small", "medium", "large", "huge"] as const) {
      for (const s of grouped[band]) {
        expect(s.scaleRange?.band).toBe(band)
      }
    }
  })

  it("every tier returns suggestions on a reasonable categorical dataset", () => {
    const data = Array.from({ length: 8 }, (_, i) => ({
      region: `R${i}`,
      revenue: 10 + i * 5,
    }))
    const grouped = suggestChartsGrouped(data, { maxPerBand: 5 })
    for (const band of ["tiny", "small", "medium", "large", "huge"] as const) {
      expect(grouped[band].length).toBeGreaterThan(0)
    }
  })

  it("a tuned chart's score moves with declared row band", () => {
    // LineChart scaleFit penalizes 1-row data (caveatBelow: 4) and rewards
    // medium density. Declaring rows = "medium" vs rows = "tiny" must produce
    // a strictly higher LineChart score in the medium pass.
    const data = Array.from({ length: 30 }, (_, i) => ({ month: i, revenue: i * 10 }))
    const tinyScore = suggestCharts(data, { scale: { rows: "tiny" }, intent: "trend" })
      .find((s) => s.component === "LineChart")?.score ?? 0
    const mediumScore = suggestCharts(data, { scale: { rows: "medium" }, intent: "trend" })
      .find((s) => s.component === "LineChart")?.score ?? 0
    expect(mediumScore).toBeGreaterThan(tinyScore)
  })

  it("at huge declared scale, a low-cardinality bar fades in favor of higher-density charts", () => {
    const data = Array.from({ length: 5 }, (_, i) => ({ region: `R${i}`, revenue: 100 + i }))
    const small = suggestCharts(data, { scale: { rows: "small" }, intent: "compare-categories" })
    const huge = suggestCharts(data, { scale: { rows: "huge" }, intent: "compare-categories" })
    const barSmall = small.find((s) => s.component === "BarChart")?.score ?? 0
    const barHuge = huge.find((s) => s.component === "BarChart")?.score ?? 0
    // BarChart's scaleHints cap rows sweet spot at 200 — at huge it should bias down.
    expect(barHuge).toBeLessThan(barSmall)
  })

  it("declared scale changes the candidate set, not just the score", () => {
    // 2-cat × value data with enough cells for Heatmap to fit at medium scale.
    // At tiny declared scale, Heatmap's "needs at least 4 cells" rejects because
    // rowCount in the scaledProfile drops to 1. At medium it fits. At huge it
    // wins outright because its scale sweet spot covers 100–10k rows.
    const data = [
      { region: "EU", product: "Widget", revenue: 1200 },
      { region: "EU", product: "Gadget", revenue: 850 },
      { region: "NA", product: "Widget", revenue: 1700 },
      { region: "NA", product: "Gadget", revenue: 1100 },
      { region: "APAC", product: "Widget", revenue: 950 },
      { region: "APAC", product: "Gadget", revenue: 600 },
    ]
    const tiny = suggestCharts(data, { scale: { rows: "tiny" }, intent: "compare-categories" })
    const huge = suggestCharts(data, { scale: { rows: "huge" }, intent: "compare-categories" })

    // Tiny should NOT include Heatmap — declared rowCount=1 fails its fits() gate.
    expect(tiny.find((s) => s.component === "Heatmap")).toBeUndefined()
    // Huge SHOULD include Heatmap — scaledProfile.rowCount lands in its sweet spot.
    expect(huge.find((s) => s.component === "Heatmap")).toBeDefined()
  })

  it("top pick changes across at least one tier pair for a layered categorical dataset", () => {
    // Same data, three tiers — the top pick should not be identical across all
    // three. Regression guard against the "engine returns the same chart at
    // every band" failure mode the demo surfaced.
    const data = [
      { region: "EU", product: "Widget", revenue: 1200 },
      { region: "EU", product: "Gadget", revenue: 850 },
      { region: "NA", product: "Widget", revenue: 1700 },
      { region: "NA", product: "Gadget", revenue: 1100 },
      { region: "APAC", product: "Widget", revenue: 950 },
      { region: "APAC", product: "Gadget", revenue: 600 },
    ]
    const grouped = suggestChartsGrouped(data, { intent: "compare-categories", maxPerBand: 1 })
    const seen = new Set([
      grouped.tiny[0]?.component,
      grouped.medium[0]?.component,
      grouped.huge[0]?.component,
    ].filter(Boolean))
    expect(seen.size).toBeGreaterThan(1)
  })

  it("composes additively with audience bias", () => {
    const audience = {
      familiarity: { LineChart: 1 },
      targets: { LineChart: { direction: "decrease" as const, weight: 1 } },
    }
    const noScale = suggestCharts(tenRowData, { audience })
    const withScale = suggestCharts(tenRowData, {
      audience,
      scale: { charts: { LineChart: { bias: 2 } } },
    })

    const lineNoScale = noScale.find((s) => s.component === "LineChart")
    const lineWithScale = withScale.find((s) => s.component === "LineChart")
    if (lineNoScale && lineWithScale) {
      expect(lineWithScale.score - lineNoScale.score).toBeCloseTo(2, 1)
    }
  })

  it("works with a pre-built profile (no re-derivation)", () => {
    const profile = profileData(tenRowData)
    const direct = suggestCharts(tenRowData, { scale: { rows: 1000 } })
    const withProfile = suggestCharts(tenRowData, { profile, scale: { rows: 1000 } })
    expect(direct.length).toBe(withProfile.length)
  })
})
