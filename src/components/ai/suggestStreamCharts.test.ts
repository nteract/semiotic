import { describe, it, expect } from "vitest"
import {
  suggestStreamCharts,
  explainStreamCapabilityFit,
  registerStreamChartCapability,
  unregisterStreamChartCapability,
} from "./suggestStreamCharts"
import type { StreamSchema, StreamChartCapability } from "./streamingTypes"
import { registerIntent } from "./intents"

const latencyStream: StreamSchema = {
  fields: [
    { name: "ts", kind: "date" },
    { name: "latency_ms", kind: "numeric" },
    { name: "endpoint", kind: "categorical" },
  ],
  throughput: "medium",
  retention: "windowed",
}

const highVolumeStream: StreamSchema = {
  fields: [
    { name: "ts", kind: "date" },
    { name: "value", kind: "numeric" },
  ],
  throughput: "high",
  retention: "windowed",
}

const pureValueStream: StreamSchema = {
  fields: [
    { name: "ts", kind: "date" },
    { name: "value", kind: "numeric" },
    { name: "cohort", kind: "categorical" },
  ],
}

const keyedBrandStream: StreamSchema = {
  fields: [
    { name: "brand", kind: "categorical", role: "category" },
    { name: "revenue", kind: "numeric", role: "value" },
  ],
  shape: "keyed",
  retention: "cumulative",
}

const aggregateStream: StreamSchema = {
  fields: [{ name: "revenue", kind: "numeric", role: "value" }],
  shape: "aggregate",
}

