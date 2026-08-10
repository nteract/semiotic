import { describe, expect, it } from "vitest"
import {
  AGE_WINDOWS,
  COMPARISON_CUTS,
  CONDITION_EPISODES,
  CULTURAL_WORKS,
  LENS_META,
  NYC_MIGRATION_MAX_FLOW,
  NYC_MIGRATION_NODES,
  NYC_MIGRATION_ROUTE_RECORDS,
  NYC_MIGRATION_SNAPSHOTS,
  PERIODS,
  REPRESENTATION_POINTS,
  REPRESENTATION_WINDOWS,
  RESIDENT_EPISODES,
  SOURCE_REGISTRY,
  agePeriodCohortPoint,
  canConnectEvidencePoints,
  cohortEvidenceAtAge,
  headlineForLens,
  migrationTotals,
  summarizeAgeWindow,
} from "./hellholeData"

describe("hellhole evidence contracts", () => {
  it("keeps stable identifiers and resolves every source reference", () => {
    for (const collection of [
      PERIODS,
      CULTURAL_WORKS,
      REPRESENTATION_POINTS,
      CONDITION_EPISODES,
      RESIDENT_EPISODES,
      SOURCE_REGISTRY,
    ]) {
      expect(new Set(collection.map((item) => item.id)).size).toBe(collection.length)
    }

    const sourceIds = new Set(SOURCE_REGISTRY.map((source) => source.id))
    for (const row of [
      ...CULTURAL_WORKS,
      ...REPRESENTATION_POINTS,
      ...CONDITION_EPISODES,
      ...RESIDENT_EPISODES,
    ]) {
      expect(row.sourceIds.length).toBeGreaterThan(0)
      row.sourceIds.forEach((sourceId) => expect(sourceIds.has(sourceId)).toBe(true))
    }
  })

  it("keeps design-document citation codes attached to source records", () => {
    const citationIds = SOURCE_REGISTRY.map((source) => source.citationId ?? source.id)
    expect(new Set(citationIds).size).toBe(citationIds.length)
    expect(
      SOURCE_REGISTRY.filter((source) => source.id.startsWith("brookings-")).map(
        (source) => source.citationId,
      ),
    ).toEqual(["R5", "R12", "R13", "R14"])
    expect(
      SOURCE_REGISTRY.find((source) => source.id === "gallup-country-living-2020"),
    ).toMatchObject({ citationId: "R9" })
    expect(
      SOURCE_REGISTRY.find((source) => source.id === "pew-density-preference-2026"),
    ).toMatchObject({ citationId: "R11" })
  })

  it("keeps all three evidence classes structurally separate", () => {
    expect(REPRESENTATION_POINTS.every((point) => point.lane === "representation")).toBe(true)
    expect(REPRESENTATION_POINTS.every((point) => point.evidenceKind === "illustrative-seed")).toBe(
      true,
    )
    expect(REPRESENTATION_POINTS.every((point) => point.estimate === null)).toBe(true)
    expect(CONDITION_EPISODES.every((point) => point.lane === "conditions")).toBe(true)
    expect(CONDITION_EPISODES.every((point) => point.evidenceKind === "observed-condition")).toBe(
      true,
    )
    expect(RESIDENT_EPISODES.every((point) => point.lane === "residents")).toBe(true)
    expect(RESIDENT_EPISODES.every((point) => point.evidenceKind === "observed-attitude")).toBe(
      true,
    )

    const evidenceIds = [...REPRESENTATION_POINTS, ...CONDITION_EPISODES, ...RESIDENT_EPISODES].map(
      (point) => point.id,
    )
    expect(new Set(evidenceIds).size).toBe(evidenceIds.length)
  })

  it("retains direct positive or ordinary city and suburban counterexamples", () => {
    const ordinaryWorks = CULTURAL_WORKS.filter((work) => work.role === "positive-or-ordinary")
    expect(ordinaryWorks.some((work) => work.placeFamily === "core")).toBe(true)
    expect(ordinaryWorks.some((work) => work.placeFamily === "suburb")).toBe(true)
    expect(ordinaryWorks.map((work) => work.title)).toEqual(
      expect.arrayContaining(["Naked City", "Father Knows Best", "The Mary Tyler Moore Show"]),
    )
  })

  it("uses series start years as discrete stations without extending their run", () => {
    const desperateHousewives = CULTURAL_WORKS.find((work) => work.id === "desperate-housewives")
    const station = REPRESENTATION_POINTS.find((point) => point.workId === "desperate-housewives")

    expect(desperateHousewives).toMatchObject({ year: 2004, endYear: 2012 })
    expect(station).toMatchObject({ year: 2004, startYear: 2004, endYear: 2004 })
    expect(cohortEvidenceAtAge(1994, 18, "representation").coverage).toBe("missing")
  })

  it("derives five transparent coverage windows without scores or smoothing", () => {
    expect(REPRESENTATION_WINDOWS).toHaveLength(5)
    expect(REPRESENTATION_WINDOWS.map((window) => window.id)).toEqual(
      PERIODS.map((period) => period.id),
    )
    expect(REPRESENTATION_WINDOWS.every((window) => window.estimate === null)).toBe(true)
    expect(REPRESENTATION_WINDOWS.every((window) => window.aggregation.includes("no score"))).toBe(
      true,
    )

    const noStationPeriods = REPRESENTATION_WINDOWS.filter((window) => window.stationCount === 0)
    expect(noStationPeriods.map((window) => window.id)).toEqual([
      "uneven-recovery",
      "analytical-fracture",
    ])
    expect(noStationPeriods.every((window) => window.evidenceKind === "missing")).toBe(true)
  })

  it("stores only the exact numerical condition and resident episodes used by the brief", () => {
    const conditionValues = Object.fromEntries(
      CONDITION_EPISODES.map((episode) => [episode.id, episode.estimate]),
    )
    expect(conditionValues).toMatchObject({
      "downtown-sample-growth-1990s": 10,
      "suburban-poor-population-growth-2000-2008": 25,
      "suburban-poor-count-lead-2008": 1.5,
      "suburban-poverty-rate-2022": 9.6,
      "primary-city-poverty-rate-2022": 16.2,
      "suburban-people-of-color-share-1990": 20,
      "suburban-people-of-color-share-2020": 45,
    })

    const residentValues = Object.fromEntries(
      RESIDENT_EPISODES.map((episode) => [episode.id, episode.estimate]),
    )
    expect(residentValues).toEqual({
      "gallup-2001-city-residents-prefer-city": 53,
      "gallup-2001-suburban-residents-prefer-suburb": 67,
      "pew-2026-prefers-spread-out": 55,
      "pew-2026-prefers-compact": 44,
    })
  })
})

