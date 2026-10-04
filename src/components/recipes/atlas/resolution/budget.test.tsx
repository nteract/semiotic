import { describe, expect, it } from "vitest"
import { resolveFixture } from "../../../../../scripts/network-resolution/fixtures"
import { boundaryLoomLayout } from "./boundaryLoomLayout"
import { defaultResolutionView, projectResolutionView } from "./project"
import { resolutionAtlasLayout } from "./resolutionAtlasLayout"
import { renderChartWithEvidence } from "../../../server/renderToStaticSVG"

const nodes = Array.from(
  { length: 84 },
  (_, i) => `n${String(i).padStart(2, "0")}`
)
const resolution = resolveFixture(
  nodes,
  nodes.slice(1).map((node, i) => [`e${i}`, nodes[i], node]),
  {
    rules: [
      { kind: "fold-pendant-fans", version: "1", minLeaves: 2 },
      { kind: "contain-scc", version: "1" },
      { kind: "group-authored", version: "1", hierarchyRef: "all" }
    ]
  },
  {
    edgeSemantics: [],
    authoredHierarchies: [
      {
        id: "all",
        groups: [{ id: "all", label: "All nodes", sourceNodeIds: nodes }]
      }
    ]
  }
)

describe("resolution display budgets", () => {
  it("gives each of four dense pages a share of the default 80 marks", () => {
    const dense = resolveFixture(nodes, [], {
      rules: Array.from(
        { length: 3 },
        () => ({ kind: "contain-scc", version: "1" }) as const
      )
    })
    const projection = projectResolutionView(
      dense,
      defaultResolutionView(dense, "resolution-atlas")
    )
    expect(
      projection.pages.map(
        (page) => projection.groups.filter((g) => g.pageId === page.id).length
      )
    ).toEqual([20, 20, 20, 20])
    expect(projection.disclosure.displayedGroups).toBe(80)
  })

  it.each(["resolution-atlas", "boundary-loom"] as const)(
    "shares the total group budget across every %s page",
    (mode) => {
      const view = defaultResolutionView(resolution, mode)
      const projection = projectResolutionView(resolution, view)
      expect(projection.pages).toHaveLength(4)
      expect(projection.disclosure.displayedGroups).toBe(80)
      expect(
        projection.pages.map(
          (page) => projection.groups.filter((g) => g.pageId === page.id).length
        )
      ).toEqual([26, 26, 27, 1])
      expect(projection.groups.at(-1)?.label).toBe("All nodes")
      expect(projection.memberships.length).toBeGreaterThan(0)
      expect(projection.disclosure.totalGroups).toBe(253)
      expect(
        projection.pages.every((page) => page.coverage.status === "complete")
      ).toBe(true)
      const { svg, evidence } = renderChartWithEvidence("NetworkCustomChart", {
        nodes: [{ id: "seed" }],
        edges: [],
        layout:
          mode === "resolution-atlas"
            ? resolutionAtlasLayout
            : boundaryLoomLayout,
        layoutConfig: { projection },
        width: 1100,
        height: 700,
        title: "Budgeted pages",
        description: "Ownership across four pages",
        accessibleTable: true
      })
      expect(svg).toContain("All nodes")
      expect(evidence.markCountByType["edge:curved"]).toBeGreaterThan(0)
      expect(svg).not.toMatch(/NaN|Infinity/)
    }
  )

  it("prioritizes newer pages when fewer slots than pages are available, including zero", () => {
    const view = defaultResolutionView(resolution, "resolution-atlas")
    for (const maxGroups of [0, 1, 2, 4]) {
      const projection = projectResolutionView(resolution, {
        ...view,
        budget: { ...view.budget, maxGroups }
      })
      expect(projection.groups).toHaveLength(maxGroups)
      expect([...new Set(projection.groups.map((g) => g.pageId))]).toEqual(
        resolution.pages.slice(4 - maxGroups).map((p) => p.id)
      )
    }
    const empty = projectResolutionView(resolution, {
      ...view,
      budget: { ...view.budget, maxRails: 0 }
    })
    expect(empty.groups).toEqual([])
    expect(empty.edges).toEqual([])
  })

  it("keeps expanded Loom rails independent of ownership marks and omits edges without collapsed rails", () => {
    const view = defaultResolutionView(resolution, "boundary-loom")
    for (const collapseGroups of [false, true]) {
      const projection = projectResolutionView(resolution, {
        ...view,
        collapseGroups,
        budget: { ...view.budget, maxGroups: 0 }
      })
      const scene = boundaryLoomLayout({
        nodes: [],
        edges: [],
        dimensions: {
          width: 900,
          height: 700,
          plot: { x: 0, y: 0, width: 900, height: 700 }
        },
        config: { projection },
        theme: { semantic: {}, categorical: [] },
        resolveColor: () => "black"
      })
      expect(
        scene.sceneEdges!.filter((e) => e.datum!.kind === "rail")
      ).toHaveLength(collapseGroups ? 0 : 80)
      expect(projection.edges).toHaveLength(collapseGroups ? 0 : 79)
      expect(projection.disclosure.displayedRails).toBe(collapseGroups ? 0 : 80)
      expect(projection.disclosure.totalRails).toBe(collapseGroups ? 1 : 84)
      expect(projection.edgeCoverageByPage.at(-1)!.literalEdgeIds).toHaveLength(
        collapseGroups ? 0 : 79
      )
      expect(JSON.stringify(scene)).not.toMatch(/NaN|Infinity/)
    }
    const collapsed = projectResolutionView(resolution, {
      ...view,
      collapseGroups: true
    })
    expect(collapsed.disclosure.displayedRails).toBe(1)
    expect(collapsed.caption).toContain("1 of 1 rails")
  })
})
