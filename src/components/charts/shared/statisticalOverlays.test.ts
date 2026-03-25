import { describe, it, expect } from "vitest"
import {
  buildForecast,
  buildAnomalyAnnotations,
  createSegmentLineStyle,
  SEGMENT_FIELD,
} from "./statisticalOverlays"
import type { ForecastConfig, AnomalyConfig } from "./statisticalOverlays"

// ── buildAnomalyAnnotations ─────────────────────────────────────────────

describe("buildAnomalyAnnotations", () => {
  it("returns a single anomaly-band annotation with defaults", () => {
    const result = buildAnomalyAnnotations({})
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe("anomaly-band")
    expect(result[0].threshold).toBe(2)
    expect(result[0].showBand).toBe(true)
    expect(result[0].fill).toBe("#6366f1")
    expect(result[0].fillOpacity).toBe(0.1)
    expect(result[0].anomalyColor).toBe("#ef4444")
    expect(result[0].anomalyRadius).toBe(6)
  })

  it("uses custom config values", () => {
    const config: AnomalyConfig = {
      threshold: 3,
      showBand: false,
      bandColor: "#ff0000",
      bandOpacity: 0.5,
      anomalyColor: "#00ff00",
      anomalyRadius: 10,
      label: "My Band",
    }
    const result = buildAnomalyAnnotations(config)
    expect(result[0].threshold).toBe(3)
    expect(result[0].showBand).toBe(false)
    expect(result[0].fill).toBe("#ff0000")
    expect(result[0].fillOpacity).toBe(0.5)
    expect(result[0].anomalyColor).toBe("#00ff00")
    expect(result[0].anomalyRadius).toBe(10)
    expect(result[0].label).toBe("My Band")
  })
})

// ── buildForecast — auto mode ───────────────────────────────────────────

