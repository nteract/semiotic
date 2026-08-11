import { describe, expect, it } from "vitest"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { HIT_TRAVELS_DATA } from "./hitTravelsData.generated"

const REFERENCE_COUNTRY_IDS = [
  "AR",
  "AU",
  "BR",
  "CA",
  "CO",
  "DE",
  "EG",
  "ES",
  "FR",
  "GB",
  "ID",
  "IN",
  "JP",
  "KE",
  "KR",
  "MX",
  "NG",
  "PH",
  "PK",
  "SA",
  "TH",
  "TR",
  "US",
  "ZA",
]

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function roundedRatio(numerator, denominator) {
  return Number((numerator / denominator).toFixed(4))
}

describe("How a Hit Travels generated snapshot", () => {
  it("rejects global inputs with missing or empty weekly hours viewed", () => {
    const fixtureDirectory = mkdtempSync(join(tmpdir(), "semiotic-hit-travels-"))
    const countryPath = join(fixtureDirectory, "countries.tsv")
    const globalPath = join(fixtureDirectory, "global.tsv")
    const outputPath = join(fixtureDirectory, "output.js")
    const buildPath = resolve("docs/src/pages/examples/how-a-hit-travels/buildHitTravelsData.mjs")
    const countryHeader = [
      "country_name",
      "country_iso2",
      "week",
      "category",
      "weekly_rank",
      "show_title",
      "season_title",
    ].join("\t")
    const countryRow = [
      "United States",
      "US",
      "2026-08-02",
      "Films (English)",
      "1",
      "Example",
      "N/A",
    ].join("\t")
    const globalFields = [
      "week",
      "category",
      "weekly_rank",
      "show_title",
      "season_title",
      "weekly_views",
    ]
    const runBuilder = () =>
      spawnSync(
        process.execPath,
        [buildPath, "--countries", countryPath, "--global", globalPath, "--output", outputPath],
        { encoding: "utf8" },
      )

    try {
      writeFileSync(countryPath, `${countryHeader}\n${countryRow}\n`)
      writeFileSync(
        globalPath,
        `${globalFields.join("\t")}\n2026-08-02\tFilms (English)\t1\tExample\tN/A\t100\n`,
      )
      const missingColumn = runBuilder()
      expect(missingColumn.status).not.toBe(0)
      expect(missingColumn.stderr).toContain("Global source is missing weekly_hours_viewed")

      writeFileSync(
        globalPath,
        `${[...globalFields, "weekly_hours_viewed"].join("\t")}\n2026-08-02\tFilms (English)\t1\tExample\tN/A\t100\t\n`,
      )
      const emptyValue = runBuilder()
      expect(emptyValue.status).not.toBe(0)
      expect(emptyValue.stderr).toContain("Global source contains invalid weekly hours viewed")
    } finally {
      rmSync(fixtureDirectory, { recursive: true, force: true })
    }
  })

  it("keeps the source manifest and the 24-country visual reference set auditable", () => {
    const { manifest, countries, titles } = HIT_TRAVELS_DATA

    expect(manifest).toMatchObject({
      snapshotId: "netflix-top10-2026-08-02",
      retrievedAt: "2026-08-09",
      firstWeek: "2021-07-04",
      lastWeek: "2026-08-02",
      methodVersion: "similarity-constellation-v1",
      referenceCountryCount: REFERENCE_COUNTRY_IDS.length,
    })
    expect(manifest.weekCount).toBe(
      Math.round((Date.parse(manifest.lastWeek) - Date.parse(manifest.firstWeek)) / 604800000) + 1,
    )
    expect(manifest.countryCount).toBeGreaterThanOrEqual(countries.length)
    expect(manifest.titleCount).toBeGreaterThanOrEqual(titles.length)
    expect(manifest.countryRowCount).toBeGreaterThan(0)
    expect(manifest.globalRowCount).toBeGreaterThan(0)
    expect(manifest.sourceFiles).toHaveLength(2)
    for (const source of manifest.sourceFiles) {
      expect(source.url).toMatch(/^https:\/\/www\.netflix\.com\/tudum\/top10\/data\//)
      expect(source.bytes).toBeGreaterThan(0)
      expect(source.sha256).toMatch(/^[a-f0-9]{64}$/)
    }

    expect(countries).toHaveLength(manifest.referenceCountryCount)
    expect(countries.map((country) => country.id)).toEqual(REFERENCE_COUNTRY_IDS)
    expect(new Set(countries.map((country) => country.id)).size).toBe(countries.length)
    for (const country of countries) {
      expect(country.name).toBeTruthy()
      expect(country.region).toBeTruthy()
      expect(Number.isFinite(country.longitude)).toBe(true)
      expect(Number.isFinite(country.latitude)).toBe(true)
      expect(country.longitude).toBeGreaterThanOrEqual(-180)
      expect(country.longitude).toBeLessThanOrEqual(180)
      expect(country.latitude).toBeGreaterThanOrEqual(-90)
      expect(country.latitude).toBeLessThanOrEqual(90)
    }
  })

  it("preserves the title-profile invariants derived from country ranking rows", () => {
    const titleIds = HIT_TRAVELS_DATA.titles.map((title) => title.id)
    expect(new Set(titleIds).size).toBe(titleIds.length)

    for (const title of HIT_TRAVELS_DATA.titles) {
      expect(title.weeklyReach).toHaveLength(title.spanWeeks)
      expect(title.weeklyReach[0].week).toBe(title.firstWeek)
      expect(title.weeklyReach.at(-1).week).toBe(title.lastWeek)
      expect(title.weeklyReach.map((week) => week.elapsedWeek)).toEqual(
        Array.from({ length: title.spanWeeks }, (_, index) => index),
      )
      expect(title.activeWeeks).toBe(
        title.weeklyReach.filter((week) => week.countryCount > 0).length,
      )
      expect(title.countryWeeks).toBe(
        title.weeklyReach.reduce((sum, week) => sum + week.countryCount, 0),
      )
      expect(title.peakWeeklyReach).toBe(
        Math.max(...title.weeklyReach.map((week) => week.countryCount)),
      )
      expect(title.firstWeekCountryCount).toBe(title.weeklyReach[0].countryCount)

      for (const week of title.weeklyReach) {
        expect(week.coverage).toBeGreaterThan(0)
        expect(week.countryCount).toBeLessThanOrEqual(week.coverage)
        expect(week.reachShare).toBe(roundedRatio(week.countryCount, week.coverage))
        expect(week.medianRank).toBeGreaterThanOrEqual(0)
        expect(week.medianRank).toBeLessThanOrEqual(10)
      }

      expect(title.countryHistory).toHaveLength(title.observedCountryCount)
      expect(new Set(title.countryHistory.map((country) => country.countryId)).size).toBe(
        title.observedCountryCount,
      )
      expect(title.arrivalByWeek.reduce((sum, week) => sum + week.countryCount, 0)).toBe(
        title.observedCountryCount,
      )
      expect(title.persistenceBands.reduce((sum, band) => sum + band.count, 0)).toBe(
        title.observedCountryCount,
      )
      expect(title.medianPersistence).toBe(
        median(title.countryHistory.map((country) => country.activeWeeks)),
      )
      expect(title.simultaneity).toBe(
        roundedRatio(
          title.countryHistory.filter((country) => country.firstElapsedWeek <= 1).length,
          title.observedCountryCount,
        ),
      )

      const ranks = title.countryHistory.flatMap((country) => {
        expect(country.activeWeeks).toBe(country.ranks.length)
        expect(country.bestRank).toBe(Math.min(...country.ranks.map(([, rank]) => rank)))
        return country.ranks.map(([, rank]) => rank)
      })
      expect(ranks.every((rank) => Number.isInteger(rank) && rank >= 1 && rank <= 10)).toBe(true)
      expect(title.bestRank).toBe(Math.min(...ranks))
      expect(title.globalListAppeared).toBe(title.globalHistory.length > 0)
    }
  })

  it("keeps the published narrative claims tied to their computed title metrics", () => {
    const titles = new Map(HIT_TRAVELS_DATA.titles.map((title) => [title.id, title]))
    const claims = new Map(HIT_TRAVELS_DATA.claimEvidence.map((claim) => [claim.id, claim]))
    const hero = titles.get("crash-course-romance")
    const durable = titles.get("cafe-con-aroma")
    const omitted = titles.get("rookie-season-1")

    expect([...claims.keys()]).toEqual([
      "claim-crash-course-arrival",
      "claim-durable-regional",
      "claim-global-list-selection",
    ])
    expect(hero).toMatchObject({
      firstWeek: "2023-01-22",
      firstWeekCountryCount: 4,
      firstWeekCoverage: 93,
      observedCountryCount: 34,
      peakWeeklyReach: 25,
    })
    expect(claims.get("claim-crash-course-arrival")).toMatchObject({
      numerator: hero.firstWeekCountryCount,
      denominator: hero.firstWeekCoverage,
      statement: `${hero.label} first appeared in ${hero.firstWeekCountryCount} national Top 10 lists during the week ending ${hero.firstWeek}.`,
    })

    expect(durable).toMatchObject({ observedCountryCount: 19, medianPersistence: 42 })
    expect(claims.get("claim-durable-regional")).toMatchObject({
      numerator: durable.observedCountryCount,
      denominator: HIT_TRAVELS_DATA.manifest.countryCount,
      statement: `${durable.label} appeared in ${durable.observedCountryCount} countries; the median reached country ranked it for ${durable.medianPersistence} weeks.`,
    })

    expect(omitted).toMatchObject({
      observedCountryCount: 80,
      countryWeeks: 303,
      globalListAppeared: false,
      globalHistory: [],
    })
    expect(claims.get("claim-global-list-selection")).toMatchObject({
      numerator: omitted.countryWeeks,
      denominator: omitted.observedCountryCount,
      statement: `${omitted.label} accumulated ${omitted.countryWeeks} country-weeks across ${omitted.observedCountryCount} countries without a matching global Top 10 row in this snapshot.`,
    })
    expect(HIT_TRAVELS_DATA.omittedTitles).toContainEqual(
      expect.objectContaining({
        titleKey: omitted.titleKey,
        observedCountryCount: omitted.observedCountryCount,
        countryWeeks: omitted.countryWeeks,
      }),
    )

    for (const claim of claims.values()) {
      expect(claim.status).toBe("supported")
      expect(claim.snapshotId).toBe(HIT_TRAVELS_DATA.manifest.snapshotId)
      expect(claim.methodVersion).toBe(HIT_TRAVELS_DATA.manifest.methodVersion)
      expect(claim.metric).toBeTruthy()
      expect(claim.caveat).toBeTruthy()
    }
  })

  it("retains unavailable historical global views as null rather than zero", () => {
    const titles = new Map(HIT_TRAVELS_DATA.titles.map((title) => [title.id, title]))
    const historicalRows = HIT_TRAVELS_DATA.titles.flatMap((title) =>
      title.globalHistory.filter((week) => week.views === null),
    )

    expect(historicalRows.length).toBeGreaterThan(0)
    expect(historicalRows.every((week) => week.hoursViewed > 0)).toBe(true)
    expect(
      HIT_TRAVELS_DATA.titles
        .flatMap((title) => title.globalHistory)
        .some((week) => week.views === 0),
    ).toBe(false)
    expect(titles.get("crash-course-romance").globalHistory).not.toHaveLength(0)
    expect(
      titles.get("crash-course-romance").globalHistory.every((week) => week.views === null),
    ).toBe(true)
    expect(titles.get("wednesday-season-1").globalHistory.some((week) => week.views === null)).toBe(
      true,
    )
    expect(
      titles.get("wednesday-season-1").globalHistory.some((week) => Number.isFinite(week.views)),
    ).toBe(true)
  })

  it("keeps every emitted similarity edge above its declared floor and inside the reference set", () => {
    const referenceIds = new Set(REFERENCE_COUNTRY_IDS)

    expect(Object.keys(HIT_TRAVELS_DATA.similarityLayouts)).toEqual([
      "presence",
      "distinctive-rank",
    ])
    for (const [mode, layout] of Object.entries(HIT_TRAVELS_DATA.similarityLayouts)) {
      expect(layout.mode).toBe(mode)
      expect(layout.minimumSimilarity).toBe(0.1)
      expect(Object.keys(layout.positions)).toEqual(REFERENCE_COUNTRY_IDS)
      expect(layout.edges.length).toBeGreaterThan(0)
      expect(new Set(layout.edges.map((edge) => edge.id)).size).toBe(layout.edges.length)

      for (const position of Object.values(layout.positions)) {
        expect(position.x).toBeGreaterThanOrEqual(0)
        expect(position.x).toBeLessThanOrEqual(1)
        expect(position.y).toBeGreaterThanOrEqual(0)
        expect(position.y).toBeLessThanOrEqual(1)
      }
      for (const edge of layout.edges) {
        expect(referenceIds.has(edge.source)).toBe(true)
        expect(referenceIds.has(edge.target)).toBe(true)
        expect(edge.source).not.toBe(edge.target)
        expect(edge.similarity).toBeGreaterThanOrEqual(layout.minimumSimilarity)
        expect(edge.similarity).toBeLessThanOrEqual(1)
        expect(edge.sharedObservations).toBeGreaterThan(0)
        expect(edge.contributors.length).toBeGreaterThan(0)
      }
    }
  })
})
