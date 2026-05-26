import type { Datum } from "../charts/shared/datumTypes"
import { getCapabilities } from "./chartCapabilities"
import { profileData } from "./profileData"
import { explainCapabilityFit } from "./suggestCharts"
import type { ChartCapability, ChartDataProfile } from "./chartCapabilityTypes"
import type { IntentId } from "./intents"

/**
 * One canonical fixture in a scorecard run. Pair canonical data with the
 * intents/components a human expert would expect to win on it. Use null
 * `expected` when the fixture is a stress-test that should produce no
 * fitting chart at all (e.g. flat single-column data, broken GeoJSON).
 */
export interface ScorecardFixture {
  name: string
  /** Free-text shape description, used in scorecard output for context. */
  shape?: string
  data: ReadonlyArray<Datum>
  /** Optional non-tabular payload (network/hierarchy/GeoJSON). */
  rawInput?: unknown
  /** Intent to rank by. If omitted, scored without intent (mean-of-all). */
  intent?: IntentId
  /** Components the human expert would pick. Empty = "anything fits". */
  expected?: ReadonlyArray<string>
  /** True if the fixture should produce zero fitting suggestions. Mutually exclusive with `expected`. */
  expectsNoFit?: boolean
}

export interface PerCapabilityScore {
  component: string
  family: ChartCapability["family"]
  /** Number of fixtures where this capability fit. */
  fitsOn: number
  /** Number of fixtures where this capability was rejected. */
  rejectedOn: number
  /** Number of fixtures where this capability appeared in the top-3 ranked suggestions. */
  inTopThreeOn: number
  /** Fixtures where the human expert picked this chart AND it was in top-3 ranking. */
  expertAgreementCount: number
  /** Mean composite score across fixtures where it fit. */
  averageScore: number
  /** Fraction of suggestions that included at least one caveat. */
  caveatCoverage: number
  /** Fraction of suggestions that picked a non-base variant. */
  variantUtilization: number
}

export interface PerFixtureScore {
  fixture: string
  shape?: string
  intent?: IntentId
  expected?: ReadonlyArray<string>
  topPick?: { component: string; variantKey?: string; score: number }
  topThree: ReadonlyArray<{ component: string; variantKey?: string; score: number }>
  fittingCount: number
  rejectedCount: number
  /** True if the top-3 ranking contained at least one expected component (when expected is provided). */
  expertAgreement: boolean | null
  /** Did the engine honor `expectsNoFit`? */
  noFitHonored: boolean | null
}

export interface ScorecardReport {
  perCapability: PerCapabilityScore[]
  perFixture: PerFixtureScore[]
  summary: {
    fixtureCount: number
    capabilityCount: number
    /** Fraction of expectation-bearing fixtures where the engine agreed with the expert. */
    expertAgreementRate: number
    /** Average caveat coverage across all suggestions. */
    overallCaveatCoverage: number
    /** Average variant utilization across all suggestions. */
    overallVariantUtilization: number
  }
}

/**
 * Run the scorecard. Pure — does no I/O — so it can be called from CI scripts,
 * vizmart UIs, or test suites.
 */
