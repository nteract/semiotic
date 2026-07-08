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

  it("propagates the author-annotation summary into the grounding payload", () => {
    const g = buildReaderGrounding("LineChart", {
      data: sales,
      xAccessor: "month",
      yAccessor: "sales",
      annotations: [{ type: "y-threshold", y: 8000, label: "Target" }],
    })
    // The annotation summary must reach the agent/non-visual reader, not be
    // dropped when the L1–L3 text is reconstructed from levels.
    expect(g.description.annotations).toContain('a threshold line labeled "Target"')
    expect(g.description.text.startsWith("The author has marked")).toBe(true)
    expect(g.text.startsWith("The author has marked")).toBe(true)
  })

  it("omits the annotation summary when the chart carries none", () => {
    const g = buildReaderGrounding("LineChart", { data: sales, xAccessor: "month", yAccessor: "sales" })
    expect(g.description.annotations).toBeUndefined()
    expect(g.description.text.startsWith("The author has marked")).toBe(false)
  })

  it("adds physics simulation parameters and aggregate state to physics grounding", () => {
    const g = buildReaderGrounding("PhysicsCustomChart", {
      projectionRows: [
        { id: "triage", label: "Triage lane", count: 3 },
        { id: "review", label: "Review lane", count: 5 },
      ],
      physics: {
        snapshot: {
          simulationState: "settled",
          elapsedSeconds: 2.5,
          paused: false,
          visible: true,
          queue: [],
          liveBodyOrder: ["a", "b", "c", "d", "e"],
          activeSensorPairs: ["sensor-review::a"],
          config: {
            bodyLimit: 100,
            eviction: "oldest",
            fixedDt: 1 / 120,
            maxSubsteps: 8,
            timeScale: 1,
            kernel: {
              seed: 42,
              gravity: { x: 0, y: 820 },
            },
          },
          sediment: [
            { id: "older", label: "Older packets", count: 2, total: 6 },
          ],
          world: {
            bodies: [
              { id: "a", sleeping: true },
              { id: "b", sleeping: true },
              { id: "c", sleeping: true },
              { id: "d", sleeping: true },
              { id: "e", sleeping: true },
            ],
            colliders: [
              { id: "floor" },
              { id: "sensor-triage", sensor: true },
              { id: "sensor-review", sensor: true },
            ],
            springs: [],
            activeSensors: ["sensor-review"],
          },
        },
        evidence: {
          settled: true,
          stepsRun: 240,
        },
      },
    })

    expect(g.physics?.simulation).toMatchObject({
      state: "settled",
      settled: true,
      seed: 42,
      liveBodies: 5,
      sleepingBodies: 5,
      queued: 0,
    })
    expect(g.physics?.simulation.gravity).toEqual({ x: 0, y: 820 })
    expect(g.physics?.geometry).toMatchObject({
      colliders: 3,
      sensors: 2,
      springs: 0,
      activeSensorPairs: 1,
    })
    expect(g.physics?.aggregates).toMatchObject({
      totalCount: 8,
      populatedCount: 2,
      leader: { label: "Review lane", count: 5 },
    })
    expect(g.physics?.sediment).toMatchObject({
      bins: 1,
      count: 2,
      total: 6,
      leader: { label: "Older packets", count: 2, total: 6 },
    })
    expect(g.description.text).toContain("8 bodies")
    expect(g.text).toContain("Physics simulation: settled")
    expect(g.text).toContain("seed 42")
    expect(g.text).toContain("Largest is Review lane with 5")
  })

  it("can omit physics grounding for token-budget mode", () => {
    const g = buildReaderGrounding(
      "PhysicsPileChart",
      {
        projectionRows: [{ id: "a", label: "A", count: 2 }],
        physics: { snapshot: { simulationState: "settled" } },
      },
      { physics: false }
    )
    expect(g.physics).toBeUndefined()
    expect(g.text).not.toContain("Physics simulation:")
  })

  it("does not invent a physics runtime block without runtime evidence", () => {
    const g = buildReaderGrounding("PhysicsPileChart", {})
    expect(g.physics).toBeUndefined()
    expect(g.text).not.toContain("Physics simulation:")
  })
})