describe("New York metropolitan migration flow contracts", () => {
  it("uses one fixed five-county core and one fixed ring in both periods", () => {
    const nodeIds = new Set(NYC_MIGRATION_NODES.map((node) => node.id))
    const core = NYC_MIGRATION_NODES.find((node) => node.id === "nyc-core")

    expect(core.countyFips).toEqual(["36005", "36047", "36061", "36081", "36085"])
    expect(NYC_MIGRATION_ROUTE_RECORDS.flatMap((route) => route.countyFips)).toHaveLength(10)
    expect(NYC_MIGRATION_SNAPSHOTS).toHaveLength(2)

    for (const snapshot of NYC_MIGRATION_SNAPSHOTS) {
      expect(snapshot.flows).toHaveLength(NYC_MIGRATION_ROUTE_RECORDS.length)
      expect(snapshot.flows.every((flow) => nodeIds.has(flow.source))).toBe(true)
      expect(snapshot.flows.every((flow) => nodeIds.has(flow.target))).toBe(true)
      expect(
        snapshot.flows.every((flow) => flow.unit === "ACS one-year residence-change estimate"),
      ).toBe(true)
    }
  })

  it("retains independently observed outflow and inflow rather than reversing one edge set", () => {
    const [earlyOutflow, laterInflow] = NYC_MIGRATION_SNAPSHOTS
    const reversedEarlyValues = Object.fromEntries(
      earlyOutflow.flows.map((flow) => [`${flow.target}:${flow.source}`, flow.value]),
    )

    expect(earlyOutflow).toMatchObject({
      period: "2006-2010",
      direction: "outbound",
      sourceId: "census-county-flows-2006-2010",
    })
    expect(laterInflow).toMatchObject({
      period: "2016-2020",
      direction: "inbound",
      sourceId: "census-county-flows-2016-2020",
    })
    expect(
      laterInflow.flows.every(
        (flow) => reversedEarlyValues[`${flow.source}:${flow.target}`] !== flow.value,
      ),
    ).toBe(true)
  })

  it("keeps exact gross directions and net balances available beside the maps", () => {
    expect(migrationTotals("2006-2010")).toEqual({
      outbound: 66983,
      inbound: 41867,
      netTowardCore: -25116,
    })
    expect(migrationTotals("2016-2020")).toEqual({
      outbound: 93259,
      inbound: 40072,
      netTowardCore: -53187,
    })
    expect(NYC_MIGRATION_MAX_FLOW).toBe(25101)
  })

  it("resolves every mapped estimate to its exact Census period source", () => {
    const sourceIds = new Set(SOURCE_REGISTRY.map((source) => source.id))
    for (const snapshot of NYC_MIGRATION_SNAPSHOTS) {
      expect(sourceIds.has(snapshot.sourceId)).toBe(true)
      for (const flow of snapshot.flows) {
        expect(flow.sourceIds).toEqual([snapshot.sourceId])
        expect(flow.period).toBe(snapshot.period)
        expect(flow.value).toBeGreaterThan(0)
        expect(flow.counterflow).toBeGreaterThan(0)
      }
    }
  })
})

