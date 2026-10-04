import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../../../server/renderToStaticSVG"
import { auditAccessibility } from "../../../charts/shared/auditAccessibility"
import { flagship } from "../../../../../scripts/network-resolution/fixtures"
import { ResolutionAtlasChart } from "./ResolutionAtlasChart"
import { BoundaryLoomChart } from "./BoundaryLoomChart"
import { resolutionChartProps } from "./chartProps"
import { defaultResolutionView, projectResolutionView } from "./project"
import { exportResolutionEvidence } from "./evidence"
import { resolutionSelectionFields } from "./selection"
import { markDatum } from "./scene"
import { getSelectionProvenance } from "../../../store/selectionProvenance"
import {
  resolveFixture,
  spec
} from "../../../../../scripts/network-resolution/fixtures"
import { compareResolutionPolicies, projectNodeResolutionStrip } from "./glyphs"

describe("resolution reader parity", () => {
  const resolution = flagship()
  it.each(["resolution-atlas", "boundary-loom"] as const)(
    "draws evidence-backed %s marks in both static and React readers",
    (mode) => {
      const props = resolutionChartProps(
        { resolution, width: 1100, height: 700 },
        mode
      )
      const { svg, evidence } = renderChartWithEvidence("NetworkCustomChart", {
        ...props,
        accessibleTable: true
      })
      expect(svg).toContain("<svg")
      expect(evidence.markCountByType["edge:curved"]).toBeGreaterThan(0)
      expect(evidence.markCountByType["node:rect"]).toBeGreaterThan(0)
      expect(
        auditAccessibility("NetworkCustomChart", {
          ...props,
          accessibleTable: true
        }).findings.filter((f) => f.critical && f.status === "fail")
      ).toEqual([])
      const Component =
        mode === "resolution-atlas" ? ResolutionAtlasChart : BoundaryLoomChart
      const markup = renderToStaticMarkup(
        <Component resolution={resolution} width={1100} height={700} />
      )
      expect(markup).toContain("<svg")
      expect(markup).toContain("First internal page")
      expect(markup).toContain("18 original edge records")
      expect(markup).toContain("e17")
      expect(markup).toContain("Source ownership and edge history table")
    }
  )

  it("limits displayed rows and columns without changing analytical coverage", () => {
    const before = JSON.stringify(resolution),
      view = defaultResolutionView(resolution, "boundary-loom")
    const full = projectResolutionView(resolution, view)
    const limited = projectResolutionView(resolution, {
      ...view,
      budget: { ...view.budget, maxColumns: 3 }
    })
    expect(limited.disclosure).toMatchObject({
      totalEdges: 18,
      displayedEdges: 3
    })
    expect(limited.caption).toContain("3 of 18")
    expect(limited.pages.map((p) => p.cycles)).toEqual(
      full.pages.map((p) => p.cycles)
    )
    expect(JSON.stringify(resolution)).toBe(before)
    const narrow = resolutionChartProps(
      { resolution, width: 480 },
      "resolution-atlas"
    )
    expect(narrow.layoutConfig.projection.pages).toHaveLength(2)
    expect(
      resolutionChartProps({ resolution, width: 1200 }, "resolution-atlas")
        .layoutConfig.projection.analysisRevision
    ).toBe(narrow.layoutConfig.projection.analysisRevision)
  })

  it("exports selected edge and group claims using the same prepared revision", () => {
    const page = resolution.pages[3],
      groupId = page.nodeOwner.a1
    const packet = exportResolutionEvidence(resolution, {
      kind: "group",
      pageId: page.id,
      groupId
    })
    expect(packet.analysisRevision).toBe(resolution.analysisRevision)
    expect(packet).toMatchObject({
      nodes: expect.arrayContaining(["a1", "a2", "a3", "f"])
    })
    expect(() =>
      exportResolutionEvidence(
        resolution,
        { kind: "group", pageId: page.id, groupId },
        (target) => target.kind !== "original-node" || target.nodeId !== "a2"
      )
    ).toThrow("denied")
    const edge = exportResolutionEvidence(resolution, {
      kind: "original-edge",
      edgeId: "e17"
    })
    expect(edge).toMatchObject({
      edge: { id: "e17", source: "r", target: "z" }
    })
  })

  it("adapts exact membership to the existing selection store and rejects stale identities", () => {
    const projection = projectResolutionView(
      resolution,
      defaultResolutionView(resolution, "resolution-atlas")
    )
    const group = projection.groups.find((g) => g.nodeIds.length > 1)!
    expect(resolutionSelectionFields(resolution, group.selection)).toEqual({
      nodeId: group.nodeIds
    })
    expect(getSelectionProvenance(markDatum(group))).toEqual(
      expect.arrayContaining(group.nodeIds.map((nodeId) => ({ nodeId })))
    )
    expect(
      resolutionSelectionFields(resolution, {
        ...group.selection,
        analysisRevision: "stale"
      })
    ).toBeNull()
  })
  it("discloses F06's 20-of-200 view independently of complete analysis", () => {
    const nodes = ["root", ...Array.from({ length: 200 }, (_, i) => `leaf${i}`)]
    const resolution = resolveFixture(
      nodes,
      nodes.slice(1).map((id) => [id, "root", id])
    )
    const view = defaultResolutionView(resolution, "boundary-loom")
    const projection = projectResolutionView(resolution, {
      ...view,
      budget: { ...view.budget, maxColumns: 20, maxRails: 201 }
    })
    expect(projection.disclosure).toMatchObject({
      displayedEdges: 20,
      totalEdges: 200
    })
    expect(projection.edgeCoverageByPage[0].omittedEdgeIds).toHaveLength(180)
    expect(projection.pages[0].coverage.status).toBe("complete")
  })
  it("compares policy branches by source membership and keeps owner counts scoped", () => {
    const nodes = ["a", "b"],
      edges = [
        ["ab", "a", "b"],
        ["ba", "b", "a"]
      ]
    const plain = resolveFixture(nodes, edges),
      contained = resolveFixture(nodes, edges, {
        ...spec,
        rules: [{ kind: "contain-scc", version: "1" }]
      })
    expect(
      compareResolutionPolicies(plain, contained, ["a"]).rows[0]
    ).toMatchObject({
      membershipChanged: true,
      leftMembers: ["a"],
      rightMembers: ["a", "b"]
    })
    expect(
      projectNodeResolutionStrip(contained, "a").value.pages[1]
    ).toMatchObject({ ownerMemberCount: 2, ownerBoundaryEdges: 0 })
  })
})
