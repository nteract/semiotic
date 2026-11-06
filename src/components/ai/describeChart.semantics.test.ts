import { describe, expect, it } from "vitest"
import { describeChart } from "./describeChart"
import { buildReaderGrounding } from "./readerGrounding"
import { buildNavigationTree } from "./navigationTree"
import { OrdinalPipelineStore } from "../stream/OrdinalPipelineStore"
import "../../test-utils/registerBuiltInXYPlugins"
import { PipelineStore } from "../stream/PipelineStore"

describe("descriptions follow rendered data semantics", () => {
  it("retains plain and compact number formatting when the locale is invalid", () => {
    const props = {
      data: [
        { x: 1, y: 12.345 },
        { x: 2, y: 20000 }
      ]
    }
    const result = describeChart("LineChart", props, {
      locale: "invalid_locale"
    })
    expect(result).toEqual(describeChart("LineChart", props, { locale: "en" }))
    expect(result.levels.l2).toContain("from 12.35 (1) to 20K (2)")
  })

  it.each(["LineChart", "AreaChart", "MinimapChart", "Scatterplot"])(
    "%s excludes invalid continuous x values before computing statistics",
    (component) => {
      const data = [
        { x: 3, y: 30 },
        { x: 1, y: 10 },
        { x: 2, y: 20 },
        { x: NaN, y: -100 }
      ]
      const result = buildReaderGrounding(component, { data })
      expect(result.description.levels.l2).toContain("from 10 (1) to 30 (3)")
      expect(result.description.levels.l2).toContain(
        "mean of 20 across 3 points"
      )
      expect(result.description.levels.l2).toContain("1 missing or non-finite")
      if (component !== "Scatterplot") {
        expect(result.description.levels.l3).toContain(
          "rises from 10 (1) to a peak of 30 (3)"
        )
        expect(result.intent?.sentence).toContain("rises from 10 (1) to 30 (3)")
      }
      expect(
        result.structure?.children?.filter((node) => node.role === "datum")
      ).toHaveLength(3)
      expect(result.structure?.children?.[0].label).toBe("X axis: x, 1 to 3.")
      expect(result.text).not.toContain("-100")
    }
  )

  it.each([
    { x: [3, 1, 2, NaN], indices: [1, 2, 0], axis: "1 to 3" },
    { x: [NaN, "3", "2026-01-01", 1, 2], indices: [3, 4, 1], axis: "1 to 3" },
    {
      x: ["bad", "2026-01-03", "3", "2026-01-01", "2026-01-02"],
      indices: [3, 4, 1],
      axis: "2026-01-01 to 2026-01-03"
    },
    {
      x: [undefined, null, "", 3, 1, 2],
      indices: [1, 2, 4, 5, 3],
      axis: "0 to 3"
    }
  ])("matches rendered rows and x bounds for $x", ({ x, indices, axis }) => {
    const data = x.map((value, i) => ({ x: value, y: i + 1 }))
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 10,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0.05
    })
    store.ingest({ inserts: data, bounded: true })
    store.computeScene({ width: 400, height: 200 })
    const line = store.scene.find((node) => node.type === "line")
    expect(line?.datum).toEqual(indices.map((i) => data[i]))
    const result = buildReaderGrounding("LineChart", { data })
    expect(result.structure?.children?.[0].label).toBe(`X axis: x, ${axis}.`)
    expect(
      result.structure?.children
        ?.filter((node) => node.role === "datum")
        .map((node) => node.datum)
    ).toEqual(data.filter((_row, i) => indices.includes(i)))
    expect(result.description.levels.l2).toContain(
      `across ${indices.length} points`
    )
  })

  it("keeps ISO category labels in distinct encounter order on ordinal axes", () => {
    const result = buildNavigationTree("BarChart", {
      data: ["2026-01-03", "2026-01-01", "2026-01-03"].map((category) => ({
        category,
        value: 10
      }))
    })
    expect(result.children?.[0].label).toBe(
      "Category axis: category, 2026-01-03 to 2026-01-01 (2 categories)."
    )
  })

  it("filters invalid x even before the first usable value and across function-defined series", () => {
    const result = buildReaderGrounding("LineChart", {
      data: [
        { t: new Date(NaN), v: -100, s: "A" },
        { t: "3", v: 30, s: "A" },
        { t: undefined, v: -200, s: "A" },
        { t: 1, v: 10, s: "B" },
        { t: Infinity, v: -300, s: "B" },
        { t: 2, v: 20, s: "B" },
        { t: "bad", v: -400, s: "B" }
      ],
      xAccessor: (row: { t: unknown }) => row.t,
      yAccessor: "v",
      lineBy: "s"
    })
    expect(result.description.levels.l2).toContain("mean of 20 across 3 points")
    expect(result.description.levels.l2).toContain("4 missing or non-finite")
    expect(result.structure?.children?.[0].label).toBe("X axis: x, 1 to 3.")
    expect(result.text).not.toMatch(/-100|-200|-300|-400/)
  })

  it("has no quantitative range when every continuous x is invalid", () => {
    const result = buildReaderGrounding("LineChart", {
      data: [
        { x: NaN, y: 1 },
        { x: new Date(NaN), y: 2 }
      ]
    })
    expect(result.description.levels.l2).toContain("No finite")
    expect(result.description.levels.l3).toBeUndefined()
    expect(result.structure?.children).toEqual([])
  })

  it.each(["LineChart", "AreaChart", "MinimapChart", "Scatterplot"])(
    "%s infers unhinted ISO dates for chronological navigation and labels",
    (component) => {
      const result = buildReaderGrounding(component, {
        data: [
          { x: "invalid", y: -100 },
          { x: "2026-01-03", y: 30 },
          { x: "2026-01-01", y: 10 },
          { x: "2026-01-02", y: 20 }
        ]
      })
      expect(result.structure?.children?.[0].label).toBe(
        "X axis: x, 2026-01-01 to 2026-01-03."
      )
      expect(
        result.structure?.children
          ?.filter((node) => node.role === "datum")
          .map((node) => node.label)
      ).toEqual(["2026-01-03: 30", "2026-01-01: 10", "2026-01-02: 20"])
      expect(result.description.levels.l2).toContain(
        "from 10 (2026-01-01) to 30 (2026-01-03)"
      )
    }
  )

  it("uses the inferred temporal axis for intraday labels with timezone offsets", () => {
    const props = {
      data: [
        { x: "2026-01-01T03:00:00+01:00", y: 20 },
        { x: "2026-01-01T01:00:00Z", y: 10 }
      ]
    }
    const result = buildReaderGrounding("LineChart", props)
    expect(result.description.levels.l3).toContain(
      "rises from 10 (2026-01-01T01:00:00.000Z)"
    )
    expect(result.description.levels.l3).toContain(
      "20 (2026-01-01T02:00:00.000Z)"
    )
    expect(result.structure?.children?.[0].label).toBe(
      "X axis: x, 2026-01-01T01:00:00.000Z to 2026-01-01T02:00:00.000Z."
    )
  })

  it.each([
    ["AreaChart", "An area chart"],
    ["OrbitDiagram", "An orbit diagram"],
    ["WaterfallChart", "A waterfall chart"],
    ["RadarChart", "A radar chart"],
    ["ChainReactionChart", "A chain reaction chart"],
    ["GauntletChart", "A gauntlet chart"],
    ["EventDropChart", "An event-drop physics chart"]
  ])("%s uses a grammatical chart-kind phrase", (component, introduction) => {
    const result = describeChart(component, { data: [] }, { levels: ["l1"] })
    expect(result.levels.l1?.startsWith(introduction)).toBe(true)
    expect(result.text).not.toMatch(/chart chart|^A [aeiou]/i)
  })

  it.each(["LineChart", "AreaChart", "MinimapChart"])(
    "%s narrates numeric x order without mutating caller rows",
    (component) => {
      const data = Object.freeze([
        Object.freeze({ x: 3, y: 40 }),
        Object.freeze({ x: 1, y: 20 }),
        Object.freeze({ x: 2, y: 30 }),
        Object.freeze({ x: 0, y: 10 })
      ])
      const result = buildReaderGrounding(component, { data })
      expect(result.description.levels.l3).toContain("rises from 10 (0)")
      expect(result.intent?.sentence).toContain("rises from 10 (0) to 40 (3)")
      expect(data.map((d) => d.x)).toEqual([3, 1, 2, 0])
    }
  )

  it.each(["date", "iso", "numeric string"])(
    "orders %s x values chronologically",
    (kind) => {
      const data = [3, 1, 2].map((day) => ({
        x:
          kind === "date"
            ? new Date(Date.UTC(2026, 0, day))
            : kind === "iso"
              ? `2026-01-0${day}`
              : String(day),
        y: day * 10
      }))
      const result = describeChart("LineChart", { data })
      expect(result.levels.l3).toContain("rises from 10")
      expect(result.levels.l3).toContain("to a peak of 30")
    }
  )

  it("honors a reversed x extent and function accessors", () => {
    const result = describeChart("LineChart", {
      data: [
        { t: 2, v: 20 },
        { t: 1, v: 10 },
        { t: 3, v: 30 },
        { t: NaN, v: -100 }
      ],
      xAccessor: (d: { t: number }) => d.t,
      yAccessor: (d: { v: number }) => d.v,
      xExtent: [3, 1]
    })
    expect(result.levels.l3).toContain("falls from 30 (3)")
    expect(result.levels.l3).toContain("to a low of 10 (1)")
  })

  it.each([
    "Scatterplot",
    "BubbleChart",
    "QuadrantChart",
    "ConnectedScatterplot"
  ])("%s does not infer a y trajectory from scatter row order", (component) => {
    const result = buildReaderGrounding(component, {
      data: [
        { x: 1, y: 3 },
        { x: 9, y: 20 },
        { x: 3, y: 1 }
      ]
    })
    expect(result.description.levels.l2).toContain("ranges from 1")
    expect(result.text).not.toMatch(/climbs|peak|rises|falls|recovers|drops to/)
  })

  it("reports the same category totals as rendered bars, including category colors", () => {
    const data = [
      { category: "A", value: 1 },
      { category: "A", value: 1 },
      { category: "A", value: 1 },
      { category: "A", value: 1 },
      { category: "B", value: 3 }
    ]
    const store = new OrdinalPipelineStore({
      chartType: "bar",
      oAccessor: "category",
      rAccessor: "value",
      windowSize: 100,
      windowMode: "sliding",
      extentPadding: 0.05,
      projection: "vertical"
    })
    store.ingest({ inserts: data, bounded: true })
    store.computeScene({ width: 400, height: 300 })
    expect(store.scene.map((mark) => mark.datum?.__aggregateValue)).toEqual([
      4, 3
    ])

    const result = buildReaderGrounding("BarChart", {
      data,
      colorBy: "category"
    })
    expect(result.description.levels.l1).not.toContain("split by")
    expect(result.description.levels.l2).toContain("from 3 (B) to 4 (A)")
    expect(result.description.levels.l2).toContain("2 categories")
    expect(result.description.levels.l3).toBe(
      "The highest category is A and the lowest is B."
    )
    expect(result.intent?.sentence).toContain("A leads at 4")
    expect(
      result.structure?.children?.some((node) => node.role === "series")
    ).toBe(false)
  })

  it("aggregates duplicate stack segments without pooling them into a trajectory", () => {
    const result = describeChart("StackedBarChart", {
      data: [
        { c: "A", s: "one", v: 1 },
        { c: "A", s: "one", v: 1 },
        { c: "A", s: "two", v: 3 },
        { c: "B", s: "one", v: 4 },
        { c: "B", s: "one", v: 2 }
      ],
      categoryAccessor: "c",
      valueAccessor: "v",
      stackBy: "s"
    })
    expect(result.levels.l2).toContain("from 2 (A / one) to 6 (B / one)")
    expect(result.levels.l2).toContain("3 segments")
    expect(result.levels.l3).toBeUndefined()
  })

  it.each(["DotPlot", "GroupedBarChart"])(
    "retains individual %s marks instead of summing them",
    (component) => {
      const result = describeChart(component, {
        data: [
          { category: "A", value: 1 },
          { category: "A", value: 2 },
          { category: "B", value: 4 }
        ]
      })
      expect(result.levels.l2).toContain("from 1 (A) to 4 (B)")
      expect(result.levels.l2).toContain("3 points")
    }
  )

  it("does not pool function-defined series into a false trend", () => {
    const result = buildReaderGrounding("LineChart", {
      data: [
        { x: 1, y: 10, s: "A" },
        { x: 2, y: 20, s: "A" },
        { x: 1, y: 100, s: "B" }
      ],
      lineBy: (d: { s: string }) => d.s
    })
    expect(result.description.levels.l3).toBeUndefined()
    expect(result.intent?.sentence).not.toMatch(/rises from|falls from/)
  })

  it("counts missing measures without turning them into a zero minimum", () => {
    const result = describeChart("LineChart", {
      data: [10, null, "", false, undefined, NaN, 12, 14].map((y, x) => ({
        x,
        y
      }))
    })
    expect(result.levels.l2).toContain("from 10 (0) to 14 (7)")
    expect(result.levels.l2).toContain("mean of 12 across 3 points")
    expect(result.levels.l2).toContain("5 missing")
    expect(result.levels.l3).not.toContain("low of 0")
    expect(
      describeChart("LineChart", { data: [{ x: 1, y: null }] }).levels.l2
    ).toContain("No finite")
  })

  it.each([1, 0.001, 1000])(
    "keeps L3 and L4 consistent for steady drift at scale %s",
    (scale) => {
      const result = buildReaderGrounding("LineChart", {
        data: [1000, 1008, 1016, 1024, 1030].map((y, x) => ({
          x,
          y: y * scale
        }))
      })
      expect(result.description.levels.l3).toContain("rises")
      expect(result.intent?.sentence).toContain("rises")
      expect(result.text).not.toContain("roughly where it started")
    }
  )

  it("reports tied and all-equal categories without inventing a sole leader", () => {
    const tied = buildReaderGrounding("BarChart", {
      data: [
        { category: "A", value: 10 },
        { category: "B", value: 10 },
        { category: "C", value: 3 }
      ]
    })
    expect(tied.description.levels.l3).toContain("A and B tie for highest")
    expect(tied.intent?.sentence).not.toContain("A leads")
    const equal = buildReaderGrounding("BarChart", {
      data: [
        { category: "A", value: 10 },
        { category: "B", value: 10 }
      ]
    })
    expect(equal.description.levels.l3).toContain("All categories equal 10")
    expect(equal.intent?.sentence).not.toMatch(/A leads|A ranks highest/)
  })

  it("describes a single observation without claiming a constant series", () => {
    const result = describeChart("LineChart", { data: [{ x: 1, y: 7 }] })
    expect(result.levels.l2).toContain("1 point")
    expect(result.levels.l3).toContain("single value of 7")
    expect(result.text).not.toContain("across the series")
  })

  it.each(["PieChart", "DonutChart"])(
    "reports %s magnitudes and discloses signed input",
    (component) => {
      const result = buildReaderGrounding(component, {
        data: [
          { category: "A", value: 100 },
          { category: "B", value: -60 },
          { category: "C", value: 10 }
        ]
      })
      expect(result.description.levels.l2).toContain("totaling 170")
      expect(result.description.levels.l2).toContain("negative")
      expect(result.description.levels.l2).toContain("absolute")
      expect(result.intent?.sentence).toContain("59%")
      expect(result.text).not.toContain("200%")
    }
  )

  it("discloses negative pie rows even when they cancel within a category", () => {
    const result = describeChart("PieChart", {
      data: [
        { category: "A", value: 10 },
        { category: "A", value: -10 },
        { category: "B", value: 5 }
      ]
    })
    expect(result.levels.l2).toContain("2 segments totaling 25")
    expect(result.levels.l2).toContain("Largest is A at 20")
    expect(result.levels.l2).toContain("negative")
  })

  it("withholds funnel shares when negative rows cancel within a stage", () => {
    const result = buildReaderGrounding("FunnelChart", {
      data: [
        { step: "A", value: 10 },
        { step: "A", value: -10 },
        { step: "B", value: 5 }
      ]
    })
    expect(result.description.levels.l2).toContain("Negative values")
    expect(result.text).not.toMatch(/\d+%/)
  })

  it("keeps default funnel stages distinct when aggregating repeated steps", () => {
    const result = describeChart("FunnelChart", {
      data: [
        { step: "Visit", value: 10 },
        { step: "Visit", value: 5 },
        { step: "Buy", value: 2 }
      ]
    })
    expect(result.levels.l2).toContain("2 segments totaling 17")
    expect(result.levels.l2).toContain(
      "Largest is Visit at 15; smallest is Buy at 2"
    )
  })

  it("keeps funnel categories within their stages", () => {
    const result = buildReaderGrounding("FunnelChart", {
      data: [
        { stage: "Visit", channel: "A", n: 10 },
        { stage: "Visit", channel: "A", n: 5 },
        { stage: "Visit", channel: "B", n: 4 },
        { stage: "Buy", channel: "A", n: 2 }
      ],
      stepAccessor: "stage",
      categoryAccessor: "channel",
      valueAccessor: "n"
    })
    expect(result.description.levels.l2).toContain("3 segments totaling 21")
    expect(result.description.levels.l2).toContain(
      "Largest is Visit / A at 15; smallest is Buy / A at 2"
    )
    expect(
      result.structure?.children
        ?.filter((node) => node.role === "series")
        .map((node) => node.label)
    ).toEqual([
      expect.stringContaining("Series A"),
      expect.stringContaining("Series B")
    ])
  })

  it("describes zero-sized pie segments without selecting an arbitrary winner", () => {
    const result = buildReaderGrounding("PieChart", {
      data: [
        { category: "A", value: 0 },
        { category: "B", value: 0 }
      ]
    })
    expect(result.description.levels.l2).toContain("All segments are zero")
    expect(result.text).not.toMatch(/Largest is A|A is the largest|\d+%/)
  })

  it("keeps distinct intraday labels in descriptions and navigation", () => {
    const props = {
      data: [1, 2, 3].map((hour) => ({
        x: new Date(Date.UTC(2026, 0, 1, hour)),
        y: hour
      }))
    }
    const description = describeChart("LineChart", props)
    const tree = buildNavigationTree("LineChart", props)
    expect(description.levels.l2).toContain("01:00")
    expect(description.levels.l2).toContain("03:00")
    expect(
      tree.children?.filter((n) => n.role === "datum").map((n) => n.label)
    ).toEqual([
      "2026-01-01T01:00:00.000Z: 1",
      "2026-01-01T02:00:00.000Z: 2",
      "2026-01-01T03:00:00.000Z: 3"
    ])
  })

  it.each(["time", "utc"])(
    "formats epoch values on a %s scale as instants",
    (xScaleType) => {
      const props = {
        xScaleType,
        data: [3, 1, 2].map((hour) => ({
          x: Date.UTC(2026, 0, 1, hour),
          y: hour
        }))
      }
      const result = describeChart("LineChart", props)
      expect(result.levels.l3).toContain(
        "rises from 1 (2026-01-01T01:00:00.000Z)"
      )
      expect(result.levels.l3).toContain("3 (2026-01-01T03:00:00.000Z)")
      const tree = buildNavigationTree("LineChart", props)
      expect(tree.children?.[0].label).toBe(
        "X axis: x, 2026-01-01T01:00:00.000Z to 2026-01-01T03:00:00.000Z."
      )
    }
  )

  it.each(["date", "iso"])(
    "uses chronological axis extents for shuffled %s values",
    (kind) => {
      const tree = buildNavigationTree("LineChart", {
        xScaleType: "time",
        data: [3, 1, 2].map((hour) => ({
          x:
            kind === "date"
              ? new Date(Date.UTC(2026, 0, 1, hour))
              : `2026-01-01T0${hour}:00:00Z`,
          y: hour
        }))
      })
      expect(tree.children?.[0].label).toBe(
        "X axis: x, 2026-01-01T01:00:00.000Z to 2026-01-01T03:00:00.000Z."
      )
    }
  )
})
