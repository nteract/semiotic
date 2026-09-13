import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { auditAccessibility } from "../../charts/shared/auditAccessibility"
import { supplierStory } from "../../../../scripts/network-atlas/stories/supplierStory"
import {
  DependencyForestChart,
  dependencyForestChartProps
} from "./DependencyForestChart"
import { DependencyMatrix } from "./DependencyMatrix"
import {
  dependencyForestLayout,
  type DependencyForestLayoutConfig
} from "./dependencyForestLayout"
import type { NetworkLayoutContext } from "../../stream/networkCustomLayout"
import { prepareNetworkAtlasAsync } from "../../semiotic-recipes-core"
import * as recipes from "../../semiotic-recipes"
import { prepareNetworkAtlas } from "./prepare"
import { prepareDependencyForest } from "./dependencyForest"

function context(
  config: Partial<DependencyForestLayoutConfig> = {}
): NetworkLayoutContext<DependencyForestLayoutConfig> {
  const forest = supplierStory().projection
  return {
    nodes: [],
    edges: [],
    dimensions: {
      width: 920,
      height: 440,
      plot: { x: 0, y: 0, width: 920, height: 400 }
    },
    theme: {
      semantic: { text: "#273442", surface: "#fff" },
      categorical: ["#47748a"]
    },
    resolveColor: () => "#47748a",
    config: { forest, ...config }
  }
}

describe("Dependency X-Ray scenes", () => {
  it("prepares required paths through both existing public asynchronous facades", async () => {
    const { atlas } = supplierStory(true).projection
    for (const prepare of [
      prepareNetworkAtlasAsync,
      recipes.prepareNetworkAtlasAsync
    ]) {
      const result = await prepare(atlas.spec, atlas.source)
      expect(result.ok).toBe(true)
      if (result.ok)
        expect(result.atlas.requiredPaths).toEqual(atlas.requiredPaths)
    }
  })
  it("renders every original edge once and keeps dominator ancestry out of the edge ledger", () => {
    const ctx = context({ reading: "required-paths" })
    ctx.config.selection = {
      nodeId: "X",
      relationScopeId: "directed-admitted",
      analysisRevision: ctx.config.forest.atlas.analysisRevision
    }
    const scene = dependencyForestLayout(ctx)
    expect(scene.sceneNodes?.map((node) => node.id).sort()).toEqual(
      ctx.config.forest.atlas.source.nodes.map((node) => node.id).sort()
    )
    expect(scene.sceneEdges?.map((edge) => edge.id).sort()).toEqual(
      ctx.config.forest.residual.originalEdgeIds.slice().sort()
    )
    expect(renderToStaticMarkup(<svg>{scene.overlays}</svg>)).toContain(
      'data-kind="dominator-bracket"'
    )
    expect(
      scene.labels?.some(
        (label) => label.text === "X lies on all admitted paths to A, B"
      )
    ).toBe(true)
    const organize = dependencyForestLayout({
      ...ctx,
      config: { ...ctx.config, reading: "organize" }
    })
    expect(organize.sceneEdges).toEqual(scene.sceneEdges)
    expect(organize.sceneNodes).toEqual(scene.sceneNodes)
  })

  it("accounts for collapsed internal edges and retains every boundary-crossing link", () => {
    const ctx = context({ collapsedNodeIds: ["X"], reading: "required-paths" })
    ctx.config.selection = {
      nodeId: "X",
      relationScopeId: "directed-admitted",
      analysisRevision: ctx.config.forest.atlas.analysisRevision
    }
    const scene = dependencyForestLayout(ctx)
    const x = scene.sceneNodes?.find((node) => node.id === "X")
    const internal = x?.datum?.internalEdgeIds as string[]
    expect(internal.sort()).toEqual(["XA", "XB"])
    expect(
      scene.sceneEdges
        ?.filter(
          (edge) => edge.datum?.source === "A" || edge.datum?.source === "B"
        )
        .map((edge) => edge.id)
        .sort()
    ).toEqual(["Ap", "Bp"])
    expect(
      [...internal, ...scene.sceneEdges!.map((edge) => edge.id)].sort()
    ).toEqual(ctx.config.forest.residual.originalEdgeIds.slice().sort())
    expect(
      scene.labels?.some((label) => label.text === "2 internal links")
    ).toBe(true)
    expect(scene.labels?.map((label) => label.text)).toContain(
      "X lies on all admitted paths to A, B"
    )
  })

  it("ignores selections from a superseded analysis revision", () => {
    const ctx = context({
      reading: "required-paths",
      selection: {
        nodeId: "X",
        relationScopeId: "directed-admitted",
        analysisRevision: "obsolete"
      }
    })
    expect(
      renderToStaticMarkup(<svg>{dependencyForestLayout(ctx).overlays}</svg>)
    ).not.toContain("dominator-bracket")
  })

  it("counts hidden self-loops internally while keeping the collapsed root's own loop visible", () => {
    const { atlas } = supplierStory().projection
    const prepared = prepareNetworkAtlas(atlas.spec, {
      ...atlas.source,
      edges: [
        ...atlas.source.edges,
        { id: "AA", source: "A", target: "A" },
        { id: "XX", source: "X", target: "X" }
      ]
    })
    if (!prepared.ok) throw new Error("fixture admission failed")
    const ctx = context({
      forest: prepareDependencyForest(prepared.atlas),
      collapsedNodeIds: ["X"]
    })
    const scene = dependencyForestLayout(ctx)
    const internal = scene.sceneNodes?.find((node) => node.id === "X")?.datum
      ?.internalEdgeIds as string[]
    expect(internal.sort()).toEqual(["AA", "XA", "XB"])
    expect(
      scene.sceneEdges?.find((edge) => edge.id === "XX")?.datum
    ).toMatchObject({
      source: "X",
      target: "X"
    })
    expect(
      [...internal, ...scene.sceneEdges!.map((edge) => edge.id)].sort()
    ).toEqual(prepared.atlas.source.edges.map((edge) => edge.id).sort())
  })

  it("shares labels, evidence and brackets between React and static SVG", () => {
    const forest = supplierStory().projection
    const props = {
      forest,
      reading: "required-paths" as const,
      selection: {
        nodeId: "X",
        analysisRevision: forest.atlas.analysisRevision,
        relationScopeId: "directed-admitted" as const
      }
    }
    const chartProps = dependencyForestChartProps(props)
    const { svg, evidence } = renderChartWithEvidence(
      "NetworkCustomChart",
      chartProps
    )
    expect(evidence.markCountByType["node:glyph"]).toBe(6)
    expect(evidence.markCountByType["edge:curved"]).toBe(7)
    const markup = renderToStaticMarkup(<DependencyForestChart {...props} />)
    for (const output of [svg, markup]) {
      expect(output).toContain("X lies on all admitted paths to A, B")
      expect(output).toContain("dominator-bracket")
      expect(output).toContain("directed-admitted")
    }
    expect(
      auditAccessibility("NetworkCustomChart", chartProps).findings.filter(
        (finding) => finding.critical && finding.status === "fail"
      )
    ).toEqual([])
  })

  it("exports an accessible matrix with canonical endpoint and edge identity", () => {
    const forest = supplierStory(true).projection
    const markup = renderToStaticMarkup(
      <DependencyMatrix forest={forest} nodeIds={forest.order} />
    )
    expect(markup).toContain("Local directed adjacency matrix")
    expect(markup).toContain('aria-label="Y to A: YA"')
    expect(markup).toContain('scope="row"')
    expect(markup).toContain('scope="col"')
  })
})
