import { describe, it, expect } from "vitest"
import { describeChart, resolveCommunicativeAct, communicativeActForIntent } from "./describeChart"
import { LineChartCapability } from "../charts/xy/LineChart.capability"
import { PieChartCapability } from "../charts/ordinal/PieChart.capability"

describe("describeChart — L1 encoding", () => {
  it("names the chart type and what's mapped to each channel (XY)", () => {
    const r = describeChart("LineChart", { data: [{ month: 1, sales: 10 }], xAccessor: "month", yAccessor: "sales" }, { levels: ["l1"] })
    expect(r.levels.l1).toBe("A line chart of sales by month.")
    expect(r.text).toBe(r.levels.l1)
  })

  it("notes the series split", () => {
    const r = describeChart("LineChart", { data: [{ month: 1, sales: 10, region: "W" }], xAccessor: "month", yAccessor: "sales", lineBy: "region" }, { levels: ["l1"] })
    expect(r.levels.l1).toContain("split by region")
  })

  it("describes bar charts by value and category", () => {
    const r = describeChart("BarChart", { data: [{ category: "A", value: 1 }], categoryAccessor: "category", valueAccessor: "value" }, { levels: ["l1"] })
    expect(r.levels.l1).toBe("A bar chart of value by category.")
  })

  it("describes a network by its node and edge counts", () => {
    const r = describeChart("ForceDirectedGraph", { nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [{ source: "a", target: "b" }] })
    expect(r.levels.l1).toBe("A network graph with 3 nodes and 1 edge.")
    expect(r.levels.l2).toBeUndefined() // no measure → no statistics level
    expect(r.levels.l3).toBeUndefined()
  })
})

describe("describeChart — L2 statistics", () => {
  const data = [
    { month: "Jan", sales: 100 },
    { month: "Feb", sales: 250 },
    { month: "Mar", sales: 180 },
  ]
  it("reports range, extrema labels, and mean", () => {
    const r = describeChart("LineChart", { data, xAccessor: "month", yAccessor: "sales" }, { levels: ["l2"] })
    expect(r.levels.l2).toContain("sales ranges from 100 (Jan) to 250 (Feb)")
    expect(r.levels.l2).toContain("mean")
    expect(r.levels.l2).toContain("3 points")
  })

  it("summarizes part-to-whole as a total plus largest/smallest segment", () => {
    const r = describeChart("PieChart", {
      data: [{ category: "A", value: 10 }, { category: "B", value: 30 }, { category: "C", value: 20 }],
      categoryAccessor: "category", valueAccessor: "value",
    }, { levels: ["l2"] })
    expect(r.levels.l2).toContain("3 segments totaling 60")
    expect(r.levels.l2).toContain("Largest is B at 30")
    expect(r.levels.l2).toContain("smallest is A at 10")
  })

  it("formats large numbers compactly", () => {
    const r = describeChart("LineChart", { data: [{ m: 1, v: 6500000 }, { m: 2, v: 7200000 }], xAccessor: "m", yAccessor: "v" }, { levels: ["l2"] })
    expect(r.levels.l2).toContain("6.5M")
    expect(r.levels.l2).toContain("7.2M")
  })

  it("says so when no data is loaded (push mode)", () => {
    const r = describeChart("LineChart", { xAccessor: "month", yAccessor: "sales" })
    expect(r.levels.l2).toBe("No data is loaded yet.")
  })
})

