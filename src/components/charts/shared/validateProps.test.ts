import { describe, it, expect } from "vitest"
import { validateProps } from "./validateProps"

describe("validateProps typo-aware suggestions", () => {
  it("suggests closest prop name for typos", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      lineWdith: 3, // typo of lineWidth
    })
    expect(result.valid).toBe(false)
    const typoError = result.errors.find(e => e.includes("lineWdith"))
    expect(typoError).toBeDefined()
    expect(typoError).toContain('Did you mean "lineWidth"')
  })

  it("suggests colorBy for colrBy", () => {
    const result = validateProps("Scatterplot", {
      data: [{ x: 1, y: 2 }],
      colrBy: "type",
    })
    const typoError = result.errors.find(e => e.includes("colrBy"))
    expect(typoError).toContain('Did you mean "colorBy"')
  })

  it("lists all valid props when no close match", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      zzzzNotAProp: true,
    })
    const err = result.errors.find(e => e.includes("zzzzNotAProp"))
    expect(err).toContain("Valid props:")
  })

  it("validates correctly when all props are known", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      lineWidth: 2,
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe("validateProps structured issues", () => {
  const SERIES = [
    { date: 1, value: 10, region: "east" },
    { date: 2, value: 12, region: "west" },
  ]

  it("reports each finding once as a sentence and once as a structured issue", () => {
    const result = validateProps("LineChart", {
      data: SERIES,
      x: "date",
      y: "value",
      series: "region",
      yFormat: "$,.0f",
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(result.issues.map((issue) => issue.message))
    expect(new Set(result.errors).size).toBe(result.errors.length)
    expect(result.issues.map((issue) => [issue.code, issue.path])).toEqual([
      ["INVALID_PROP_TYPE", "yFormat"],
      ["UNKNOWN_PROP", "x"],
      ["UNKNOWN_PROP", "y"],
      ["UNKNOWN_PROP", "series"],
    ])
    // The audit's example produced 2.7 KB of validation text; the accepted-prop
    // list is no longer repeated per unknown prop.
    expect(JSON.stringify(result.errors).length).toBeLessThan(500)
    expect(result.validProps).toBeUndefined()
  })

  it("maps other libraries' channel names onto the component's own props", () => {
    const byPath = (component: string, props: Record<string, unknown>) =>
      Object.fromEntries(
        validateProps(component, props).issues.map((issue) => [
          issue.path,
          issue,
        ]),
      )

    const line = byPath("LineChart", { data: SERIES, x: "date", y: "value", series: "region" })
    expect(line.x).toMatchObject({
      suggestion: "xAccessor",
      patch: { op: "rename", from: "x", to: "xAccessor" },
    })
    expect(line.y.suggestion).toBe("yAccessor")
    expect(line.series.suggestion).toBe("lineBy")

    const bars = [{ quarter: "Q1", revenue: 12 }]
    const bar = byPath("BarChart", { data: bars, x: "quarter", y: "revenue" })
    expect(bar.x.suggestion).toBe("categoryAccessor")
    expect(bar.y.suggestion).toBe("valueAccessor")

    const legacy = byPath("BarChart", { data: bars, oAccessor: "quarter", rAccessor: "revenue" })
    expect(legacy.oAccessor.suggestion).toBe("categoryAccessor")
    expect(legacy.rAccessor.suggestion).toBe("valueAccessor")

    const realtime = byPath("RealtimeLineChart", { x: "time", y: "value" })
    expect(realtime.x.suggestion).toBe("timeAccessor")
    expect(realtime.y.suggestion).toBe("valueAccessor")
  })

  it("offers a rename only when it cannot clobber or mistype the target", () => {
    const occupied = validateProps("LineChart", {
      data: SERIES,
      x: "date",
      xAccessor: "date",
    }).issues.find((issue) => issue.path === "x")
    expect(occupied?.suggestion).toBe("xAccessor")
    expect(occupied?.patch).toEqual({ op: "remove", path: "x" })

    const wrongType = validateProps("LineChart", {
      data: SERIES,
      x: 3,
    }).issues.find((issue) => issue.path === "x")
    expect(wrongType?.suggestion).toBe("xAccessor")
    expect(wrongType?.patch).toBeUndefined()
  })

  it("does not match a one-letter prop to an unrelated short prop", () => {
    const issue = validateProps("GaugeChart", { value: 1, x: 2 }).issues.find(
      (entry) => entry.path === "x",
    )
    expect(issue?.code).toBe("UNKNOWN_PROP")
    expect(issue?.suggestion).toBeUndefined()
    expect(issue?.patch).toEqual({ op: "remove", path: "x" })
  })

  it("lists the accepted props once per result, not once per unknown prop", () => {
    const result = validateProps("LineChart", {
      data: SERIES,
      zzzzNotAProp: true,
      qqqqAlsoNotAProp: true,
    })
    const unknown = result.errors.filter((error) => error.startsWith("Unknown prop"))
    expect(unknown).toHaveLength(2)
    expect(unknown.filter((error) => error.includes("Valid props:"))).toHaveLength(1)
    expect(unknown[1]).toContain("valid props are listed above")
    expect(result.validProps).toContain("xAccessor")
    expect(result.validProps).toContain("linkedHover")
  })

  it("explains a callback prop given a serializable value and offers to drop it", () => {
    const issue = validateProps("LineChart", {
      data: SERIES,
      xFormat: "%b %Y",
    }).issues.find((entry) => entry.path === "xFormat")
    expect(issue).toMatchObject({
      code: "INVALID_PROP_TYPE",
      actualType: "string",
      expectedTypes: ["function"],
      patch: { op: "remove", path: "xFormat" },
    })
    expect(issue?.message).toContain('"xFormat" should be function, got string.')
    expect(issue?.message).toContain("serialized config cannot carry")
  })

  it("suggests the nearest enum value", () => {
    const issue = validateProps("LineChart", {
      data: SERIES,
      curve: "monotonX",
    }).issues.find((entry) => entry.path === "curve")
    expect(issue).toMatchObject({
      code: "INVALID_PROP_VALUE",
      suggestion: "monotoneX",
      patch: { op: "set", path: "curve", value: "monotoneX" },
    })
    expect(issue?.allowedValues).toContain("monotoneX")
  })

  it("suggests the nearest component name", () => {
    const result = validateProps("LineChrt", {})
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toMatchObject({
      code: "UNKNOWN_COMPONENT",
      suggestion: "LineChart",
    })
  })

  it("accepts React-only interaction props that the wire schema omits", () => {
    const result = validateProps("BarChart", {
      data: [{ category: "a", value: 1 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      linkedHover: true,
      selection: { name: "s" },
      hoverRadius: 12,
      loadingContent: "Loading…",
    })
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)

    const mistyped = validateProps("BarChart", {
      data: [{ category: "a", value: 1 }],
      hoverRadius: "12",
    })
    expect(mistyped.issues).toMatchObject([
      { code: "INVALID_PROP_TYPE", path: "hoverRadius", actualType: "string" },
    ])
  })
})

describe("validateProps chart modes", () => {
  it("accepts the shared mobile mode on regular chart specs", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      mode: "mobile",
    })
    expect(result.valid).toBe(true)
  })

  it("rejects unknown chart modes", () => {
    const result = validateProps("FlowMap", {
      flows: [],
      mode: "compact",
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('"mode" value "compact" is not valid'))).toBe(true)
  })
})

describe("validateProps — malformed input must not throw", () => {
  it("returns a result (not a TypeError) for null / non-object props", () => {
    // This validator exists to catch malformed agent input; handed malformed
    // input itself it must still return a result. Direct callers include
    // repair loops and the public semiotic/ai + semiotic/utils surface.
    expect(() => validateProps("LineChart", null as never)).not.toThrow()
    expect(() => validateProps("BarChart", undefined as never)).not.toThrow()
    expect(() => validateProps("BarChart", 42 as never)).not.toThrow()
    const result = validateProps("LineChart", null as never)
    expect(result.valid).toBe(false)
  })
})


describe("validateProps — array charts require data in static usage", () => {
  // These charts list semantic accessors (not `data`) in `required`, so they
  // used to validate as OK with no data and render blank. The data requirement
  // is now enforced via the canonical "data is required" message, which the
  // usageMode filter keeps in static mode and drops in push mode.
  const accessorOnly: Record<string, Record<string, unknown>> = {
    CandlestickChart: { xAccessor: "day", highAccessor: "high", lowAccessor: "low" },
    MultiAxisLineChart: { series: [{ yAccessor: "a" }, { yAccessor: "b" }] },
    QuadrantChart: { xAccessor: "x", yAccessor: "y" },
    DifferenceChart: { xAccessor: "x", seriesAAccessor: "a", seriesBAccessor: "b" },
    SwimlaneChart: { subcategoryAccessor: "s", valueAccessor: "v" },
    LikertChart: { categoryAccessor: "c", valueAccessor: "v" },
    CollisionSwarmChart: { xAccessor: "x", groupAccessor: "g" },
  }

  for (const [component, props] of Object.entries(accessorOnly)) {
    it(`${component}: flags missing data`, () => {
      const result = validateProps(component, props)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(`"data" is required for ${component}.`)
    })

    it(`${component}: no data error once data is provided`, () => {
      const result = validateProps(component, { ...props, data: [{}] })
      expect(result.errors).not.toContain(`"data" is required for ${component}.`)
    })
  }
})

describe("validateProps — declared non-data array inputs", () => {
  it("accepts FlowMap's documented flows input without inventing an unknown data prop", () => {
    const result = validateProps("FlowMap", {
      flows: [],
      nodes: [],
      lineIdAccessor: "id",
    })
    expect(result.valid).toBe(true)
    expect(result.errors).not.toContain('"data" is required for FlowMap.')
  })
})

describe("validateProps — GaugeChart threshold wire contract", () => {
  it("accepts GaugeChart value/color threshold objects", () => {
    expect(validateProps("GaugeChart", {
      value: 97,
      thresholds: [
        { value: 99, color: "#c7952f", label: "Below target" },
        { value: 100, color: "#2a8f68" },
      ],
    }).valid).toBe(true)
  })

  it("rejects BigNumber at/level thresholds before rendering", () => {
    const result = validateProps("GaugeChart", {
      value: 97,
      thresholds: [
        { at: 99, level: "warning", color: "#c7952f" },
      ],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.join(" ")).toContain("BigNumber")
    expect(result.errors.join(" ")).toContain(".value")
  })
})

describe("validateProps — BigNumber wire contract", () => {
  it("accepts its supported accessibility and display props", () => {
    expect(validateProps("BigNumber", {
      value: 97,
      label: "SLA attainment",
      format: "number",
      suffix: "%",
      description: "Current SLA attainment.",
      summary: "The current value is below the target.",
      chartId: "sla-attainment",
      loading: false,
    }).valid).toBe(true)
  })

  it("rejects chart-frame title and table props", () => {
    const result = validateProps("BigNumber", {
      value: 97,
      title: "SLA attainment",
      accessibleTable: true,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.join(" ")).toContain('"title"')
    expect(result.errors.join(" ")).toContain('"accessibleTable"')
  })
})

describe("validateProps — axis config keys", () => {
  it("flags axis keys nothing reads, with a suggestion", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      frameProps: { axes: [{ orient: "bottom", tickCont: 4 }, { orient: "left", ticks: 3 }] },
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Unknown "frameProps.axes[0]" key "tickCont" is ignored. Did you mean "tickCount"?')
    expect(result.errors.some((error) => error.includes("frameProps.axes[1]"))).toBe(false)
  })

  it("accepts tickCount as the alias of ticks", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      frameProps: { axes: [{ orient: "bottom", tickCount: 4 }] },
    })
    expect(result.errors).toHaveLength(0)
  })

  it("checks a histogram's top-level axes", () => {
    const result = validateProps("TemporalHistogram", {
      data: [{ time: 1, value: 2 }],
      binSize: 1,
      axes: [{ orient: "bottom", format: "%H:%M" }],
    })
    expect(result.errors.some((error) => error.includes('"axes[0]" key "format"'))).toBe(true)
  })
})
