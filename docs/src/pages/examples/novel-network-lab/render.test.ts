import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "semiotic/server"
import { auditAccessibility, diagnoseConfig } from "semiotic/ai/core"
import { resolutionChartProps } from "semiotic/experimental/network-resolution/react"
import { resolutionHoverPredicate } from "../../../../../src/components/recipes/atlas/resolution/appearance"
import { atlas, circuit, edition, forest, ledger, reading, resolution } from "./data"

const cases = [
  {
    component: "ForceDirectedGraph",
    props: { nodes: ledger.nodes, edges: ledger.edges, nodeSize: "visits", edgeWidth: 2 },
  },
  {
    component: "SankeyDiagram",
    props: { nodes: ledger.nodes, edges: ledger.edges, valueAccessor: "value" },
  },
  {
    component: "ChordDiagram",
    props: { nodes: ledger.nodes, edges: ledger.edges, valueAccessor: "value" },
  },
  { component: "MotifBraidChart", props: { atlas } },
  { component: "DependencyForestChart", props: { forest, reading: "required-paths" } },
  {
    component: "FlowCircuitChart",
    props: { circuit, edition, reading, reducedMotion: true, particleBudget: 0 },
  },
  {
    component: "NetworkCustomChart",
    props: resolutionChartProps({ resolution }, "resolution-atlas"),
  },
  { component: "NetworkCustomChart", props: resolutionChartProps({ resolution }, "boundary-loom") },
] as const

describe("Novel Network Lab chart evidence", () => {
  it("combines Editorial across sections while preserving members, edge endpoints and lineage", () => {
    const props = resolutionChartProps({ resolution, width: 820, height: 500 }, "resolution-atlas")
    const draw = (projection = props.layoutConfig.projection) =>
      props.layout({
        nodes: [],
        edges: [],
        config: { ...props.layoutConfig, projection },
        dimensions: { width: 820, height: 500, plot: { x: 0, y: 0, width: 820, height: 500 } },
        theme: { semantic: {}, categorical: [] },
        resolveColor: () => "black",
      })
    const scene = draw()
    const components = scene.sceneNodes!.filter((n) => n.datum!.resolutionRole === "component")
    const editorial = components.filter((n) => n.datum!.label === "Editorial")
    expect(editorial).toHaveLength(1)
    const group = editorial[0]
    if (group.type !== "rect") throw new Error("Expected Editorial capsule")
    expect(group.datum!.canonicalSelection).toEqual(
      props.layoutConfig.projection.groups.find((g) => g.label === "Editorial")!.selection,
    )
    expect(group.datum!.description).toContain("5 original nodes; 8 internal edges")
    expect(group.datum!.description).toContain("sections: Editing + Review")
    expect(scene.labels!.filter((l) => l.text.includes("Editorial")).map((l) => l.text)).toEqual([
      "▏Editorial",
    ])
    expect(scene.labels!.map((l) => l.text)).toEqual(
      expect.arrayContaining(["5 nodes · 8 inside", "Editing + Review"]),
    )
    const hover = resolutionHoverPredicate(group.datum)!
    const originals = components.filter((n) => n.datum!.generation === 0 && hover(n.datum!))
    expect(originals.flatMap((n) => n.datum!.nodeIds).sort()).toEqual([
      "Author",
      "Copy",
      "Editor",
      "Legal",
      "Proof",
    ])
    for (const member of originals) {
      if (member.type !== "rect") throw new Error("Expected original-node rectangle")
      expect(member.y + member.h / 2).toBeGreaterThan(group.y)
      expect(member.y + member.h / 2).toBeLessThan(group.y + group.h)
    }
    // Original self-loops and all boundary edges still attach at their source rows.
    const page = resolution.pages.at(-1)!
    const expectedEdges = resolution.source.edges
      .filter((e) => e.source === e.target || page.nodeOwner[e.source] !== page.nodeOwner[e.target])
      .map((e) => e.id)
      .sort()
    expect(
      scene
        .sceneEdges!.filter(
          (e) => e.id!.startsWith(`${page.id}:`) && e.datum!.kind === "original-edge",
        )
        .map((e) => e.datum!.edgeIds[0])
        .sort(),
    ).toEqual(expectedEdges)
    // Exercise the geometry contract with Archive interrupting Editorial's
    // rows. Sections alone may merge; a row belonging to another group may not.
    const projection = props.layoutConfig.projection
    const rowOrder = projection.rowOrder.filter((id) => id !== "Archive")
    rowOrder.splice(rowOrder.indexOf("Proof"), 0, "Archive")
    const interrupted = draw({
      ...projection,
      rowOrder,
      groups: projection.groups.map((g) => ({
        ...g,
        rows: g.nodeIds.map((id) => rowOrder.indexOf(id)).sort((a, b) => a - b),
      })),
    })
    const fragments = interrupted.sceneNodes!.filter((n) => n.datum!.label === "Editorial")
    expect(fragments).toHaveLength(2)
    expect(fragments[0].datum!.description).toContain("sections: Editing + Review")
    const archive = interrupted.sceneNodes!.find(
      (n) => n.datum!.generation === 0 && n.datum!.nodeId === "Archive",
    )!
    if (archive.type !== "rect") throw new Error("Expected Archive rectangle")
    const rowY = archive.y + archive.h / 2
    for (const fragment of fragments) {
      if (fragment.type !== "rect") throw new Error("Expected Editorial rectangle")
      expect(rowY < fragment.y || rowY > fragment.y + fragment.h).toBe(true)
      expect(fragment.datum!.canonicalSelection).toEqual(group.datum!.canonicalSelection)
    }
    const { svg } = renderChartWithEvidence("NetworkCustomChart", props)
    expect(svg.match(/>▏Editorial<\/text>/g) ?? []).toHaveLength(1)
    expect(svg).toContain("Editing + Review")
    expect(svg).not.toMatch(/Editorial [12]\/2/)
  })
  it.each(["light", "dark"])("renders all eight views with real marks in %s", (theme) => {
    for (const chart of cases) {
      const props = {
        ...chart.props,
        width: 1200,
        height: 660,
        theme,
        title: "Novel network",
        description: "The same synthetic ledger of 48 manuscripts.",
        summary:
          "Fourteen stages and 21 original edge records; revisions count as additional handoffs.",
        accessibleTable: true,
      }
      const { svg, evidence } = renderChartWithEvidence(chart.component, props)
      expect(evidence.empty, chart.component).toBe(false)
      expect(evidence.markCount, chart.component).toBeGreaterThanOrEqual(14)
      expect(svg).not.toMatch(/NaN|Infinity/)
      const { theme: _theme, ...componentProps } = props
      const diagnosis = diagnoseConfig(chart.component, componentProps)
      expect(diagnosis.ok, JSON.stringify({ component: chart.component, diagnosis })).toBe(true)
      expect(
        auditAccessibility(chart.component, props).findings.filter(
          (finding) => finding.critical && finding.status === "fail",
        ),
        chart.component,
      ).toEqual([])
      if (chart.component === "FlowCircuitChart") {
        expect(svg).toContain("0.000521")
        const labelText = [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(
          (match) => match[1],
        )
        expect(labelText.join(" ")).not.toContain("0.0005208333333333333")
        expect(svg).toContain('data-flow="0.0005208333333333333"')
        expect((svg.match(/data-circuit-edge=/g) ?? []).length).toBe(21)
      }
    }
  })
})