export function runQualityScorecard(
  fixtures: ReadonlyArray<ScorecardFixture>,
  capabilities: ReadonlyArray<ChartCapability> = getCapabilities(),
): ScorecardReport {
  const perCapability = new Map<string, PerCapabilityScore>()
  for (const c of capabilities) {
    perCapability.set(c.component, {
      component: c.component,
      family: c.family,
      fitsOn: 0,
      rejectedOn: 0,
      inTopThreeOn: 0,
      expertAgreementCount: 0,
      averageScore: 0,
      caveatCoverage: 0,
      variantUtilization: 0,
    })
  }

  // Running tallies for averaging
  const scoreSums = new Map<string, number>()
  const suggestionCount = new Map<string, number>()
  const caveatCount = new Map<string, number>()
  const variantCount = new Map<string, number>()

  const perFixture: PerFixtureScore[] = []

  for (const fixture of fixtures) {
    let profile: ChartDataProfile
    let result: ReturnType<typeof explainCapabilityFit>
    try {
      profile = profileData(fixture.data, { rawInput: fixture.rawInput })
      result = explainCapabilityFit(fixture.data, {
        profile,
        intent: fixture.intent,
        capabilities,
        maxResults: 40,
      })
    } catch {
      // A descriptor crashed on this fixture — flag it.
      perFixture.push({
        fixture: fixture.name,
        shape: fixture.shape,
        intent: fixture.intent,
        expected: fixture.expected,
        topPick: undefined,
        topThree: [],
        fittingCount: 0,
        rejectedCount: 0,
        expertAgreement: false,
        noFitHonored: null,
      })
      continue
    }

    const topThree = result.fitting.slice(0, 3).map((s) => ({
      component: s.component,
      variantKey: s.variant?.key,
      score: s.score,
    }))

    const expertAgreement = fixture.expected && fixture.expected.length > 0
      ? topThree.some((t) => fixture.expected!.includes(t.component))
      : null

    const noFitHonored = fixture.expectsNoFit === true
      ? result.fitting.length === 0
      : null

    perFixture.push({
      fixture: fixture.name,
      shape: fixture.shape,
      intent: fixture.intent,
      expected: fixture.expected,
      topPick: topThree[0],
      topThree,
      fittingCount: result.fitting.length,
      rejectedCount: result.rejected.length,
      expertAgreement,
      noFitHonored,
    })

    // Tally per-capability stats
    for (const s of result.fitting) {
      const row = perCapability.get(s.component)
      if (!row) continue
      row.fitsOn += 1
      scoreSums.set(s.component, (scoreSums.get(s.component) ?? 0) + s.score)
      suggestionCount.set(s.component, (suggestionCount.get(s.component) ?? 0) + 1)
      if (s.caveats.length > 0) caveatCount.set(s.component, (caveatCount.get(s.component) ?? 0) + 1)
      if (s.variant) variantCount.set(s.component, (variantCount.get(s.component) ?? 0) + 1)
    }
    for (const r of result.rejected) {
      const row = perCapability.get(r.component)
      if (row) row.rejectedOn += 1
    }
    for (const t of topThree) {
      const row = perCapability.get(t.component)
      if (row) row.inTopThreeOn += 1
    }
    if (fixture.expected && expertAgreement) {
      for (const t of topThree) {
        if (fixture.expected.includes(t.component)) {
          const row = perCapability.get(t.component)
          if (row) row.expertAgreementCount += 1
        }
      }
    }
  }

  // Finalize averages
  for (const row of perCapability.values()) {
    const count = suggestionCount.get(row.component) ?? 0
    row.averageScore = count === 0 ? 0 : (scoreSums.get(row.component) ?? 0) / count
    row.caveatCoverage = count === 0 ? 0 : (caveatCount.get(row.component) ?? 0) / count
    row.variantUtilization = count === 0 ? 0 : (variantCount.get(row.component) ?? 0) / count
  }

  // Sort: lowest expertAgreementCount first so weak descriptors surface first.
  // Ties broken by fitsOn (higher = more chances to demonstrate value).
  const perCapabilitySorted = Array.from(perCapability.values()).sort((a, b) => {
    const expertDelta = a.expertAgreementCount - b.expertAgreementCount
    if (expertDelta !== 0) return expertDelta
    return b.fitsOn - a.fitsOn
  })

  const fixturesWithExpectations = perFixture.filter((f) => f.expertAgreement !== null)
  const expertAgreementRate = fixturesWithExpectations.length === 0
    ? 0
    : fixturesWithExpectations.filter((f) => f.expertAgreement === true).length / fixturesWithExpectations.length

  const allSuggestionCount = Array.from(suggestionCount.values()).reduce((a, b) => a + b, 0)
  const allCaveatCount = Array.from(caveatCount.values()).reduce((a, b) => a + b, 0)
  const allVariantCount = Array.from(variantCount.values()).reduce((a, b) => a + b, 0)

  return {
    perCapability: perCapabilitySorted,
    perFixture,
    summary: {
      fixtureCount: fixtures.length,
      capabilityCount: capabilities.length,
      expertAgreementRate,
      overallCaveatCoverage: allSuggestionCount === 0 ? 0 : allCaveatCount / allSuggestionCount,
      overallVariantUtilization: allSuggestionCount === 0 ? 0 : allVariantCount / allSuggestionCount,
    },
  }
}
