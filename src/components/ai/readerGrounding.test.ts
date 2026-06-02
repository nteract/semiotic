import { describe, it, expect } from "vitest"
import { buildReaderGrounding } from "./readerGrounding"
import { PieChartCapability } from "../charts/ordinal/PieChart.capability"

const sales = [
  { month: "Jan", sales: 4200 }, { month: "Feb", sales: 5100 },
  { month: "Mar", sales: 6800 }, { month: "Apr", sales: 9100 },
]

describe("buildReaderGrounding", () => {
  it("combines L1–L3 description, an L4 intent sentence, and a navigation structure", () => {
    const g = buildReaderGrounding("LineChart", { data: sales, xAccessor: "month", yAccessor: "sales" }, {
      capability: { family: "time-series", intentScores: { trend: 5 } },
    })
    expect(g.component).toBe("LineChart")
    // L1–L3 prose
    expect(g.description.levels.l1).toContain("line chart")
    expect(g.description.levels.l2).toContain("ranges from")
    // L4 intent block
    expect(g.intent?.act).toBe("tracking")
    expect(g.intent?.sentence.startsWith("This is a trend chart;")).toBe(true)
    expect(g.intent?.family).toBe("time-series")
    expect(g.intent?.intentScores).toEqual({ trend: 5 })
    // Structure
    expect(g.structure?.role).toBe("chart")
    expect(g.structure?.children?.length).toBeGreaterThan(0)
    // Combined text carries both the description and the L4 sentence
    expect(g.text).toContain("A line chart of sales by month.")
    expect(g.text).toContain("This is a trend chart;")
  })

  it("infers the act from the component family when no capability is supplied", () => {
    const g = buildReaderGrounding("LineChart", { data: sales, xAccessor: "month", yAccessor: "sales" })
    expect(g.intent?.act).toBe("tracking")
    expect(g.intent?.family).toBeUndefined() // no context to read it from
  })

  it("reads a full capability descriptor (PieChart → composition)", () => {
    const g = buildReaderGrounding("PieChart", {
      data: [{ v: "A", s: 50 }, { v: "B", s: 30 }, { v: "C", s: 20 }],
      categoryAccessor: "v", valueAccessor: "s",
    }, { capability: PieChartCapability })
    expect(g.intent?.act).toBe("apportioning")
    expect(g.intent?.family).toBe("categorical")
    expect(g.intent?.sentence).toContain("composition chart")
  })

  it("can omit the structure to save tokens", () => {
    const g = buildReaderGrounding("LineChart", { data: sales, xAccessor: "month", yAccessor: "sales" }, {
      includeStructure: false,
    })
    expect(g.structure).toBeUndefined()
  })

  it("degrades cleanly for an unknown component", () => {
    const g = buildReaderGrounding("Mystery", {})
    expect(g.intent).toBeUndefined()
    expect(g.structure?.role).toBe("chart")
    expect(() => buildReaderGrounding("Mystery", {})).not.toThrow()
  })
})
