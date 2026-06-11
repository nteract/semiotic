import { describe, it, expect } from "vitest"
import { runQualityScorecard } from "./qualityScorecard"
import { CANONICAL_FIXTURES } from "./qualityFixtures"

describe("runQualityScorecard", () => {
  it("returns a report covering every fixture", () => {
    const report = runQualityScorecard(CANONICAL_FIXTURES)
    expect(report.summary.fixtureCount).toBe(CANONICAL_FIXTURES.length)
    expect(report.perFixture.length).toBe(CANONICAL_FIXTURES.length)
    expect(report.perCapability.length).toBeGreaterThan(0)
  })

  it("expert agreement rate stays above 90% across the canonical set", () => {
    // Phase 2.1 tuning landed expert agreement at 100% on 23 fixtures.
    // Below 90% means a descriptor regressed; below 80% means urgent work.
    // This gate is intentionally tight — the canonical set is curated and
    // the engine should win on all of it.
    const report = runQualityScorecard(CANONICAL_FIXTURES)
    expect(report.summary.expertAgreementRate).toBeGreaterThanOrEqual(0.9)
  })

  it("top-1 agreement rate stays above 85% across the canonical set", () => {
    // The strict metric: the engine's #1 pick is an expert pick. 2026-06
    // baseline is 92.9% (26/28) with two documented judgment-call misses
    // (BubbleChart over ConnectedScatterplot; DotPlot over Heatmap on a
    // crossed-categorical matrix). The floor sits one miss below the
    // baseline — ratchet it upward as descriptor tuning closes the gap, and
    // treat any drop below the floor as a descriptor regression, not a
    // reason to relax the gate. Always report this number next to the
    // lenient top-3 rate.
    const report = runQualityScorecard(CANONICAL_FIXTURES)
    expect(report.summary.top1AgreementRate).toBeGreaterThanOrEqual(0.85)
  })

  it("top-3 ranks distinct components, not variants of one chart", () => {
    const report = runQualityScorecard(CANONICAL_FIXTURES)
    for (const f of report.perFixture) {
      const distinct = new Set(f.topThree.map((t) => t.component))
      expect(distinct.size).toBe(f.topThree.length)
    }
  })

  it("emits per-capability tallies for every registered chart", () => {
    const report = runQualityScorecard(CANONICAL_FIXTURES)
    const names = new Set(report.perCapability.map((c) => c.component))
    expect(names.has("LineChart")).toBe(true)
    expect(names.has("BarChart")).toBe(true)
    expect(names.has("Histogram")).toBe(true)
  })

  it("ranks capabilities with zero expert agreement first", () => {
    const report = runQualityScorecard(CANONICAL_FIXTURES)
    // perCapability is sorted by expertAgreementCount ascending
    const counts = report.perCapability.map((c) => c.expertAgreementCount)
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
    }
  })

  it("doesn't crash on the sparse-data fixture", () => {
    const sparse = CANONICAL_FIXTURES.find((f) => f.name.includes("sparse"))
    expect(sparse).toBeDefined()
    if (sparse) {
      const report = runQualityScorecard([sparse])
      expect(report.perFixture[0]).toBeDefined()
    }
  })

  it("keeps agreement fields null when a descriptor crashes on a no-expectation fixture", () => {
    // A crash on a stress fixture (no `expected`) must not count as an
    // agreement miss — only expectation-bearing fixtures may move the rates.
    const throwingCapability = {
      component: "ThrowingChart",
      family: "categorical",
      importPath: "semiotic/ordinal",
      rubric: { familiarity: 3, accuracy: 3, precision: 3 },
      fits: () => {
        throw new Error("descriptor crash")
      },
      intentScores: {},
      buildProps: () => ({}),
    } as never
    const data = [{ category: "A", value: 1 }]

    const noExpectations = runQualityScorecard(
      [{ name: "crash, no expectations", data }],
      [throwingCapability]
    )
    expect(noExpectations.perFixture[0].expertAgreement).toBeNull()
    expect(noExpectations.perFixture[0].topPickAgreement).toBeNull()
    expect(noExpectations.summary.expertAgreementRate).toBe(0)
    expect(noExpectations.summary.top1AgreementRate).toBe(0)

    const withExpectations = runQualityScorecard(
      [{ name: "crash, with expectations", data, expected: ["BarChart"] }],
      [throwingCapability]
    )
    // A crash on an expectation-bearing fixture IS a miss.
    expect(withExpectations.perFixture[0].expertAgreement).toBe(false)
    expect(withExpectations.perFixture[0].topPickAgreement).toBe(false)
  })
})
