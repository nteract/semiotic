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
