import { describe, expect, it } from "vitest"
import {
  METROS,
  corridorRanks,
  costedDestinations,
  metroById,
  stretchSeriesForMetro,
  weatherSeriesFromOpenMeteoDaily,
} from "./milesAreALie"

describe("milesAreALie fixtures", () => {
  it("ships multiple metros with destinations and weather", () => {
    expect(METROS.length).toBeGreaterThanOrEqual(4)
    for (const metro of METROS) {
      expect(metro.destinations.length).toBeGreaterThanOrEqual(5)
      expect(metro.weatherSeries.length).toBeGreaterThanOrEqual(7)
      expect(metro.destinations.some((d) => d.kind === "center")).toBe(true)
    }
  })

  it("costs a storm day higher than a calm day", () => {
    const metro = metroById("san-francisco")
    const calm = costedDestinations(metro, 0)
    const storm = costedDestinations(metro, 4)
    expect(storm.summary.medianStretch).toBeGreaterThan(calm.summary.medianStretch)
    expect(storm.weatherFactor.multiplier).toBeGreaterThan(calm.weatherFactor.multiplier)
  })

  it("builds stretch series and corridor ranks", () => {
    const metro = metroById("new-york")
    const series = stretchSeriesForMetro(metro)
    expect(series.length).toBeGreaterThan(10)
    expect(series.every((row) => row.stretch >= 1)).toBe(true)

    const { points } = costedDestinations(metro, 4)
    const ranks = corridorRanks(points)
    expect(ranks[0].stretch).toBeGreaterThanOrEqual(ranks[ranks.length - 1].stretch)
    expect(ranks.every((row) => row.kind !== "center")).toBe(true)
  })

  it("maps open-meteo daily payloads into weather series", () => {
    const series = weatherSeriesFromOpenMeteoDaily({
      time: ["2026-07-10", "2026-07-11"],
      precipitation_sum: [0, 12],
      wind_speed_10m_max: [10, 40],
      temperature_2m_mean: [20, 18],
    })
    expect(series).toHaveLength(2)
    expect(series[1].precipitationMm).toBe(12)
  })
})
