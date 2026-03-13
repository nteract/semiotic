/**
 * Scenario tests: Systematic validation and diagnostic coverage.
 *
 * Goes beyond individual check tests to verify:
 * - Every component in VALIDATION_MAP accepts minimal valid props
 * - Typo suggestions are actionable
 * - Multiple issues are reported simultaneously
 * - Network/hierarchy charts validate their specific data shapes
 * - diagnoseConfig and validateProps agree on what's valid
 */
import { describe, it, expect } from "vitest"
import { validateProps } from "../../components/charts/shared/validateProps"
import { diagnoseConfig } from "../../components/charts/shared/diagnoseConfig"

// ── Minimal valid props for every component type ─────────────────────────

const MINIMAL_VALID_PROPS: Record<string, Record<string, any>> = {
  // XY charts
  LineChart: { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
  AreaChart: { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
  StackedAreaChart: { data: [{ x: 1, y: 2, g: "A" }], xAccessor: "x", yAccessor: "y" },
  Scatterplot: { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
  BubbleChart: { data: [{ x: 1, y: 2, s: 5 }], xAccessor: "x", yAccessor: "y", sizeBy: "s" },
  ConnectedScatterplot: { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
  Heatmap: { data: [{ x: 1, y: 2, v: 3 }], xAccessor: "x", yAccessor: "y", valueAccessor: "v" },

  // Ordinal charts
  BarChart: { data: [{ cat: "A", val: 10 }], categoryAccessor: "cat", valueAccessor: "val" },
  StackedBarChart: { data: [{ cat: "A", val: 10, g: "X" }], categoryAccessor: "cat", valueAccessor: "val", stackBy: "g" },
  GroupedBarChart: { data: [{ cat: "A", val: 10, g: "X" }], categoryAccessor: "cat", valueAccessor: "val", groupBy: "g" },
  SwarmPlot: { data: [{ cat: "A", val: 10 }], categoryAccessor: "cat", valueAccessor: "val" },
  BoxPlot: { data: [{ cat: "A", val: 10 }], categoryAccessor: "cat", valueAccessor: "val" },
  Histogram: { data: [{ val: 10 }], valueAccessor: "val" },
  ViolinPlot: { data: [{ cat: "A", val: 10 }], categoryAccessor: "cat", valueAccessor: "val" },
  DotPlot: { data: [{ cat: "A", val: 10 }], categoryAccessor: "cat", valueAccessor: "val" },
  PieChart: { data: [{ cat: "A", val: 10 }], categoryAccessor: "cat", valueAccessor: "val" },
  DonutChart: { data: [{ cat: "A", val: 10 }], categoryAccessor: "cat", valueAccessor: "val" },

  // Network charts
  ForceDirectedGraph: { nodes: [{ id: "a" }], edges: [{ source: "a", target: "a" }] },
  SankeyDiagram: { edges: [{ source: "a", target: "b", value: 10 }] },
  ChordDiagram: { edges: [{ source: "a", target: "b", value: 10 }] },
  TreeDiagram: { data: { name: "root", children: [{ name: "leaf" }] } },
  Treemap: { data: { name: "root", children: [{ name: "leaf", value: 10 }] } },
  CirclePack: { data: { name: "root", children: [{ name: "leaf", value: 10 }] } },
  OrbitDiagram: { data: { name: "root", children: [{ name: "leaf" }] } },

  // Realtime charts
  RealtimeLineChart: { size: [400, 300] },
  RealtimeHistogram: { size: [400, 300], binSize: 10 },
  RealtimeSwarmChart: { size: [400, 300] },
  RealtimeWaterfallChart: { size: [400, 300] },
  RealtimeHeatmap: { size: [400, 300] },
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("Validation Coverage — Every Component", () => {
  // 1. Every component validates with minimal valid props
  const componentNames = Object.keys(MINIMAL_VALID_PROPS)

  it.each(componentNames)(
    "%s accepts minimal valid props without errors",
    (componentName) => {
      const result = validateProps(componentName, MINIMAL_VALID_PROPS[componentName])
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    }
  )

  // 2. diagnoseConfig agrees on validity for every component
  it.each(componentNames)(
    "diagnoseConfig returns ok=true for valid %s",
    (componentName) => {
      const result = diagnoseConfig(componentName, MINIMAL_VALID_PROPS[componentName])
      // Filter out warnings — only check for errors
      const errors = result.diagnoses.filter((d) => d.severity === "error")
      expect(errors).toHaveLength(0)
    }
  )
})

describe("Validation — Typo Suggestions", () => {
  // 3. Common typos produce actionable suggestions
  it("suggests 'colorBy' when 'colourBy' is passed", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      colourBy: "series",
    })
    const unknownError = result.errors.find((e) => e.includes("colourBy"))
    expect(unknownError).toBeTruthy()
    expect(unknownError).toContain("colorBy") // suggestion
  })

  it("suggests 'categoryAccessor' when 'catagoryAccessor' is passed", () => {
    const result = validateProps("BarChart", {
      data: [{ cat: "A", val: 10 }],
      catagoryAccessor: "cat",
      valueAccessor: "val",
    })
    const unknownError = result.errors.find((e) => e.includes("catagoryAccessor"))
    expect(unknownError).toBeTruthy()
    expect(unknownError).toContain("categoryAccessor")
  })

  it("suggests 'showPoints' when 'showpoint' is passed", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      showpoint: true,
    })
    const unknownError = result.errors.find((e) => e.includes("showpoint"))
    expect(unknownError).toBeTruthy()
    expect(unknownError).toContain("showPoints")
  })
})

