import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import type { PhysicsCustomLayoutContext } from "./PhysicsCustomChart"

describe("physics chart server rendering", () => {
  it("renders settled physics SVG with evidence", () => {
    const { svg, evidence } = renderChartWithEvidence("GaltonBoardChart", {
      data: [
        { id: "a", value: 1 },
        { id: "b", value: 2 },
        { id: "c", value: 3 }
      ],
      valueAccessor: "value",
      bins: 3,
      width: 260,
      height: 160,
      title: "Galton"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("GaltonBoardChart")
    expect(evidence.frameType).toBe("physics")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
  })

  it("server-renders mechanical GaltonBoardChart without input data", () => {
    const { svg, evidence } = renderChartWithEvidence("GaltonBoardChart", {
      mode: "mechanical",
      bins: 9,
      pegRows: 8,
      mechanicalCount: 32,
      branchProbability: 0.35,
      width: 260,
      height: 160,
      title: "Mechanical Galton"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("GaltonBoardChart")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
  })

  it("server-renders mechanical PhysicsPileChart without input data", () => {
    const { svg, evidence } = renderChartWithEvidence("PhysicsPileChart", {
      mode: "mechanical",
      mechanicalCategories: ["Backlog", "Active", "Done"],
      mechanicalCount: 36,
      width: 260,
      height: 160,
      title: "Mechanical pile"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("PhysicsPileChart")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(3)
  })

  it("server-renders CollisionSwarmChart as settled physics SVG", () => {
    const { svg, evidence } = renderChartWithEvidence("CollisionSwarmChart", {
      data: [
        { id: "a", x: 12, group: "A" },
        { id: "b", x: 14, group: "A" },
        { id: "c", x: 26, group: "B" }
      ],
      xAccessor: "x",
      groupAccessor: "group",
      xExtent: [0, 40],
      width: 260,
      height: 160,
      title: "Collision swarm"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("CollisionSwarmChart")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
  })


  it("server-renders PhysicalFlowChart as settled packet SVG", () => {
    const { svg, evidence } = renderChartWithEvidence("PhysicalFlowChart", {
      nodes: [
        { id: "A", x: 0.1, y: 0.5 },
        { id: "B", x: 0.9, y: 0.5 }
      ],
      links: [{ id: "flow", source: "A", target: "B", value: 50 }],
      width: 280,
      height: 170,
      title: "Physical flow"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("PhysicalFlowChart")
    expect(evidence.frameType).toBe("physics")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
  })

  it("server-renders PhysicsCustomChart by running the user layout once", () => {
    const layout = (ctx: PhysicsCustomLayoutContext) => ({
      bodies: ctx.data.map((datum, index) => ({
        id: String(datum.id),
        x: 40 + index * 30,
        y: 20,
        mass: 1,
        shape: { type: "circle" as const, radius: 6 },
        datum
      })),
      colliders: [
        {
          id: "floor",
          shape: { type: "aabb" as const, x: 100, y: 150, width: 200, height: 12 }
        }
      ]
    })

    const { svg, evidence } = renderChartWithEvidence("PhysicsCustomChart", {
      data: [{ id: "a" }, { id: "b" }, { id: "c" }],
      layout,
      width: 240,
      height: 160,
      title: "Custom physics"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("PhysicsCustomChart")
    expect(evidence.frameType).toBe("physics")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBe(3)
  })
})