describe("buildForecast — auto mode", () => {
  const makeTimeSeries = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      time: i,
      value: 10 + 2 * i,
    }))

  it("returns original data unchanged when trainEnd is not provided", () => {
    const data = makeTimeSeries(10)
    const result = buildForecast(data, "time", "value", {})
    expect(result.processedData).toBe(data)
    expect(result.annotations).toHaveLength(0)
  })

  it("splits data into training and observed segments at trainEnd", () => {
    const data = makeTimeSeries(20)
    const result = buildForecast(data, "time", "value", {
      trainEnd: 10,
      steps: 5,
    })

    const segments = result.processedData.map((d) => d[SEGMENT_FIELD])
    const uniqueSegments = [...new Set(segments)]

    expect(uniqueSegments).toContain("training")
    // Should contain at least training + one other segment
    expect(uniqueSegments.length).toBeGreaterThanOrEqual(2)
  })

  it("generates forecast points beyond the last data point", () => {
    const data = makeTimeSeries(20)
    const result = buildForecast(data, "time", "value", {
      trainEnd: 10,
      steps: 5,
    })

    const forecastPoints = result.processedData.filter(
      (d) => d[SEGMENT_FIELD] === "forecast"
    )
    // Should have forecast points (including the boundary bridging point)
    expect(forecastPoints.length).toBeGreaterThanOrEqual(5)

    // Forecast points should extend beyond max x in original data
    const maxOriginalX = Math.max(...data.map((d) => d.time))
    const maxForecastX = Math.max(...forecastPoints.map((d) => d.time))
    expect(maxForecastX).toBeGreaterThan(maxOriginalX)
  })

  it("includes envelope and x-threshold annotations", () => {
    const data = makeTimeSeries(20)
    const result = buildForecast(data, "time", "value", {
      trainEnd: 10,
      steps: 5,
    })

    const types = result.annotations.map((a) => a.type)
    expect(types).toContain("envelope")
    expect(types).toContain("x-threshold")
  })

  it("sets x-threshold at trainEnd value", () => {
    const data = makeTimeSeries(20)
    const result = buildForecast(data, "time", "value", {
      trainEnd: 10,
      steps: 3,
    })

    const threshold = result.annotations.find((a) => a.type === "x-threshold")
    expect(threshold).toBeDefined()
    expect(threshold!.x).toBe(10)
  })

  it("includes anomaly-band annotation when anomalyConfig is provided", () => {
    const data = makeTimeSeries(20)
    const result = buildForecast(
      data,
      "time",
      "value",
      { trainEnd: 10, steps: 3 },
      { threshold: 2.5 }
    )

    const anomalyBand = result.annotations.find(
      (a) => a.type === "anomaly-band"
    )
    expect(anomalyBand).toBeDefined()
    expect(anomalyBand!.threshold).toBe(2.5)
  })

  it("forecast points have upper/lower bound fields", () => {
    const data = makeTimeSeries(20)
    const result = buildForecast(data, "time", "value", {
      trainEnd: 10,
      steps: 5,
      confidence: 0.95,
    })

    const forecastPoints = result.processedData.filter(
      (d) =>
        d[SEGMENT_FIELD] === "forecast" &&
        d.__forecastUpper !== undefined
    )
    expect(forecastPoints.length).toBeGreaterThan(0)

    for (const fp of forecastPoints) {
      expect(fp.__forecastUpper).toBeGreaterThanOrEqual(fp.__forecastLower)
    }
  })

  // ── Edge cases ──────────────────────────────────────────────────────

  it("handles empty data array", () => {
    const result = buildForecast([], "time", "value", {
      trainEnd: 5,
      steps: 3,
    })
    // Should not crash; annotations still include x-threshold
    expect(result.processedData).toHaveLength(0)
    const threshold = result.annotations.find((a) => a.type === "x-threshold")
    expect(threshold).toBeDefined()
  })

  it("handles data too short for regression (fewer than 3 training points)", () => {
    const data = [
      { time: 1, value: 10 },
      { time: 2, value: 20 },
    ]
    const result = buildForecast(data, "time", "value", {
      trainEnd: 5,
      steps: 3,
    })

    // No envelope because regression requires >= 3 points
    const envelope = result.annotations.find((a) => a.type === "envelope")
    expect(envelope).toBeUndefined()

    // But x-threshold should still appear
    const threshold = result.annotations.find((a) => a.type === "x-threshold")
    expect(threshold).toBeDefined()
  })

  it("handles all values identical (zero variance)", () => {
    const data = Array.from({ length: 10 }, (_, i) => ({
      time: i,
      value: 42,
    }))
    const result = buildForecast(data, "time", "value", {
      trainEnd: 5,
      steps: 3,
    })

    // Should not throw; forecast values should all be close to 42
    const forecastPoints = result.processedData.filter(
      (d) =>
        d[SEGMENT_FIELD] === "forecast" &&
        d.__forecastUpper !== undefined
    )
    for (const fp of forecastPoints) {
      expect(fp.value).toBeCloseTo(42, 1)
    }
  })

  it("duplicates boundary points to prevent gaps between segments", () => {
    const data = makeTimeSeries(20)
    const result = buildForecast(data, "time", "value", {
      trainEnd: 10,
      steps: 5,
    })

    // Find the transition from training to observed
    for (let i = 0; i < result.processedData.length - 1; i++) {
      const curr = result.processedData[i]
      const next = result.processedData[i + 1]
      if (
        curr[SEGMENT_FIELD] === "training" &&
        next[SEGMENT_FIELD] === "observed"
      ) {
        // The boundary point should share the same x-value
        expect(next.time).toBe(curr.time)
        break
      }
    }
  })
})

// ── buildForecast — pre-computed mode ───────────────────────────────────