describe("describeChart — L3 trend", () => {
  it("describes a monotonic rise as a peak at the end", () => {
    const r = describeChart("LineChart", { data: [{ month: "Jan", sales: 100 }, { month: "Feb", sales: 200 }, { month: "Mar", sales: 350 }], xAccessor: "month", yAccessor: "sales" }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("Overall sales rises from 100 (Jan) to a peak of 350 (Mar).")
  })

  it("describes a peak-then-fall shape when the high is interior", () => {
    const r = describeChart("LineChart", { data: [{ month: "Jan", sales: 100 }, { month: "Feb", sales: 400 }, { month: "Mar", sales: 250 }], xAccessor: "month", yAccessor: "sales" }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("Overall sales climbs to a peak of 400 (Feb), then falls to 250 (Mar).")
  })

  it("describes a valley-then-recovery shape when the low is interior", () => {
    const r = describeChart("LineChart", { data: [{ month: "Jan", sales: 400 }, { month: "Feb", sales: 100 }, { month: "Mar", sales: 350 }], xAccessor: "month", yAccessor: "sales" }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("Overall sales drops to a low of 100 (Feb), then recovers to 350 (Mar).")
  })

  it("describes a rise to a peak, then a crash to the end (interior peak dominates net direction)", () => {
    const r = describeChart("LineChart", {
      data: [{ m: 1, v: 4200 }, { m: 2, v: 6800 }, { m: 3, v: 9100 }, { m: 4, v: 2100 }],
      xAccessor: "m", yAccessor: "v",
    }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("Overall v climbs to a peak of 9,100 (3), then falls to 2,100 (4).")
  })

  it("describes a fall to a low at the end", () => {
    const r = describeChart("LineChart", { data: [{ m: 1, v: 300 }, { m: 2, v: 200 }, { m: 3, v: 100 }], xAccessor: "m", yAccessor: "v" }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("Overall v falls from 300 (1) to a low of 100 (3).")
  })

  it("calls a flat series flat", () => {
    const r = describeChart("LineChart", { data: [{ m: 1, v: 100 }, { m: 2, v: 101 }, { m: 3, v: 100 }], xAccessor: "m", yAccessor: "v" }, { levels: ["l3"] })
    expect(r.levels.l3).toContain("ends roughly where it started")
  })

  it("reports highest/lowest category for bars (no false trend)", () => {
    const r = describeChart("BarChart", { data: [{ category: "A", value: 10 }, { category: "B", value: 30 }], categoryAccessor: "category", valueAccessor: "value" }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("The highest category is B and the lowest is A.")
  })
})

describe("describeChart — composition", () => {
  it("joins requested levels into text, in L1→L2→L3 order", () => {
    const r = describeChart("LineChart", { data: [{ month: "Jan", sales: 100 }, { month: "Feb", sales: 200 }], xAccessor: "month", yAccessor: "sales" })
    expect(r.text.startsWith("A line chart of sales by month.")).toBe(true)
    expect(r.text).toContain("sales ranges from")
    expect(r.text).toContain("Overall sales rises")
  })

  it("respects a restricted level set", () => {
    const r = describeChart("LineChart", { data: [{ month: "Jan", sales: 100 }], xAccessor: "month", yAccessor: "sales" }, { levels: ["l1"] })
    expect(r.levels.l2).toBeUndefined()
    expect(r.levels.l3).toBeUndefined()
    expect(r.text).toBe(r.levels.l1)
  })

  it("never throws on a malformed config", () => {
    expect(() => describeChart("LineChart", { data: "nope" as unknown as [] })).not.toThrow()
    expect(() => describeChart("Mystery", {})).not.toThrow()
  })

  it("falls back to a readable label when an accessor is a function (no source leak)", () => {
    const r = describeChart("LineChart", {
      data: [{ m: 1, v: 10 }, { m: 2, v: 30 }],
      xAccessor: (d: { m: number }) => d.m,
      yAccessor: (d: { v: number }) => d.v,
    })
    // Function accessors are truthy but must not be interpolated into prose.
    expect(r.levels.l1).toBe("A line chart of y by x.")
    expect(r.text).not.toContain("=>")
    // …while value extraction still works through the function accessors.
    expect(r.levels.l2).toContain("ranges from 10")
    expect(r.levels.l2).toContain("to 30")
  })
})

describe("describeChart — L4 intent / communicative act", () => {
  const rising = [
    { month: "Jan", sales: 4200 }, { month: "Feb", sales: 5100 },
    { month: "Mar", sales: 6800 }, { month: "Apr", sales: 9100 },
  ]

  it("is omitted by default (no capability context)", () => {
    const r = describeChart("LineChart", { data: rising, xAccessor: "month", yAccessor: "sales" })
    expect(r.levels.l4).toBeUndefined()
    expect(r.text).not.toContain("This is")
  })

  it("auto-appends L4 when a capability context is supplied and levels are default", () => {
    const r = describeChart("LineChart", { data: rising, xAccessor: "month", yAccessor: "sales" }, {
      capability: { family: "time-series", intentScores: { trend: 5 } },
    })
    expect(r.levels.l4).toBe("This is a trend chart; read it for the trajectory of sales, which rises from 4,200 (Jan) to 9,100 (Apr).")
    expect(r.text.endsWith(r.levels.l4!)).toBe(true)
  })

  it("frames an alerting chart around the salient feature (interior peak)", () => {
    const spike = [
      { m: 1, v: 100 }, { m: 2, v: 120 }, { m: 3, v: 900 }, { m: 4, v: 130 },
    ]
    const r = describeChart("LineChart", { data: spike, xAccessor: "m", yAccessor: "v" }, {
      levels: ["l4"],
      capability: { act: "alerting" },
    })
    expect(r.levels.l4).toBe("This is an alerting chart; the peak of 900 at 3 is the point to investigate.")
  })

  it("derives the act from a resolved dominant intent (change-detection → alerting)", () => {
    const r = describeChart("LineChart", { data: rising, xAccessor: "month", yAccessor: "sales" }, {
      levels: ["l4"],
      capability: { family: "time-series", intentScores: { "change-detection": 5, trend: 3 } },
    })
    expect(r.levels.l4?.startsWith("This is an alerting chart;")).toBe(true)
  })

  it("frames a part-to-whole chart as composition with a share", () => {
    const r = describeChart("PieChart", {
      data: [{ vendor: "A", share: 50 }, { vendor: "B", share: 30 }, { vendor: "C", share: 20 }],
      categoryAccessor: "vendor", valueAccessor: "share",
    }, { capability: PieChartCapability })
    expect(r.levels.l4).toBe("This is a composition chart; read each vendor's share of the 100 total; A is the largest at 50 (50%).")
  })

  it("falls back to the family when a full capability's primary intents are function scorers", () => {
    // LineChart's strong intents (trend) are function scorers describeChart
    // can't evaluate; only weak static scorers remain, so the family wins.
    const r = describeChart("LineChart", { data: rising, xAccessor: "month", yAccessor: "sales" }, {
      levels: ["l4"],
      capability: LineChartCapability,
    })
    expect(r.levels.l4?.startsWith("This is a trend chart;")).toBe(true)
  })

  it("appends a reception nudge for an audience unfamiliar with the chart", () => {
    const r = describeChart("LineChart", { data: rising, xAccessor: "month", yAccessor: "sales" }, {
      levels: ["l4"],
      capability: { family: "time-series", intentScores: { trend: 5 } },
      audience: { name: "Executive", familiarity: { LineChart: 1 } },
    })
    expect(r.levels.l4).toContain("This is a trend chart;")
    expect(r.levels.l4).toContain("may be unfamiliar to executive readers — lean on this description.")
  })

  it("handles push mode (no data) with a generic directive", () => {
    const r = describeChart("BarChart", { categoryAccessor: "c", valueAccessor: "v" }, {
      levels: ["l4"],
      capability: { family: "categorical", intentScores: { "compare-categories": 5 } },
    })
    expect(r.levels.l4).toBe("This is a comparison chart; compare v across c.")
  })

  it("exposes the act-resolution helpers", () => {
    expect(communicativeActForIntent("outlier-detection")).toBe("alerting")
    expect(communicativeActForIntent("part-to-whole")).toBe("apportioning")
    expect(resolveCommunicativeAct("LineChart", { family: "time-series", intentScores: { trend: 5 } })).toBe("tracking")
    expect(resolveCommunicativeAct("ForceDirectedGraph", { family: "network" })).toBe("tracing")
    expect(resolveCommunicativeAct("Mystery", undefined)).toBeUndefined()
  })
})

describe("describeChart — author annotations", () => {
  const data = [
    { month: "Jan", sales: 100 },
    { month: "Feb", sales: 250 },
    { month: "Mar", sales: 180 },
  ]

  it("omits the annotations field and leaves text unchanged when there are none", () => {
    const r = describeChart("LineChart", { data, xAccessor: "month", yAccessor: "sales" }, { levels: ["l1"] })
    expect(r.annotations).toBeUndefined()
    expect(r.text).toBe(r.levels.l1)
  })

  it("surfaces author-placed annotations as a leading sentence", () => {
    const r = describeChart(
      "LineChart",
      {
        data,
        xAccessor: "month",
        yAccessor: "sales",
        annotations: [
          { type: "y-threshold", y: 200, label: "Target" },
          { type: "callout", x: "Feb", label: "Peak" },
        ],
      },
      { levels: ["l1"] }
    )
    expect(r.annotations).toBe(
      'The author has marked 2 features on this chart: a threshold line labeled "Target" and a callout labeled "Peak".'
    )
    // The annotation sentence leads the text, ahead of the L1 encoding sentence.
    expect(r.text).toBe(`${r.annotations} ${r.levels.l1}`)
  })

  it("qualifies AI- and watcher-authored notes from their provenance", () => {
    const r = describeChart(
      "LineChart",
      {
        data,
        xAccessor: "month",
        yAccessor: "sales",
        annotations: [
          { type: "callout", x: "Feb", label: "Spike", provenance: { authorKind: "watcher", basis: "statistical-test" } },
          { type: "label", x: "Mar", label: "Check", provenance: { authorKind: "agent" } },
        ],
      },
      { levels: ["l1"] }
    )
    expect(r.annotations).toContain('a watcher-flagged callout labeled "Spike"')
    expect(r.annotations).toContain('an AI-suggested label labeled "Check"')
  })

  it("singularizes one feature and caps the list with \"and N more\"", () => {
    const one = describeChart("LineChart", { data, xAccessor: "month", yAccessor: "sales", annotations: [{ type: "band", y0: 100, y1: 200, label: "Range" }] }, { levels: ["l1"] })
    expect(one.annotations).toContain("one feature")

    const many = describeChart(
      "LineChart",
      {
        data,
        xAccessor: "month",
        yAccessor: "sales",
        annotations: Array.from({ length: 7 }, (_, i) => ({ type: "callout", label: `n${i}` })),
      },
      { levels: ["l1"] }
    )
    expect(many.annotations).toContain("7 features")
    expect(many.annotations).toContain("and 2 more")
  })
})