describe("age-period-cohort helpers", () => {
  it("preserves the age-period-cohort identity", () => {
    expect(agePeriodCohortPoint(1970, 15)).toEqual({
      birthYear: 1970,
      age: 15,
      calendarYear: 1985,
    })
    expect(agePeriodCohortPoint(1988, 15)).toEqual({
      birthYear: 1988,
      age: 15,
      calendarYear: 2003,
    })

    for (const birthYear of [1945, 1970, 1988, 2000]) {
      for (const age of [0, 8, 15, 29, 35]) {
        const point = agePeriodCohortPoint(birthYear, age)
        expect(point.calendarYear - point.age).toBe(point.birthYear)
      }
    }
  })

  it("rejects invalid identity inputs instead of coercing them", () => {
    expect(() => agePeriodCohortPoint(1970.5, 15)).toThrow(/birthYear must be an integer/)
    expect(() => agePeriodCohortPoint(1970, -1)).toThrow(/age must be nonnegative/)
  })

  it("keeps stations and observed episodes separate at the same age and year", () => {
    const evidence = cohortEvidenceAtAge(1986, 15, "all")

    expect(evidence.calendarYear).toBe(2001)
    expect(evidence.evidenceKind).toBe("mixed-evidence")
    expect(evidence.representationContrast).toBeNull()
    expect(evidence.stations.map((station) => station.workId)).toEqual(["donnie-darko"])
    expect(
      evidence.episodes
        .filter((episode) => episode.lane === "residents")
        .map((episode) => episode.instrumentId),
    ).toEqual(["gallup-current-place-preference-2001", "gallup-current-place-preference-2001"])
    expect(evidence.stations.every((point) => point.evidenceKind === "illustrative-seed")).toBe(
      true,
    )
    expect(evidence.episodes.some((point) => point.evidenceKind === "observed-condition")).toBe(
      true,
    )
    expect(evidence.episodes.some((point) => point.evidenceKind === "observed-attitude")).toBe(true)
  })

  it("reports missing exact-year evidence without interpolation", () => {
    const representation = cohortEvidenceAtAge(1988, 15, "representation")
    const residents = cohortEvidenceAtAge(1988, 15, "residents")

    expect(representation).toMatchObject({
      calendarYear: 2003,
      coverage: "missing",
      evidenceKind: "missing",
      representationContrast: null,
      stations: [],
    })
    expect(residents).toMatchObject({
      calendarYear: 2003,
      coverage: "missing",
      evidenceKind: "missing",
      episodes: [],
    })
  })

  it("summarizes default age windows inclusively with flat coverage", () => {
    const danger = summarizeAgeWindow(1970, "danger", "representation")

    expect(danger).toMatchObject({
      startAge: 8,
      endAge: 17,
      startYear: 1978,
      endYear: 1987,
      ageCount: 10,
      coveredAgeCount: 5,
      stationCount: 5,
      weighting: "flat",
      representationContrast: null,
    })
    expect(danger.coveredYears).toEqual([1978, 1979, 1981, 1982, 1986])
    expect(danger.coverageRatio).toBe(0.5)
    expect(danger.stations.map((station) => station.workId)).toEqual([
      "halloween",
      "warriors",
      "escape-from-new-york",
      "poltergeist",
      "blue-velvet",
    ])
  })

  it("supports inclusive custom windows and multi-year condition coverage", () => {
    const oneYear = summarizeAgeWindow(
      1983,
      { label: "Age fifteen", startAge: 15, endAge: 15 },
      "representation",
    )
    expect(oneYear).toMatchObject({
      windowId: "custom",
      startYear: 1998,
      endYear: 1998,
      ageCount: 1,
      coveredAgeCount: 1,
      stationCount: 2,
    })

    const povertyEpisode = summarizeAgeWindow(1990, { startAge: 10, endAge: 18 }, "conditions")
    expect(povertyEpisode).toMatchObject({
      startYear: 2000,
      endYear: 2008,
      ageCount: 9,
      coveredAgeCount: 9,
      episodeCount: 2,
      coverageRatio: 1,
    })
  })

  it("rejects unresolved or inverted custom windows", () => {
    expect(() => summarizeAgeWindow(1970, "custom")).toThrow(/requires integer startAge/)
    expect(() => summarizeAgeWindow(1970, { startAge: 18, endAge: 8 })).toThrow(
      /startAge <= endAge/,
    )
  })
})