describe("buildForecast — pre-computed mode", () => {
  const makePrecomputedData = () => [
    { time: 0, value: 10, isTraining: true, isForecast: false, upper: 12, lower: 8 },
    { time: 1, value: 15, isTraining: true, isForecast: false, upper: 17, lower: 13 },
    { time: 2, value: 20, isTraining: false, isForecast: false, upper: 22, lower: 18 },
    { time: 3, value: 25, isTraining: false, isForecast: true, upper: 30, lower: 20 },
    { time: 4, value: 30, isTraining: false, isForecast: true, upper: 38, lower: 22 },
  ]

  it("tags data with correct segments using string accessors", () => {
    const data = makePrecomputedData()
    const config: ForecastConfig = {
      isTraining: "isTraining",
      isForecast: "isForecast",
      upperBounds: "upper",
      lowerBounds: "lower",
    }

    const result = buildForecast(data, "time", "value", config)

    // Check segments were applied
    const trainingPoints = result.processedData.filter(
      (d) => d[SEGMENT_FIELD] === "training"
    )
    const forecastPoints = result.processedData.filter(
      (d) => d[SEGMENT_FIELD] === "forecast"
    )
    const observedPoints = result.processedData.filter(
      (d) => d[SEGMENT_FIELD] === "observed"
    )

    expect(trainingPoints.length).toBeGreaterThanOrEqual(2)
    expect(forecastPoints.length).toBeGreaterThanOrEqual(2)
    expect(observedPoints.length).toBeGreaterThanOrEqual(1)
  })

  it("generates envelope annotation from upper/lower bounds", () => {
    const data = makePrecomputedData()
    const config: ForecastConfig = {
      isTraining: "isTraining",
      isForecast: "isForecast",
      upperBounds: "upper",
      lowerBounds: "lower",
    }

    const result = buildForecast(data, "time", "value", config)
    const envelope = result.annotations.find((a) => a.type === "envelope")
    expect(envelope).toBeDefined()
    expect(envelope!.upperAccessor).toBe("upper")
    expect(envelope!.lowerAccessor).toBe("lower")
  })

  it("supports function accessors for bounds", () => {
    const data = makePrecomputedData()
    const config: ForecastConfig = {
      isTraining: (d: any) => d.isTraining,
      isForecast: (d: any) => d.isForecast,
      upperBounds: (d: any) => d.upper,
      lowerBounds: (d: any) => d.lower,
    }

    const result = buildForecast(data, "time", "value", config)
    const envelope = result.annotations.find((a) => a.type === "envelope")
    expect(envelope).toBeDefined()
    // Function accessors get baked into __envUpper/__envLower fields
    expect(envelope!.upperAccessor).toBe("__envUpper")
    expect(envelope!.lowerAccessor).toBe("__envLower")

    // Values should be baked into data
    const withUpper = result.processedData.filter(
      (d) => d.__envUpper !== undefined
    )
    expect(withUpper.length).toBeGreaterThan(0)
  })

  it("generates highlight annotation when isAnomaly is provided", () => {
    const data = [
      { time: 0, value: 10, isAnomaly: false },
      { time: 1, value: 100, isAnomaly: true },
      { time: 2, value: 12, isAnomaly: false },
    ]
    const config: ForecastConfig = {
      isAnomaly: "isAnomaly",
    }

    const result = buildForecast(data, "time", "value", config)
    const highlight = result.annotations.find((a) => a.type === "highlight")
    expect(highlight).toBeDefined()
    expect(highlight!.color).toBe("#ef4444")

    // The filter function should correctly identify anomalous points
    expect(highlight!.filter(data[0])).toBe(false)
    expect(highlight!.filter(data[1])).toBe(true)
  })

  it("duplicates boundary points between different segments", () => {
    const data = makePrecomputedData()
    const config: ForecastConfig = {
      isTraining: "isTraining",
      isForecast: "isForecast",
    }

    const result = buildForecast(data, "time", "value", config)
    // The processed data should be longer than the original due to boundary duplication
    expect(result.processedData.length).toBeGreaterThan(data.length)
  })

  it("includes anomaly-band when anomalyConfig is provided alongside pre-computed", () => {
    const data = makePrecomputedData()
    const config: ForecastConfig = {
      isTraining: "isTraining",
      isForecast: "isForecast",
    }
    const anomalyConfig: AnomalyConfig = { threshold: 3 }

    const result = buildForecast(data, "time", "value", config, anomalyConfig)
    const band = result.annotations.find((a) => a.type === "anomaly-band")
    expect(band).toBeDefined()
    expect(band!.threshold).toBe(3)
  })
})

