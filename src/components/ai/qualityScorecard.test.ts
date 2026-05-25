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
})
