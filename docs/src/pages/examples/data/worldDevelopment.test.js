import { describe, expect, it } from "vitest"
import {
  WORLD_COUNTRIES,
  WORLD_OBSERVATIONS,
  WORLD_LATEST_YEAR,
  crossSection,
  distributionSample,
  rankByCountry,
  shareByGroup,
  singleCountryTrend,
} from "./worldDevelopment"

describe("world development example data", () => {
  it("has one country block per country and valid observation rows", () => {
    expect(WORLD_COUNTRIES.length).toBe(16)
    expect(new Set(WORLD_COUNTRIES.map((c) => c.iso3)).size).toBe(16)

    const countryIds = new Set(WORLD_COUNTRIES.map((c) => c.iso3))
    for (const row of WORLD_OBSERVATIONS) {
      expect(countryIds.has(row.iso3)).toBe(true)
      expect(row.year).toBeGreaterThanOrEqual(1990)
      expect(row.year).toBeLessThanOrEqual(WORLD_LATEST_YEAR)
    }
    // Every country reaches the latest year with all four indicators present.
    for (const country of WORLD_COUNTRIES) {
      const latest = WORLD_OBSERVATIONS.find(
        (r) => r.iso3 === country.iso3 && r.year === WORLD_LATEST_YEAR
      )
      expect(latest).toBeTruthy()
      expect(latest.lifeExpectancy).toBeGreaterThan(0)
      expect(latest.gdpPerCapita).toBeGreaterThan(0)
      expect(latest.co2PerCapita).toBeGreaterThan(0)
      expect(latest.population).toBeGreaterThan(0)
    }
  })

  it("builds a two-field single-country trend", () => {
    const trend = singleCountryTrend("KOR", "lifeExpectancy")
    expect(trend.length).toBeGreaterThan(30)
    expect(Object.keys(trend[0]).sort()).toEqual(["lifeExpectancy", "year"])
    for (let i = 1; i < trend.length; i += 1) {
      expect(trend[i].year).toBeGreaterThan(trend[i - 1].year)
    }
    // South Korea's life expectancy rises substantially across the window.
    expect(trend[trend.length - 1].lifeExpectancy).toBeGreaterThan(trend[0].lifeExpectancy + 8)
  })

  it("ranks one slim value per country", () => {
    const rows = rankByCountry("co2PerCapita")
    expect(rows.length).toBe(16)
    expect(Object.keys(rows[0]).sort()).toEqual(["co2PerCapita", "country"])
    const usa = rows.find((r) => r.country === "United States")
    const eth = rows.find((r) => r.country === "Ethiopia")
    expect(usa.co2PerCapita).toBeGreaterThan(eth.co2PerCapita * 10)
  })

  it("builds a two-measure cross-section for correlation", () => {
    const rows = crossSection(["gdpPerCapita", "lifeExpectancy"])
    expect(rows.length).toBe(16)
    const keys = Object.keys(rows[0]).sort()
    expect(keys).toEqual(["country", "gdpPerCapita", "lifeExpectancy", "region"])
  })

  it("samples a large distribution and a small part-to-whole group", () => {
    const sample = distributionSample("lifeExpectancy")
    expect(sample.length).toBeGreaterThan(500)
    expect(Object.keys(sample[0]).sort()).toEqual(["country", "lifeExpectancy"])

    const byIncome = shareByGroup("income", "population")
    expect(byIncome.length).toBe(4)
    expect(byIncome.reduce((sum, d) => sum + d.population, 0)).toBeGreaterThan(0)

    const byRegion = shareByGroup("region", "population")
    expect(byRegion.length).toBeGreaterThan(4)
  })
})
