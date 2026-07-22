import { describe, expect, it } from "vitest"
import {
  AID_DONORS,
  AID_DONOR_YEARLY,
  AID_METRICS,
  AID_YEARS,
  ORYX_HEADLINE,
  ORYX_MONTHLY,
  UN_VOTES,
  aidRowsForYear,
  buildAidFlows,
  oryxRowsForCountry,
  sumOryxRows,
} from "./ukraineWarHistory"

describe("ukraine war history evidence snapshot", () => {
  it("keeps a complete 47-month Oryx-derived series for each country and class", () => {
    for (const country of ["Russia", "Ukraine"]) {
      const rows = oryxRowsForCountry(country)
      expect(rows).toHaveLength(47 * 3)
      for (const category of ["Tanks", "Infantry carriers", "Artillery"]) {
        const series = rows.filter((row) => row.category === category)
        expect(series).toHaveLength(47)
        expect(series[0].monthIndex).toBe(0)
        expect(series.at(-1).monthIndex).toBe(46)
        expect(series[0].date.toISOString().slice(0, 10)).toBe("2022-02-01")
        expect(series.at(-1).date.toISOString().slice(0, 10)).toBe("2025-12-01")
      }
    }
  })

  it("contains only finite nonnegative monthly counts", () => {
    for (const row of ORYX_MONTHLY) {
      expect(Number.isFinite(row.losses)).toBe(true)
      expect(row.losses).toBeGreaterThanOrEqual(0)
    }
  })

  it("keeps featured-class rollups below the all-equipment headline", () => {
    for (const country of ["Russia", "Ukraine"]) {
      expect(sumOryxRows(oryxRowsForCountry(country))).toBeLessThan(ORYX_HEADLINE[country].total)
    }
  })

  it("keeps every yearly Kiel rollup additive across the dashboard categories", () => {
    for (const row of AID_DONOR_YEARLY) {
      const componentTotal = row.military + row.civilian + row.unspecified
      expect(Math.abs(componentTotal - row.total)).toBeLessThan(1e-9)
      expect(AID_YEARS).toContain(row.year)
    }
  })

  it("makes the all-years donor rows equal the sum of the annual rows", () => {
    for (const donor of AID_DONORS) {
      const annualRows = AID_DONOR_YEARLY.filter((row) => row.donorId === donor.id)
      const allYears = aidRowsForYear("all").find((row) => row.id === donor.id)
      for (const metric of ["military", "civilian", "unspecified", "total"]) {
        const annualTotal = annualRows.reduce((sum, row) => sum + row[metric], 0)
        expect(allYears[metric]).toBeCloseTo(annualTotal, 10)
      }
    }
  })

  it("builds directed, magnitude-bearing flows into Kyiv for every year filter", () => {
    for (const metric of AID_METRICS) {
      for (const year of AID_YEARS) {
        const flows = buildAidFlows(metric.id, year)
        expect(flows.length).toBeGreaterThan(0)
        for (const flow of flows) {
          expect(flow.source).toBe(flow.donorId)
          expect(flow.target).toBe("kyiv")
          expect(flow.value).toBeGreaterThan(0)
        }
      }
    }
  })

  it("accounts for all 193 UN member states in every vote", () => {
    for (const vote of UN_VOTES) {
      expect(vote.yes + vote.no + vote.abstain + vote.absent).toBe(193)
    }
  })
})