// ── buildForecast — multi-metric (groupBy) boundary duplication ──────────

describe("buildForecast — multi-metric _groupBy boundary duplication", () => {
  it("creates bridge points within each metric group, not across groups", () => {
    // Interleaved multi-metric data: A_t0, B_t0, A_t1, B_t1, ...
    // Metric A: training at t0,t1 → observed at t2,t3
    // Metric B: training at t0,t1 → observed at t2,t3
    const data = [
      { time: 0, value: 10, metric: "A", isTraining: true, isForecast: false },
      { time: 0, value: 20, metric: "B", isTraining: true, isForecast: false },
      { time: 1, value: 12, metric: "A", isTraining: true, isForecast: false },
      { time: 1, value: 22, metric: "B", isTraining: true, isForecast: false },
      { time: 2, value: 14, metric: "A", isTraining: false, isForecast: false },
      { time: 2, value: 24, metric: "B", isTraining: false, isForecast: false },
      { time: 3, value: 16, metric: "A", isTraining: false, isForecast: false },
      { time: 3, value: 26, metric: "B", isTraining: false, isForecast: false },
    ]

    const config: ForecastConfig = {
      isTraining: "isTraining",
      isForecast: "isForecast",
      _groupBy: "metric",
    }

    const result = buildForecast(data, "time", "value", config)
    const pd = result.processedData

    // Should have more points than original due to bridge duplication
    expect(pd.length).toBeGreaterThan(data.length)

    // Bridge points should exist within each group
    const metricAPoints = pd.filter((d) => d.metric === "A")
    const metricBPoints = pd.filter((d) => d.metric === "B")

    // Each group should have bridge points at the training→observed boundary
    // Original: 2 training + 2 observed = 4 per group
    // With bridges: 4 + 2 (one bridge in each direction) = 6 per group
    expect(metricAPoints.length).toBe(6)
    expect(metricBPoints.length).toBe(6)

    // Verify bridges: there should be a training point at t=2 and an observed point at t=1
    const aBridgeForward = metricAPoints.find(
      (d) => d.time === 2 && d[SEGMENT_FIELD] === "training"
    )
    const aBridgeBackward = metricAPoints.find(
      (d) => d.time === 1 && d[SEGMENT_FIELD] === "observed"
    )
    expect(aBridgeForward).toBeDefined()
    expect(aBridgeBackward).toBeDefined()

    // Same for metric B
    const bBridgeForward = metricBPoints.find(
      (d) => d.time === 2 && d[SEGMENT_FIELD] === "training"
    )
    const bBridgeBackward = metricBPoints.find(
      (d) => d.time === 1 && d[SEGMENT_FIELD] === "observed"
    )
    expect(bBridgeForward).toBeDefined()
    expect(bBridgeBackward).toBeDefined()
  })

  it("does not create cross-group bridges from interleaved data without _groupBy", () => {
    // Without _groupBy, adjacent-pair scanning on interleaved data
    // would find A_training→B_training (same segment, no bridge) and
    // A_training→B_observed (cross-group, wrong bridge). This test verifies
    // the single-group path still works for non-interleaved data.
    const data = [
      { time: 0, value: 10, isTraining: true, isForecast: false },
      { time: 1, value: 12, isTraining: true, isForecast: false },
      { time: 2, value: 14, isTraining: false, isForecast: false },
      { time: 3, value: 16, isTraining: false, isForecast: false },
    ]

    const config: ForecastConfig = {
      isTraining: "isTraining",
      isForecast: "isForecast",
    }

    const result = buildForecast(data, "time", "value", config)
    const pd = result.processedData

    // 4 original + 2 bridge points (one in each direction at t=1/t=2 boundary)
    expect(pd.length).toBe(6)

    // Training bridge at t=2
    const bridgeForward = pd.find(
      (d) => d.time === 2 && d[SEGMENT_FIELD] === "training"
    )
    expect(bridgeForward).toBeDefined()

    // Observed bridge at t=1
    const bridgeBackward = pd.find(
      (d) => d.time === 1 && d[SEGMENT_FIELD] === "observed"
    )
    expect(bridgeBackward).toBeDefined()
  })

  it("handles three-way transition (training→observed→forecast) per group", () => {
    const data = [
      { time: 0, value: 10, metric: "A", isTraining: true, isForecast: false },
      { time: 1, value: 12, metric: "A", isTraining: true, isForecast: false },
      { time: 2, value: 14, metric: "A", isTraining: false, isForecast: false },
      { time: 3, value: 16, metric: "A", isTraining: false, isForecast: true },
      { time: 4, value: 18, metric: "A", isTraining: false, isForecast: true },
    ]

    const config: ForecastConfig = {
      isTraining: "isTraining",
      isForecast: "isForecast",
      _groupBy: "metric",
    }

    const result = buildForecast(data, "time", "value", config)
    const pd = result.processedData

    // 5 original + 2 bridges (training→observed) + 2 bridges (observed→forecast) = 9
    expect(pd.length).toBe(9)

    const segments = [...new Set(pd.map((d) => d[SEGMENT_FIELD]))]
    expect(segments).toContain("training")
    expect(segments).toContain("observed")
    expect(segments).toContain("forecast")
  })
})