describe("survey comparability and narrative metadata", () => {
  it("never connects survey episodes into a synthetic trend", () => {
    const groups = new Set(RESIDENT_EPISODES.map((episode) => episode.comparabilityGroup))
    expect(groups).toEqual(
      new Set(["gallup-current-place-preference-2001", "pew-density-tradeoff-2026"]),
    )

    for (const first of RESIDENT_EPISODES) {
      for (const second of RESIDENT_EPISODES) {
        expect(canConnectEvidencePoints(first, second)).toBe(false)
      }
    }
  })

  it("permits a line only for explicitly comparable condition points", () => {
    const diversity1990 = CONDITION_EPISODES.find(
      (episode) => episode.id === "suburban-people-of-color-share-1990",
    )
    const diversity2020 = CONDITION_EPISODES.find(
      (episode) => episode.id === "suburban-people-of-color-share-2020",
    )
    const suburbanPoverty2022 = CONDITION_EPISODES.find(
      (episode) => episode.id === "suburban-poverty-rate-2022",
    )

    expect(canConnectEvidencePoints(diversity1990, diversity2020)).toBe(true)
    expect(canConnectEvidencePoints(diversity2020, suburbanPoverty2022)).toBe(false)
  })

  it("defines honest lens headlines and all three APC cuts", () => {
    expect(Object.keys(LENS_META)).toEqual(["representation", "conditions", "residents", "all"])
    expect(headlineForLens("representation")).toContain("do not measure")
    expect(headlineForLens("all")).toContain("non-equivalent")
    expect(() => headlineForLens("composite")).toThrow(/Unknown lens/)

    expect(COMPARISON_CUTS.map((cut) => cut.holdsConstant)).toEqual([
      "calendar year",
      "age",
      "birth year",
    ])
    expect(AGE_WINDOWS.find((window) => window.id === "danger")).toMatchObject({
      startAge: 8,
      endAge: 17,
    })
    expect(AGE_WINDOWS.find((window) => window.id === "desire")).toMatchObject({
      startAge: 18,
      endAge: 29,
    })
  })
})