describe("suggestStreamCharts", () => {
  it("recommends RealtimeLineChart for medium-throughput trend", () => {
    const { suggestions } = suggestStreamCharts(latencyStream, { intent: "trend" })
    expect(suggestions[0].component).toBe("RealtimeLineChart")
  })

  it("aggregates the line into windows for high-throughput trends", () => {
    const { suggestions } = suggestStreamCharts(highVolumeStream, { intent: "trend" })
    expect(suggestions[0].component).toBe("RealtimeLineChart")
    expect(suggestions[0].props.aggregate).toEqual({ size: "1s", stat: "mean" })
    expect(suggestions[0].reasons.join(" ")).toMatch(/1s windows/)
    expect(suggestions[1].component).toBe("RealtimeHeatmap")
  })

  it("never suggests a raw per-event line, swarm, or waterfall at high throughput", () => {
    for (const throughput of ["high", 250] as const) {
      const { suggestions, excluded } = suggestStreamCharts({
        ...pureValueStream,
        throughput,
      })
      const line = suggestions.find((s) => s.component === "RealtimeLineChart")
      expect(line?.props.aggregate).toBeDefined()
      expect(excluded.find((e) => e.component === "RealtimeSwarmChart")?.reason).toMatch(/every event/)
      expect(excluded.find((e) => e.component === "RealtimeWaterfallChart")?.reason).toMatch(/one bar per event/)
    }
  })

  it("ranks value-distribution charts, not the temporal histogram, for distribution", () => {
    const { suggestions } = suggestStreamCharts(latencyStream, { intent: "distribution" })
    expect(["RealtimeSwarmChart", "RealtimeHeatmap"]).toContain(suggestions[0].component)
    expect(suggestions.slice(0, 2).map((s) => s.component)).toContain("RealtimeHeatmap")
  })

  it("recommends RealtimeSwarmChart for outlier detection with categories", () => {
    const { suggestions } = suggestStreamCharts(pureValueStream, { intent: "outlier-detection" })
    expect(suggestions[0].component).toBe("RealtimeSwarmChart")
  })

  it("includes ready-to-use props", () => {
    const { suggestions } = suggestStreamCharts(latencyStream, { intent: "trend" })
    expect(suggestions[0].props.timeAccessor).toBe("ts")
    expect(suggestions[0].props.valueAccessor).toBe("latency_ms")
    expect(suggestions[0].requiresLiveData).toBe(true)
  })

  it("surfaces cumulative-retention caveat for line chart", () => {
    const cumulativeStream: StreamSchema = {
      fields: [
        { name: "ts", kind: "date" },
        { name: "value", kind: "numeric" },
      ],
      throughput: "low",
      retention: "cumulative",
    }
    const { suggestions } = suggestStreamCharts(cumulativeStream, { intent: "trend" })
    const line = suggestions.find((s) => s.component === "RealtimeLineChart")
    expect(line?.props.windowMode).toBe("growing")
    expect(line?.caveats.some((c) => c.includes("maxCapacity"))).toBe(true)
  })

  it("respects user-registered capabilities with a custom importPath", () => {
    const custom: StreamChartCapability = {
      component: "MyStreamChart",
      family: "custom",
      importPath: "@acme/charts",
      rubric: { familiarity: 1, accuracy: 5, precision: 5 },
      fits: () => null,
      intentScores: { "trend": 5 },
      buildProps: () => ({}),
    }
    registerStreamChartCapability(custom)
    try {
      const { suggestions } = suggestStreamCharts(latencyStream, { allow: ["MyStreamChart"] })
      expect(suggestions[0].component).toBe("MyStreamChart")
      expect(suggestions[0].importPath).toBe("@acme/charts")
    } finally {
      unregisterStreamChartCapability("MyStreamChart")
    }
  })

  it("composes registered intent scores for stream capabilities", () => {
    registerIntent({
      id: "stream-momentum-test",
      label: "Stream momentum",
      description: "Track sustained trends and abrupt changes.",
      composes: ["trend", "change-detection"],
    })

    const { suggestions } = suggestStreamCharts(latencyStream, {
      allow: ["RealtimeLineChart"],
      intent: "stream-momentum-test",
    })
    expect(suggestions[0].score).toBe(4.5)
    expect(suggestions[0].intentScores["stream-momentum-test"]).toBe(4.5)
  })

  it("recommends BarChart for a keyed category/measure schema", () => {
    const { suggestions, excluded } = suggestStreamCharts(keyedBrandStream, {
      intent: "compare-categories",
    })
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0].component).toBe("BarChart")
    expect(suggestions[0].family).toBe("categorical")
    expect(suggestions[0].importPath).toBe("semiotic/ordinal")
    expect(suggestions[0].props.categoryAccessor).toBe("brand")
    expect(suggestions[0].props.valueAccessor).toBe("revenue")
    expect(excluded.some((e) => e.component === "RealtimeLineChart")).toBe(true)
  })

  it("recommends BigNumber / GaugeChart for a single-row aggregate", () => {
    const { suggestions } = suggestStreamCharts(aggregateStream, { intent: "part-to-whole" })
    expect(suggestions.map((s) => s.component)).toEqual(
      expect.arrayContaining(["BigNumber", "GaugeChart"]),
    )
    expect(suggestions.find((s) => s.component === "BarChart")).toBeUndefined()
    expect(suggestions[0].props).toMatchObject({ value: 0 })
  })

  it("prefers the value role over an id-like numeric column", () => {
    const schema: StreamSchema = {
      fields: [
        { name: "ts", kind: "date" },
        { name: "order_id", kind: "numeric" },
        { name: "latency_ms", kind: "numeric", role: "value" },
      ],
      throughput: "low",
    }
    const { suggestions } = suggestStreamCharts(schema, {
      allow: ["RealtimeLineChart"],
    })
    expect(suggestions[0].props.valueAccessor).toBe("latency_ms")
  })

  it("skips id-like names when no value role is set", () => {
    const schema: StreamSchema = {
      fields: [
        { name: "ts", kind: "date" },
        { name: "order_id", kind: "numeric" },
        { name: "latency_ms", kind: "numeric" },
      ],
      throughput: "low",
    }
    const { suggestions } = suggestStreamCharts(schema, {
      allow: ["RealtimeLineChart"],
    })
    expect(suggestions[0].props.valueAccessor).toBe("latency_ms")
  })

  it("applies audience bias and returns stretch suggestions", () => {
    const { suggestions, stretchSuggestions } = suggestStreamCharts(keyedBrandStream, {
      intent: "compare-categories",
      maxResults: 1,
      audience: {
        name: "Ops",
        familiarity: { BarChart: 5, PieChart: 2 },
        targets: {
          PieChart: { direction: "increase", weight: 2, reason: "grow share encodings" },
        },
        exposureLevel: 1,
      },
    })
    expect(suggestions[0].component).toBe("BarChart")
    expect(stretchSuggestions.some((s) => s.suggestion.component === "PieChart")).toBe(true)
  })

  it("honors a zero stretch budget", () => {
    const result = suggestStreamCharts(keyedBrandStream, {
      maxResults: 0, maxStretchResults: 0,
      audience: { familiarity: { PieChart: 2 } },
    })
    expect(result.stretchSuggestions).toEqual([])
  })

  it("explainStreamCapabilityFit returns the same excluded list", () => {
    const explained = explainStreamCapabilityFit(keyedBrandStream)
    expect(explained.excluded.length).toBeGreaterThan(0)
    expect(explained.excluded.find((e) => e.component === "RealtimeLineChart")?.reason).toMatch(/time/i)
    expect(explained.suggestions.some((s) => s.component === "BarChart")).toBe(true)
  })
})

