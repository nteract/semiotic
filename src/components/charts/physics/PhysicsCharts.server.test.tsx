import * as React from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import ChainReactionChart from "./ChainReactionChart"
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

  it("server-renders mechanical UnitPileChart without input data", () => {
    const { svg, evidence } = renderChartWithEvidence("UnitPileChart", {
      mode: "mechanical",
      mechanicalCategories: ["Backlog", "Active", "Done"],
      mechanicalCount: 36,
      width: 260,
      height: 160,
      title: "Mechanical pile"
    })

    expect(svg).toContain("<svg")
    expect(evidence.component).toBe("UnitPileChart")
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


  it("server-renders PacketFlowChart as settled packet SVG", () => {
    const { svg, evidence } = renderChartWithEvidence("PacketFlowChart", {
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
    expect(evidence.component).toBe("PacketFlowChart")
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

  // ChainReactionChart is a documented serverChartConfigs exclusion (its settled
  // reading is an authored overlay over zero bodies), so its supported static
  // snapshot is the HOC SSR path. Assert that path derives the *settled* state,
  // not the authored start — no simulation runs on the server.
  it("server-renders ChainReactionChart's derived settled state via the HOC path", () => {
    const tasks = [
      { id: "brief", title: "Brief", lane: "Product", dependsOn: [], status: "done", completed: 1, progress: 1 },
      { id: "spec", title: "Spec", lane: "Product", dependsOn: ["brief"], status: "done", completed: 3, progress: 1 },
      { id: "privacy", title: "Privacy", lane: "Product", dependsOn: ["brief"], status: "blocked", blocker: "Legal review", progress: 0.9 },
      { id: "schema", title: "Schema", lane: "Data", dependsOn: ["privacy", "spec"], status: "waiting", progress: 0.25 },
      { id: "ingest", title: "Ingest", lane: "Data", dependsOn: ["schema"], status: "waiting", progress: 0 }
    ]

    const html = renderToString(
      <ChainReactionChart
        data={tasks}
        taskIDAccessor="id"
        labelAccessor="title"
        laneAccessor="lane"
        dependencyAccessor="dependsOn"
        statusAccessor="status"
        completionTimeAccessor="completed"
        progressAccessor="progress"
        blockerAccessor="blocker"
        currentTime={10}
        mode="snapshot"
        width={600}
        height={400}
        title="Release dependency machine"
      />
    )

    expect(html).toContain("<svg")
    // Lanes and task labels are drawn by the overlay.
    expect(html).toContain("Product")
    expect(html).toContain("Data")
    // The accessible table carries the settled reading.
    expect(html).toContain("<table")
    expect(html).toContain("Blocked")
    // A blocked prerequisite must leave its dependents unarmed, which is only
    // true if the machine derived state rather than trusting authored status.
    expect(html).toContain("Waiting")
    expect(html).toContain("Legal review")
  })
})
