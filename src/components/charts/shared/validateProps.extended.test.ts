import { describe, it, expect } from "vitest"
import { validateProps } from "./validateProps"

describe("validateProps — required props", () => {
  it("reports error when LineChart is missing data", () => {
    const result = validateProps("LineChart", {})
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('"data" is required'))).toBe(
      true
    )
  })

  it("reports error when BubbleChart is missing both data and sizeBy", () => {
    const result = validateProps("BubbleChart", {})
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('"data" is required'))).toBe(
      true
    )
    expect(result.errors.some((e) => e.includes('"sizeBy" is required'))).toBe(
      true
    )
  })

  it("reports error when StackedBarChart is missing stackBy", () => {
    const result = validateProps("StackedBarChart", {
      data: [{ category: "A", value: 10 }],
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes('"stackBy" is required'))
    ).toBe(true)
  })

  it("reports error when GroupedBarChart is missing groupBy", () => {
    const result = validateProps("GroupedBarChart", {
      data: [{ category: "A", value: 10 }],
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes('"groupBy" is required'))
    ).toBe(true)
  })

  it("reports error when RealtimeHistogram is missing binSize", () => {
    const result = validateProps("RealtimeHistogram", {})
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes('"binSize" is required'))
    ).toBe(true)
  })
})

describe("validateProps — network component validation", () => {
  it("validates ForceDirectedGraph requires both nodes and edges", () => {
    const result = validateProps("ForceDirectedGraph", {})
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('"nodes" is required'))).toBe(
      true
    )
    expect(result.errors.some((e) => e.includes('"edges" is required'))).toBe(
      true
    )
  })

  it("validates ForceDirectedGraph with valid data passes", () => {
    const result = validateProps("ForceDirectedGraph", {
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [{ source: "A", target: "B" }],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("validates SankeyDiagram requires edges but not nodes", () => {
    const result = validateProps("SankeyDiagram", {})
    expect(result.valid).toBe(false)
    // edges is required
    expect(result.errors.some((e) => e.includes('"edges" is required'))).toBe(
      true
    )
    // nodes is NOT required for SankeyDiagram
    expect(result.errors.some((e) => e.includes('"nodes" is required'))).toBe(
      false
    )
  })

  it("validates ChordDiagram requires edges", () => {
    const result = validateProps("ChordDiagram", {})
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('"edges" is required'))).toBe(
      true
    )
  })

  it("reports network data error for empty edges array", () => {
    const result = validateProps("ForceDirectedGraph", {
      nodes: [{ id: "A" }],
      edges: [],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes("edges"))).toBe(
      true
    )
  })

  it("validates SankeyDiagram nodeAlign enum", () => {
    const result = validateProps("SankeyDiagram", {
      edges: [{ source: "A", target: "B", value: 10 }],
      nodeAlign: "invalid",
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.includes("nodeAlign") && e.includes("not valid")
      )
    ).toBe(true)
  })

  it("validates SankeyDiagram nodeAlign accepts valid values", () => {
    for (const align of ["justify", "left", "right", "center"]) {
      const result = validateProps("SankeyDiagram", {
        edges: [{ source: "A", target: "B", value: 10 }],
        nodeAlign: align,
      })
      const alignError = result.errors.find((e) => e.includes("nodeAlign"))
      expect(alignError).toBeUndefined()
    }
  })
})

describe("validateProps — ordinal component validation", () => {
  it("validates BarChart orientation enum", () => {
    const result = validateProps("BarChart", {
      data: [{ category: "A", value: 10 }],
      orientation: "diagonal",
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.includes("orientation") && e.includes("not valid")
      )
    ).toBe(true)
  })

  it("validates BarChart orientation accepts valid values", () => {
    for (const orient of ["vertical", "horizontal"]) {
      const result = validateProps("BarChart", {
        data: [{ category: "A", value: 10 }],
        orientation: orient,
      })
      const orientError = result.errors.find((e) => e.includes("orientation"))
      expect(orientError).toBeUndefined()
    }
  })

  it("reports type error for wrong prop type", () => {
    const result = validateProps("BarChart", {
      data: [{ category: "A", value: 10 }],
      barPadding: "wrong", // should be number
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.includes("barPadding") && e.includes("number")
      )
    ).toBe(true)
  })

  it("reports type error for data as object instead of array", () => {
    const result = validateProps("BarChart", {
      data: { name: "root", children: [] },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.includes("data") && e.includes("array")
      )
    ).toBe(true)
  })

  it("reports accessor not found in data", () => {
    const result = validateProps("BarChart", {
      data: [{ name: "A", count: 10 }],
      categoryAccessor: "category",
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes("categoryAccessor") && e.includes("not found"))
    ).toBe(true)
  })
})

describe("validateProps — unknown component", () => {
  it("rejects unknown component name", () => {
    const result = validateProps("FakeChart", { data: [] })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("Unknown component")
    expect(result.errors[0]).toContain("FakeChart")
  })
})

describe("validateProps — hierarchy component validation", () => {
  it("reports error when Treemap data is an array", () => {
    const result = validateProps("Treemap", {
      data: [{ name: "A", value: 10 }],
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some((e) => e.includes("data") && e.includes("array"))
    ).toBe(true)
  })

})
