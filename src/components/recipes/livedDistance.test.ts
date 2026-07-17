import { describe, expect, it } from "vitest"
import {
  alertFrictionFactor,
  alertToAnnotation,
  composeCost,
  costPointsFromCenter,
  greatCircleMinutes,
  haversineKm,
  stretchIndex,
  stretchStyleRules,
  summarizeStretch,
  weatherFrictionFactor,
} from "./livedDistance"

describe("livedDistance", () => {
  it("computes haversine distances for known city pairs", () => {
    const sf = { lat: 37.77, lon: -122.42 }
    const oak = { lat: 37.8, lon: -122.27 }
    const km = haversineKm(sf, oak)
    expect(km).toBeGreaterThan(10)
    expect(km).toBeLessThan(25)
  })

  it("composes multiplicative cost factors", () => {
    expect(composeCost(100, [1.1, { id: "a", multiplier: 1.2 }])).toBeCloseTo(132, 5)
    expect(composeCost(50, [])).toBe(50)
    expect(composeCost(-1, [2])).toBe(0)
  })

  it("maps weather and alerts to friction ≥ 1", () => {
    const calm = weatherFrictionFactor({ precipitationMm: 0, windKmh: 10 })
    expect(calm.multiplier).toBe(1)
    const storm = weatherFrictionFactor({
      precipitationMm: 20,
      windKmh: 50,
      visibilityM: 800,
    })
    expect(storm.multiplier).toBeGreaterThan(1.3)
    expect(alertFrictionFactor("severe").multiplier).toBeGreaterThan(
      alertFrictionFactor("minor").multiplier,
    )
  })

  it("costs points from a center with stretch summary", () => {
    const center = { lat: 37.77, lon: -122.42 }
    const points = costPointsFromCenter(
      center,
      [
        { id: "home", lat: 37.77, lon: -122.42, baselineMinutes: 0 },
        { id: "sfo", lat: 37.62, lon: -122.38, baselineMinutes: 28 },
        { id: "oak", lat: 37.8, lon: -122.27, baselineMinutes: 22 },
      ],
      {
        globalFactors: [weatherFrictionFactor({ precipitationMm: 12 })],
      },
    )
    const sfo = points.find((p) => p.id === "sfo")!
    expect(sfo.cost).toBeGreaterThan(sfo.baselineMinutes)
    // Friction stretch ≈ weather multiplier when baseline is authored.
    expect(sfo.stretch).toBeGreaterThan(1)
    expect(sfo.geographicStretch).toBeGreaterThan(sfo.stretch)
    const summary = summarizeStretch(points.filter((p) => p.id !== "home"))
    expect(summary.count).toBe(2)
    expect(summary.medianStretch).toBeGreaterThan(1)
  })

  it("builds stretch style rules and alert annotations", () => {
    const rules = stretchStyleRules({ hatchDanger: true })
    expect(rules).toHaveLength(2)
    expect(rules[1].style?.fill).toMatchObject({ type: "hatch" })

    const ann = alertToAnnotation({
      id: "alert-1",
      label: "Wind Advisory",
      createdAt: Date.UTC(2026, 6, 10),
      type: "y-threshold",
      value: 1.2,
    })
    expect(ann.provenance.authorKind).toBe("system")
    expect(ann.lifecycle.ttlHint).toBe("P2D")
    expect(ann.provenance.stableId).toBe("alert-1")
  })

  it("greatCircleMinutes scales with speed", () => {
    const a = { lat: 40.7, lon: -74 }
    const b = { lat: 40.8, lon: -73.9 }
    const slow = greatCircleMinutes(a, b, { speedKmh: 24 })
    const fast = greatCircleMinutes(a, b, { speedKmh: 48 })
    expect(slow).toBeCloseTo(fast * 2, 5)
    expect(stretchIndex(120, 100)).toBeCloseTo(1.2)
  })
})
