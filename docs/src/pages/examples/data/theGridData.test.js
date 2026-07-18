import { describe, expect, it } from "vitest"
import {
  buildSnapshotBundle,
  eventsForScenario,
  generateRegionHours,
  GRID_FUEL_COLOR_MAP,
  GRID_FUEL_LABEL_COLOR_MAP,
  GRID_REGIONS,
  GRID_SCENARIOS,
  hoursForScenario,
  operatingSentence,
  regionById,
  scenarioById,
} from "./theGridData"
import {
  demandForecastRows,
  gridEventAnnotations,
  reserveMarginPct,
  reserveSeries,
  stackFuelSeries,
  summarizeOperatingPoint,
  thresholdBandsForReserve,
  tightestHours,
} from "../../../../../src/components/recipes/gridObservatory"

describe("theGridData fixtures", () => {
  it("ships four regions and five named scenarios", () => {
    expect(GRID_REGIONS.length).toBeGreaterThanOrEqual(4)
    expect(GRID_SCENARIOS.length).toBeGreaterThanOrEqual(5)
    expect(regionById("ercot").ba).toBe("ERCO")
    expect(scenarioById("summer-heat").regionId).toBe("ercot")
    expect(GRID_FUEL_LABEL_COLOR_MAP["Natural gas"]).toBe(GRID_FUEL_COLOR_MAP.naturalGas)
  })

  it("generates deterministic multi-day hourly series", () => {
    const a = generateRegionHours({ regionId: "ercot", scenarioId: "summer-heat", days: 2 })
    const b = generateRegionHours({ regionId: "ercot", scenarioId: "summer-heat", days: 2 })
    expect(a).toHaveLength(48)
    expect(a[0]).toEqual(b[0])
    expect(a[0].demandMw).toBeGreaterThan(0)
    expect(a[0].fuels.naturalGas).toBeGreaterThan(0)
    expect(a.every((h) => typeof h.forecastMw === "number")).toBe(true)
  })

  it("projects hours through recipes helpers (page wiring contract)", () => {
    const hours = hoursForScenario("wind-night")
    const fuelStack = stackFuelSeries(hours)
    const demandForecast = demandForecastRows(hours)
    const reserves = reserveSeries(hours)
    const operating = summarizeOperatingPoint(hours)
    const riskHours = tightestHours(reserves, 14)
    expect(fuelStack.length).toBeGreaterThan(0)
    expect(demandForecast.length).toBe(hours.length)
    expect(reserves.length).toBe(hours.length)
    expect(operating?.ba).toBe("ERCO")
    expect(riskHours.length).toBeGreaterThan(0)
    expect(thresholdBandsForReserve()).toHaveLength(3)
    expect(reserveMarginPct({ demand: 100, capacityOrNetGen: 110 })).toBeCloseTo(10)
  })

  it("builds provenanced annotations for scenarios via recipes", () => {
    const events = eventsForScenario("summer-heat")
    const anns = gridEventAnnotations(events, { source: "scenario:summer-heat" })
    expect(anns.length).toBeGreaterThan(0)
    expect(anns[0].provenance?.stableId).toBeTruthy()
    expect(anns[0].type).toBe("x-band")
  })

  it("writes a one-sentence operating point in plain language", () => {
    const hours = hoursForScenario("quiet-shoulder")
    const operating = summarizeOperatingPoint(hours)
    const sentence = operatingSentence(operating, regionById("ercot"))
    expect(sentence).toMatch(/ERCOT/)
    expect(sentence).toMatch(/demand/)
    expect(sentence).toMatch(/spare capacity/i)
  })

  it("keeps a full snapshot bundle for multi-region SSR", () => {
    const bundle = buildSnapshotBundle()
    expect(bundle.byRegion.ercot.length).toBe(14 * 24)
    expect(bundle.byRegion.pjm[0].ba).toBe("PJM")
  })
})
