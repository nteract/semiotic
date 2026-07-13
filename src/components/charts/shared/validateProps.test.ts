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