describe("suggestStreamCharts schema semantics", () => {
  const names = (list: ReadonlyArray<{ component: string }>) => list.map((s) => s.component)

  it("treats a documented keyFields column as the category of a keyed table", () => {
    const { suggestions, excluded } = suggestStreamCharts({
      fields: [
        { name: "brand", kind: "categorical" },
        { name: "revenue", kind: "numeric", role: "value" },
        { name: "units", kind: "numeric", role: "value" },
      ],
      shape: "keyed",
      keyFields: ["brand"],
      retention: "cumulative",
      throughput: 5,
    })
    expect(suggestions[0].component).toBe("BarChart")
    expect(suggestions[0].props).toMatchObject({ categoryAccessor: "brand", valueAccessor: "revenue" })
    // One current row per key: nothing is summed, so no additivity caveat,
    // only how to keep a changelog to one row per key.
    expect(suggestions[0].caveats).toEqual([
      expect.stringMatching(/applyChangelog.*frameProps\.dataIdAccessor set to "brand"/),
    ])
    expect(excluded.some((e) => e.reason === "needs a category field")).toBe(false)
    expect(excluded.find((e) => e.component === "BigNumber")?.reason).toMatch(/keyed table/)
  })

  it("lets an explicit category role win on a key column", () => {
    const { suggestions } = suggestStreamCharts({
      fields: [
        { name: "brand", kind: "categorical", role: "category" },
        { name: "revenue", kind: "numeric" },
      ],
      shape: "keyed",
      keyFields: ["brand"],
    })
    expect(suggestions[0].props.categoryAccessor).toBe("brand")
  })

  it("leads with one line per series for a windowed keyed series", () => {
    const schema: StreamSchema = {
      fields: [
        { name: "window_start", kind: "date", role: "x" },
        { name: "brand", kind: "categorical" },
        { name: "cnt", kind: "numeric", role: "value" },
      ],
      shape: "keyed",
      keyFields: ["window_start", "brand"],
      retention: "cumulative",
      throughput: 5,
    }
    const { suggestions } = suggestStreamCharts(schema)
    expect(suggestions[0].component).toBe("RealtimeLineChart")
    expect(suggestions[0].props.seriesAccessor).toBe("brand")
    const compare = suggestStreamCharts(schema, { intent: "compare-series" })
    expect(compare.suggestions[0]).toMatchObject({ component: "RealtimeLineChart", score: 4 })
  })

  it("ranks a measure over time as a trend when no intent is given", () => {
    const result = suggestStreamCharts({
      fields: [
        { name: "ts", kind: "date", role: "x" },
        { name: "price", kind: "numeric", role: "value" },
      ],
      throughput: "medium",
      retention: "windowed",
    })
    expect(result.rankingIntents[0]).toBe("trend")
    expect(result.suggestions[0].component).toBe("RealtimeLineChart")
  })

  it("demotes the running-total waterfall unless the measure is a change", () => {
    const fields = (value: Record<string, unknown>) => ({
      fields: [{ name: "ts", kind: "date" as const }, { kind: "numeric" as const, ...value } as never],
    })
    const level = suggestStreamCharts(fields({ name: "price" }), { intent: "change-detection" })
    const waterfall = level.suggestions.find((s) => s.component === "RealtimeWaterfallChart")
    expect(waterfall?.score).toBe(2.5)
    expect(waterfall?.caveats.join(" ")).toMatch(/signed change/)

    const delta = suggestStreamCharts(fields({ name: "price_delta" }), { intent: "change-detection" })
    expect(delta.suggestions[0].component).toBe("RealtimeWaterfallChart")
    expect(delta.suggestions[0].caveats).toEqual([])

    const ruledOut = suggestStreamCharts(fields({ name: "price", additive: false }))
    expect(ruledOut.excluded.find((e) => e.component === "RealtimeWaterfallChart")?.reason).toMatch(/non-additive/)
  })

  it("says what an append-stream bar sums, and excludes it for non-additive measures", () => {
    const base = [
      { name: "ts", kind: "date" as const },
      { name: "band", kind: "categorical" as const },
    ]
    const unknown = suggestStreamCharts({ fields: [...base, { name: "price", kind: "numeric" }] }, { intent: "rank" })
    const bar = unknown.suggestions.find((s) => s.component === "BarChart")
    expect(bar?.score).toBe(2.5)
    expect(bar?.caveats.join(" ")).toMatch(/sums "price" across every retained event per "band"/)

    const level = suggestStreamCharts({ fields: [...base, { name: "price", kind: "numeric", additive: false }] })
    for (const component of ["BarChart", "PieChart", "DonutChart"]) {
      expect(level.excluded.find((e) => e.component === component)?.reason).toMatch(/non-additive/)
    }

    const amount = suggestStreamCharts({ fields: [...base, { name: "amount", kind: "numeric", additive: true }] }, { intent: "rank" })
    expect(amount.suggestions[0]).toMatchObject({ component: "BarChart", score: 5 })
  })

  it("drops zero-scored charts by default and keeps them with minScore 0", () => {
    const schema: StreamSchema = {
      fields: [{ name: "ts", kind: "date" }, { name: "price", kind: "numeric" }],
    }
    expect(suggestStreamCharts(schema, { intent: "rank" }).suggestions).toEqual([])
    const kept = suggestStreamCharts(schema, { intent: "rank", minScore: 0 }).suggestions
    expect(kept.length).toBeGreaterThan(0)
    expect(kept.every((s) => s.score === 0)).toBe(true)
  })

  it("uses declared cardinality for pie fits and series caveats", () => {
    const schema = (cardinality: number): StreamSchema => ({
      fields: [
        { name: "ts", kind: "date" },
        { name: "price", kind: "numeric" },
        { name: "brand", kind: "categorical", cardinality },
      ],
    })
    const many = suggestStreamCharts(schema(400))
    expect(many.excluded.find((e) => e.component === "PieChart")?.reason).toBe("400 slices is too many for a pie chart")
    expect(many.excluded.find((e) => e.component === "DonutChart")?.reason).toMatch(/400 slices/)
    expect(many.suggestions.find((s) => s.component === "RealtimeLineChart")?.caveats.join(" ")).toMatch(/~400 lines/)

    const few = suggestStreamCharts(schema(4), { intent: "part-to-whole", minScore: 0 })
    const pie = few.suggestions.find((s) => s.component === "PieChart")
    expect(pie?.caveats.some((c) => c.includes("cardinality"))).toBe(false)
  })

  it("sizes buffers and bins from the numeric event rate", () => {
    const schema = (throughput: number): StreamSchema => ({
      fields: [{ name: "ts", kind: "date" }, { name: "price", kind: "numeric" }],
      throughput,
    })
    const histogram = (rate: number) =>
      suggestStreamCharts(schema(rate)).suggestions.find((s) => s.component === "RealtimeHistogram")!.props
    expect(histogram(260)).toMatchObject({ windowSize: 7800, binSize: 1000 })
    expect(histogram(4000)).toMatchObject({ windowSize: 20000, binSize: 250 })
    const heatmap = suggestStreamCharts(schema(4000)).suggestions.find((s) => s.component === "RealtimeHeatmap")
    expect(heatmap?.props.windowSize).toBe(20000)
  })

  it("covers correlation and composition-over-time on streams", () => {
    const correlation = suggestStreamCharts(
      {
        fields: [
          { name: "ts", kind: "date" },
          { name: "price", kind: "numeric" },
          { name: "qty", kind: "numeric" },
          { name: "band", kind: "categorical" },
        ],
      },
      { intent: "correlation" },
    )
    expect(correlation.suggestions[0]).toMatchObject({
      component: "Scatterplot",
      importPath: "semiotic/xy",
      props: { xAccessor: "price", yAccessor: "qty", colorBy: "band" },
    })

    const composition = suggestStreamCharts(
      {
        fields: [
          { name: "window_start", kind: "date" },
          { name: "brand", kind: "categorical" },
          { name: "cnt", kind: "numeric" },
        ],
      },
      { intent: "composition-over-time" },
    )
    expect(composition.suggestions[0]).toMatchObject({
      component: "RealtimeHistogram",
      props: { categoryAccessor: "brand", valueAccessor: "cnt" },
    })
  })

  it("counts events per bin for streams without a measure", () => {
    for (const extra of [
      { name: "page", kind: "categorical" as const },
      { name: "ok", kind: "boolean" as const },
      { name: "order_id", kind: "numeric" as const },
    ]) {
      const { suggestions } = suggestStreamCharts({
        fields: [{ name: "ts", kind: "date" }, extra],
        throughput: "high",
      })
      expect(names(suggestions)).toEqual(["RealtimeHistogram"])
      expect(suggestions[0].props).toMatchObject({ timeAccessor: "ts", aggregation: "count" })
      expect(typeof suggestions[0].props.binSize).toBe("number")
    }
  })

  it("names the field-order choice when several categoricals compete", () => {
    const { suggestions } = suggestStreamCharts({
      fields: [
        { name: "ts", kind: "date" },
        { name: "price", kind: "numeric" },
        { name: "a", kind: "categorical" },
        { name: "b", kind: "categorical" },
        { name: "c", kind: "categorical" },
      ],
    })
    const line = suggestions.find((s) => s.component === "RealtimeLineChart")
    expect(line?.props.seriesAccessor).toBe("a")
    expect(line?.reasons.join(" ")).toMatch(/"a" picked from "a", "b", "c" by field order/)
  })

  it("scores a single value the same whether or not shape says aggregate", () => {
    const fields = [{ name: "total", kind: "numeric" as const }]
    const plain = suggestStreamCharts({ fields })
    const aggregate = suggestStreamCharts({ fields, shape: "aggregate" })
    expect(plain.suggestions.map((s) => [s.component, s.score])).toEqual(
      aggregate.suggestions.map((s) => [s.component, s.score]),
    )
    const gauge = plain.suggestions.find((s) => s.component === "GaugeChart")!
    expect(gauge.props).not.toHaveProperty("max")
    expect(gauge.caveats.join(" ")).toMatch(/range of "total" is unknown/)
    expect(plain.suggestions[0].caveats.join(" ")).toMatch(/latest event/)

    const pct = suggestStreamCharts({ fields: [{ name: "success_pct", kind: "numeric" }] })
    expect(pct.suggestions.find((s) => s.component === "GaugeChart")?.props).toMatchObject({ min: 0, max: 100 })
  })

  it("reports and repairs bad schema input", () => {
    const result = suggestStreamCharts({
      fields: [
        { name: "ts", kind: "timestamp" as never, role: "x" },
        { name: "p", kind: "numeric" },
        { name: "p", kind: "numeric" },
        { name: "band", kind: "categorical", distinctCount: 4 } as never,
      ],
      throughput: "extreme" as never,
      rowsPerSecond: 10,
    } as StreamSchema)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/field "ts" has kind "timestamp"; treated as "date"/),
        expect.stringMatching(/field "p" is listed more than once/),
        expect.stringMatching(/field "band" has unknown key "distinctCount" \(did you mean "cardinality"\?\)/),
        expect.stringMatching(/throughput "extreme" was ignored/),
        expect.stringMatching(/unknown schema key "rowsPerSecond"/),
      ]),
    )
    // The time field survives the alias repair.
    expect(result.suggestions[0].component).toBe("RealtimeLineChart")
    expect(suggestStreamCharts({ fields: [] }).warnings).toEqual(["schema has no fields"])
  })

  it("explains a single component's fit", () => {
    const schema: StreamSchema = {
      fields: [{ name: "ts", kind: "date" }, { name: "price", kind: "numeric" }],
    }
    expect(explainStreamCapabilityFit(schema, "RealtimeLineChart")).toMatchObject({
      status: "suggested",
      rank: 1,
    })
    expect(explainStreamCapabilityFit(schema, "BarChart")).toMatchObject({
      status: "excluded",
      reason: "needs a category field",
    })
    expect(explainStreamCapabilityFit(schema, "RealtimeHeatmap", { deny: ["RealtimeHeatmap"] })).toMatchObject({
      status: "filtered",
      reason: "listed in options.deny",
    })
    expect(explainStreamCapabilityFit(schema, "Nope").status).toBe("unknown")
  })

  it("redirects TemporalHistogram to RealtimeHistogram for streams", () => {
    const { excluded, suggestions } = suggestStreamCharts({
      fields: [{ name: "ts", kind: "date" }, { name: "price", kind: "numeric" }],
      retention: "cumulative",
    })
    expect(excluded.find((e) => e.component === "TemporalHistogram")?.reason).toMatch(/RealtimeHistogram/)
    expect(suggestions.find((s) => s.component === "RealtimeHistogram")?.props.windowMode).toBe("growing")
  })
})