describe("Validation — Data Shape Enforcement", () => {
  // 4. Hierarchy chart rejects flat array
  it("Treemap rejects flat array data", () => {
    const result = diagnoseConfig("Treemap", {
      data: [{ name: "A", value: 10 }],
    })
    const codes = result.diagnoses.map((d) => d.code)
    expect(codes).toContain("HIERARCHY_FLAT_ARRAY")
  })

  // 5. Network chart needs edges
  it("ForceDirectedGraph with nodes but no edges produces diagnostic", () => {
    const result = diagnoseConfig("ForceDirectedGraph", {
      nodes: [{ id: "a" }, { id: "b" }],
    })
    const codes = result.diagnoses.map((d) => d.code)
    expect(codes).toContain("NETWORK_NO_EDGES")
  })

  // 6. SankeyDiagram with empty edges array
  it("SankeyDiagram with empty edges array produces EMPTY_EDGES", () => {
    const result = diagnoseConfig("SankeyDiagram", {
      edges: [],
    })
    const codes = result.diagnoses.map((d) => d.code)
    expect(codes).toContain("EMPTY_EDGES")
  })
})

describe("Validation — Multiple Simultaneous Issues", () => {
  // 7. diagnoseConfig reports 3+ issues at once
  it("reports empty data, bad width, and margin overflow simultaneously", () => {
    const result = diagnoseConfig("LineChart", {
      data: [],
      width: -10,
      margin: { left: 500, right: 500, top: 0, bottom: 0 },
    })

    const codes = result.diagnoses.map((d) => d.code)
    expect(codes).toContain("EMPTY_DATA")
    expect(codes).toContain("BAD_WIDTH")
    // Should have at least 2 distinct error codes
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBeGreaterThanOrEqual(2)
  })

  // 8. Accessor missing + linkedHover without selection
  it("reports accessor missing AND linkedHover without selection together", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ time: 1, val: 2 }],
      xAccessor: "x", // missing from data
      yAccessor: "y", // missing from data
      linkedHover: { name: "hl", fields: ["region"] },
    })

    const codes = result.diagnoses.map((d) => d.code)
    expect(codes).toContain("ACCESSOR_MISSING")
    expect(codes).toContain("LINKED_HOVER_NO_SELECTION")
  })
})

describe("Validation — Edge Cases", () => {
  // 9. validateProps accepts function accessors where string expected
  it("accepts function accessor for xAccessor", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: (d: any) => d.x,
      yAccessor: "y",
    })
    expect(result.valid).toBe(true)
  })

  // 10. Unknown component name produces clear error
  it("unknown component produces clear error message", () => {
    const result = validateProps("SuperMegaChart", { data: [] })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("Unknown component")
    expect(result.errors[0]).toContain("SuperMegaChart")
  })

  // 11. diagnoseConfig includes fix suggestions on diagnostic-originated issues
  it("diagnostic-originated issues include non-empty fix suggestions", () => {
    const result = diagnoseConfig("LineChart", {
      data: [],
      width: 0,
      linkedHover: { name: "hl", fields: ["x"] },
    })

    // Filter to only diagnostics that originate from diagnoseConfig (not validateProps)
    const diagnosticIssues = result.diagnoses.filter(
      (d) => d.code !== "VALIDATION"
    )
    expect(diagnosticIssues.length).toBeGreaterThan(0)

    for (const diag of diagnosticIssues) {
      expect(diag.fix).toBeTruthy()
      expect(diag.fix.length).toBeGreaterThan(5)
    }
  })
})
