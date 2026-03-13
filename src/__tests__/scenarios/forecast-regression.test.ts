/**
 * Scenario tests: Statistical forecast and anomaly detection.
 *
 * Tests mathematical correctness of forecast computations, not just
 * that the function doesn't crash. Verifies regression slopes,
 * confidence interval widening, segment transitions, and the
 * composition of forecast + anomaly features.
 */
import { describe, it, expect } from "vitest"
import {
  buildForecast,
  buildAnomalyAnnotations,
  createSegmentLineStyle,
  SEGMENT_FIELD,
} from "../../components/charts/shared/statisticalOverlays"
import type { ForecastConfig } from "../../components/charts/shared/statisticalOverlays"

// ── Helpers ─────────────────────────────────────────────────────────────

/** Create perfectly linear data: y = slope * x + intercept */
function linearData(n: number, slope: number, intercept: number) {
  return Array.from({ length: n }, (_, i) => ({
    x: i,
    y: slope * i + intercept,
  }))
}

/** Create data with known noise pattern */
function noisyLinearData(n: number, slope: number, intercept: number, noise: number[]) {
  return Array.from({ length: n }, (_, i) => ({
    x: i,
    y: slope * i + intercept + (noise[i % noise.length] || 0),
  }))
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("Forecast Regression Correctness", () => {
  // 1. Linear regression on perfectly linear data reproduces exact values
  it("perfectly linear data produces forecast points on the same line", () => {
    const data = linearData(20, 3, 10) // y = 3x + 10
    const result = buildForecast(data, "x", "y", {
      trainEnd: 15,
      steps: 5,
    })

    const forecastPoints = result.processedData.filter(
      (d) => d[SEGMENT_FIELD] === "forecast" && d.x > 19
    )

    // Each forecast point should be very close to y = 3x + 10
    for (const fp of forecastPoints) {
      const expected = 3 * fp.x + 10
      expect(fp.y).toBeCloseTo(expected, 0) // within 1 unit
    }
  })

  // 2. Confidence intervals widen monotonically as forecast extends
  it("confidence intervals widen as forecast extends further from training data", () => {
    const data = noisyLinearData(30, 2, 5, [1, -1, 0.5, -0.5, 0.3])
    const result = buildForecast(data, "x", "y", {
      trainEnd: 20,
      steps: 10,
      confidence: 0.95,
    })

    const forecastWithBounds = result.processedData
      .filter(
        (d) =>
          d[SEGMENT_FIELD] === "forecast" &&
          d.__forecastUpper !== undefined &&
          d.__forecastLower !== undefined
      )
      .sort((a, b) => a.x - b.x)

    // Need at least 2 forecast points with bounds to check widening
    expect(forecastWithBounds.length).toBeGreaterThanOrEqual(2)

    // Each successive point should have a wider or equal interval
    for (let i = 1; i < forecastWithBounds.length; i++) {
      const prevWidth =
        forecastWithBounds[i - 1].__forecastUpper -
        forecastWithBounds[i - 1].__forecastLower
      const currWidth =
        forecastWithBounds[i].__forecastUpper -
        forecastWithBounds[i].__forecastLower
      expect(currWidth).toBeGreaterThanOrEqual(prevWidth - 0.001) // allow float rounding
    }
  })

  // 3. Forecast segments are contiguous (no gaps between training → observed → forecast)
  it("segment transitions share boundary points (no line gaps)", () => {
    const data = linearData(30, 1, 0)
    const result = buildForecast(data, "x", "y", {
      trainEnd: 15,
      steps: 5,
    })

    const sorted = result.processedData.sort((a, b) => a.x - b.x)

    // Find segment transition points
    const transitions: Array<{ from: string; to: string; x: number }> = []
    for (let i = 0; i < sorted.length - 1; i++) {
      const segA = sorted[i][SEGMENT_FIELD]
      const segB = sorted[i + 1][SEGMENT_FIELD]
      if (segA !== segB) {
        transitions.push({ from: segA, to: segB, x: sorted[i].x })
        // Boundary point should share the same x-value
        expect(sorted[i + 1].x).toBe(sorted[i].x)
      }
    }

    // Should have at least one transition (training → observed or observed → forecast)
    expect(transitions.length).toBeGreaterThanOrEqual(1)
  })

  // 4. Zero-variance data produces flat forecast with zero-width confidence intervals
  it("constant data produces flat forecast with tight bounds", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 42 }))
    const result = buildForecast(data, "x", "y", {
      trainEnd: 15,
      steps: 5,
      confidence: 0.95,
    })

    const forecastPoints = result.processedData.filter(
      (d) =>
        d[SEGMENT_FIELD] === "forecast" && d.__forecastUpper !== undefined
    )

    for (const fp of forecastPoints) {
      expect(fp.y).toBeCloseTo(42, 1)
      // With zero variance, upper ≈ lower ≈ 42
      expect(fp.__forecastUpper).toBeCloseTo(42, 0)
      expect(fp.__forecastLower).toBeCloseTo(42, 0)
    }
  })

  // 5. Forecast + anomaly compose: both annotation types present
  it("forecast and anomaly annotations coexist without conflicts", () => {
    const data = linearData(30, 1, 0)
    const result = buildForecast(
      data,
      "x",
      "y",
      { trainEnd: 20, steps: 5 },
      { threshold: 2, anomalyColor: "#ff0000" }
    )

    const types = result.annotations.map((a) => a.type)
    expect(types).toContain("envelope") // from forecast
    expect(types).toContain("x-threshold") // from forecast
    expect(types).toContain("anomaly-band") // from anomaly

    // Anomaly band has our custom color
    const band = result.annotations.find((a) => a.type === "anomaly-band")!
    expect(band.anomalyColor).toBe("#ff0000")
  })

  // 6. Pre-computed mode correctly tags all segment types
  it("pre-computed forecast correctly identifies training/observed/forecast segments", () => {
    const data = [
      { x: 0, y: 10, train: true, fc: false },
      { x: 1, y: 15, train: true, fc: false },
      { x: 2, y: 20, train: true, fc: false },
      { x: 3, y: 22, train: false, fc: false },
      { x: 4, y: 25, train: false, fc: false },
      { x: 5, y: 28, train: false, fc: true },
      { x: 6, y: 30, train: false, fc: true },
      { x: 7, y: 33, train: false, fc: true },
    ]

    const result = buildForecast(data, "x", "y", {
      isTraining: "train",
      isForecast: "fc",
    })

    const training = result.processedData.filter((d) => d[SEGMENT_FIELD] === "training")
    const observed = result.processedData.filter((d) => d[SEGMENT_FIELD] === "observed")
    const forecast = result.processedData.filter((d) => d[SEGMENT_FIELD] === "forecast")

    // All three segments should have data (including boundary duplicates)
    expect(training.length).toBeGreaterThanOrEqual(3)
    expect(observed.length).toBeGreaterThanOrEqual(2)
    expect(forecast.length).toBeGreaterThanOrEqual(3)
  })

  // 7. Pre-computed anomaly marks are correctly identified
  it("pre-computed anomaly points are flagged in highlight annotation", () => {
    const data = [
      { x: 0, y: 10, isAnomaly: false },
      { x: 1, y: 100, isAnomaly: true }, // anomaly
      { x: 2, y: 12, isAnomaly: false },
      { x: 3, y: -50, isAnomaly: true }, // anomaly
      { x: 4, y: 11, isAnomaly: false },
    ]

    const result = buildForecast(data, "x", "y", {
      isAnomaly: "isAnomaly",
    })

    const highlight = result.annotations.find((a) => a.type === "highlight")
    expect(highlight).toBeDefined()
    expect(highlight!.filter).toBeDefined()

    // Verify filter correctly identifies anomalies
    expect(highlight!.filter(data[0])).toBe(false)
    expect(highlight!.filter(data[1])).toBe(true)
    expect(highlight!.filter(data[3])).toBe(true)
    expect(highlight!.filter(data[4])).toBe(false)
  })

  // 8. Segment line styles compose with base styles
  it("createSegmentLineStyle preserves all base properties while adding segment styles", () => {
    const baseStyle = () => ({
      stroke: "#333",
      strokeWidth: 2,
      opacity: 0.9,
      strokeLinecap: "round" as const,
    })

    const config: ForecastConfig = {
      trainDasharray: "10,5",
      forecastDasharray: "3,3",
      color: "#0066ff",
    }

    const styleFn = createSegmentLineStyle(baseStyle, config)

    // Training segment
    const training = styleFn({ [SEGMENT_FIELD]: "training" })
    expect(training.strokeDasharray).toBe("10,5")
    expect(training.strokeWidth).toBe(2) // preserved
    expect(training.opacity).toBe(0.9) // preserved
    expect(training.strokeLinecap).toBe("round") // preserved
    expect(training.stroke).toBe("#333") // training keeps base stroke

    // Forecast segment
    const forecast = styleFn({ [SEGMENT_FIELD]: "forecast" })
    expect(forecast.strokeDasharray).toBe("3,3")
    expect(forecast.stroke).toBe("#0066ff") // forecast uses custom color
    expect(forecast.strokeWidth).toBe(2) // preserved
    expect(forecast.opacity).toBe(0.9) // preserved

    // Observed segment — no dash, base stroke
    const observed = styleFn({ [SEGMENT_FIELD]: "observed" })
    expect(observed.strokeDasharray).toBeUndefined()
    expect(observed.stroke).toBe("#333")
  })
})
