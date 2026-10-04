import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { cutawayFixture } from "../../../../../scripts/network-resolution/cutawayFixtures"
import { resolveFixture } from "../../../../../scripts/network-resolution/fixtures"
import { renderChartWithEvidence } from "../../../server/renderToStaticSVG"
import { ComponentCutaway } from "./ComponentCutaway"
import {
  componentCutawayLayout,
  type CutawayProjection
} from "./componentCutawayLayout"
import { projectComponentCutaway } from "./ports"
import { sourceSetValues } from "./sets"

function projection(example: "single" | "multi" | "missing", observed = false) {
  const resolution = cutawayFixture(example)
  const page = resolution.pages[1]
  return projectComponentCutaway(resolution, page.id, page.nodeOwner.x1, {
    basis: observed ? "observed" : "structural"
  })
}
function draw(
  cutaway: CutawayProjection,
  index = 0,
  width = 600,
  height = 400
) {
  return componentCutawayLayout({
    nodes: [],
    edges: [],
    dimensions: { width, height, plot: { x: 0, y: 0, width, height } },
    config: { cutaway, selectedPair: cutaway.value.cells[index]?.query },
    theme: { semantic: {}, categorical: [] },
    resolveColor: () => "black"
  })
}

describe("Component Cutaway", () => {
  it("draws the reversed internal edge, real neighbors and a compact negative verdict", () => {
    const cutaway = projection("single")
    const small = draw(cutaway),
      large = draw(cutaway, 0, 1200, 800)
    for (const scene of [small, large]) {
      const support = scene.sceneNodes!.find(
        (n) => n.datum!.kind === "support-cell"
      )!
      expect(support).toMatchObject({ type: "rect", w: 300, h: 32 })
      expect(
        scene.sceneNodes!.filter((n) => n.datum!.kind === "original-node")
      ).toHaveLength(4)
      expect(
        scene.sceneEdges!.filter((e) => e.datum!.kind === "original-edge")
      ).toHaveLength(3)
      expect(
        scene.sceneEdges!.find((e) => e.datum!.edgeIds?.includes("b"))!.datum!
          .description
      ).toContain("x2 → x1")
      expect(
        scene.sceneEdges!.some(
          (e) => e.datum!.resolutionRole === "cutawayWitness"
        )
      ).toBe(false)
    }
  })

  it("links a selected cell to exact endpoints and witness edges; observed paths include boundary context", () => {
    const structural = projection("multi"),
      observed = projection("multi", true)
    expect(structural.value.supportedPairs).toBe(3)
    expect(observed.value.supportedPairs).toBe(2)
    const index = structural.value.cells.findIndex(
      (c) =>
        c.result.verdict === "yes" && c.result.witness.edgeIds?.includes("x1y2")
    )
    const scene = draw(structural, index)
    expect(
      scene.sceneNodes!.find((n) => n.datum!.nodeId === "x1")!.datum!
        .resolutionRole
    ).toBe("cutawayEntry")
    expect(
      scene.sceneNodes!.find((n) => n.datum!.nodeId === "y2")!.datum!
        .resolutionRole
    ).toBe("cutawayExit")
    expect(
      scene
        .sceneEdges!.filter((e) => e.datum!.resolutionRole === "cutawayWitness")
        .map((e) => e.datum!.edgeIds[0])
    ).toEqual(["x1y2"])
    expect(observed.value.cells[index].result.verdict).toBe("no")
    expect(
      draw(observed, index).sceneEdges!.some(
        (e) => e.datum!.resolutionRole === "cutawayWitness"
      )
    ).toBe(false)
    const yes = observed.value.cells.findIndex(
      (c) => c.result.verdict === "yes"
    )
    expect(
      draw(observed, yes).sceneEdges!.filter(
        (e) => e.datum!.resolutionRole === "cutawayWitness"
      )
    ).toHaveLength(3)
    const { svg, evidence } = renderChartWithEvidence("NetworkCustomChart", {
      nodes: [{ id: "seed" }],
      edges: [],
      layout: componentCutawayLayout,
      layoutConfig: { cutaway: observed },
      width: 600,
      height: 400,
      title: "Directed support",
      description: "Original connections and observed journeys",
      accessibleTable: true
    })
    expect(evidence.markCountByType["edge:curved"]).toBeGreaterThanOrEqual(7)
    expect(svg).toContain("Two entries, two exits")
    expect(svg).not.toMatch(/NaN|Infinity/)
  })

  it("retains real source selections and distinguishes missing observations from absent paths", () => {
    const cutaway = projection("missing", true),
      resolution = cutawayFixture("missing")
    expect(
      cutaway.value.cells.every(
        (c) =>
          c.result.verdict === "unknown" &&
          c.result.coverage.reason === "missing-traces"
      )
    ).toBe(true)
    for (const node of cutaway.value.context.nodes)
      expect(sourceSetValues(resolution.sets, node.sourceSet)).toEqual([
        node.id
      ])
    for (const edge of cutaway.value.context.edges)
      expect(sourceSetValues(resolution.sets, edge.sourceSet)).toEqual([
        edge.id
      ])
  })

  it("keeps drawing limits separate from complete support queries and draws components without port pairs", () => {
    const members = Array.from({ length: 40 }, (_, i) => `n${i}`)
    const resolution = resolveFixture(
      ["A", ...members, "B"],
      [
        ["in", "A", "n0"],
        ...members.slice(1).map((id, i) => [`e${i}`, members[i], id]),
        ["out", "n39", "B"]
      ],
      { rules: [{ kind: "group-authored", version: "1", hierarchyRef: "h" }] },
      {
        edgeSemantics: [],
        authoredHierarchies: [
          {
            id: "h",
            groups: [{ id: "g", label: "Long chain", sourceNodeIds: members }]
          }
        ]
      }
    )
    const page = resolution.pages[1]
    const cutaway = projectComponentCutaway(
      resolution,
      page.id,
      page.nodeOwner.n0
    )
    expect(cutaway.value.cells[0].result).toMatchObject({
      verdict: "yes",
      witness: { nodeIds: members }
    })
    expect(cutaway.value.context).toMatchObject({
      totalNodes: 42,
      totalEdges: 41
    })
    expect(cutaway.value.context.nodes).toHaveLength(32)
    const terminal = projectComponentCutaway(
      resolution,
      page.id,
      page.nodeOwner.B
    )
    expect(terminal.value.cells).toHaveLength(0)
    expect(draw(terminal).sceneNodes).toHaveLength(2)
  })

  it("updates evidence on selection and basis changes, and resets stale selection for another component", () => {
    const resolution = cutawayFixture("multi"),
      page = resolution.pages[1]
    const mounted = render(
      <ComponentCutaway
        resolution={resolution}
        pageId={page.id}
        groupId={page.nodeOwner.x1}
      />
    )
    const row = screen
      .getAllByRole("row")
      .find(
        (r) => r.textContent?.includes("x1") && r.textContent.includes("y2")
      )!
    fireEvent.click(within(row).getByRole("button"))
    expect(screen.getByRole("status").textContent).toContain("x1 → y2")
    fireEvent.change(screen.getByLabelText("Path evidence"), {
      target: { value: "observed" }
    })
    const changedRow = screen
      .getAllByRole("row")
      .find(
        (r) => r.textContent?.includes("x1") && r.textContent.includes("y2")
      )!
    fireEvent.click(within(changedRow).getByRole("button"))
    expect(screen.getByRole("status").textContent).toContain("Observed: no")
    const other = cutawayFixture("single"),
      otherPage = other.pages[1]
    mounted.rerender(
      <ComponentCutaway
        resolution={other}
        pageId={otherPage.id}
        groupId={otherPage.nodeOwner.x1}
      />
    )
    expect(screen.getByRole("status").textContent).toContain("Structural: no")
    expect(screen.getByLabelText("Path evidence")).toHaveValue("structural")
  })
})