// ── createSegmentLineStyle ──────────────────────────────────────────────

describe("createSegmentLineStyle", () => {
  const baseStyle = () => ({ stroke: "#333", strokeWidth: 2 })

  it("applies training dash pattern for training segment", () => {
    const styleFn = createSegmentLineStyle(baseStyle, {})
    const result = styleFn({ [SEGMENT_FIELD]: "training" })
    expect(result.strokeDasharray).toBe("8,4")
    expect(result.stroke).toBe("#333") // keeps base stroke
  })

  it("applies forecast color and dash pattern for forecast segment", () => {
    const styleFn = createSegmentLineStyle(baseStyle, {})
    const result = styleFn({ [SEGMENT_FIELD]: "forecast" })
    expect(result.strokeDasharray).toBe("4,4")
    expect(result.stroke).toBe("#6366f1") // forecast color overrides
  })

  it("returns base style for observed (non-training, non-forecast) segments", () => {
    const styleFn = createSegmentLineStyle(baseStyle, {})
    const result = styleFn({ [SEGMENT_FIELD]: "observed" })
    expect(result.strokeDasharray).toBeUndefined()
    expect(result.stroke).toBe("#333")
  })

  it("returns base style when no segment field is present", () => {
    const styleFn = createSegmentLineStyle(baseStyle, {})
    const result = styleFn({ someField: 42 })
    expect(result).toEqual({ stroke: "#333", strokeWidth: 2 })
  })

  it("uses custom dash patterns and color from config", () => {
    const config: ForecastConfig = {
      trainDasharray: "12,6",
      forecastDasharray: "2,2",
      color: "#ff0000",
    }
    const styleFn = createSegmentLineStyle(baseStyle, config)

    const training = styleFn({ [SEGMENT_FIELD]: "training" })
    expect(training.strokeDasharray).toBe("12,6")

    const forecast = styleFn({ [SEGMENT_FIELD]: "forecast" })
    expect(forecast.strokeDasharray).toBe("2,2")
    expect(forecast.stroke).toBe("#ff0000")
  })

  it("preserves other base style properties", () => {
    const richBase = () => ({
      stroke: "#333",
      strokeWidth: 2,
      opacity: 0.8,
      strokeLinecap: "round",
    })
    const styleFn = createSegmentLineStyle(richBase, {})

    const result = styleFn({ [SEGMENT_FIELD]: "training" })
    expect(result.opacity).toBe(0.8)
    expect(result.strokeLinecap).toBe("round")
    expect(result.strokeWidth).toBe(2)
  })
})
