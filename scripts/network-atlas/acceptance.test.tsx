import * as React from "react"
import { createHash } from "node:crypto"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  prepareNetworkAtlas,
  prepareDependencyForest
} from "semiotic/atlas/core"
import { DependencyForestChart } from "semiotic/atlas"
import { renderChartWithEvidence } from "semiotic/server"
import { matchMotifs } from "../../src/components/recipes/atlas/motifs"
import { dependencyForestLayout } from "../../src/components/recipes/atlas/dependencyForestLayout"
import { atlasWorkload, overviewBranches } from "./workloads"
import { atlasAcceptanceFacts } from "./acceptance"
import { prepareAtlasEvaluation } from "../../docs/src/pages/examples/atlas-evaluation/prepare"
import { atlasEvaluationChartProps } from "../../docs/src/pages/examples/atlas-evaluation/view"
import { atlasMotifWorkloads } from "../../benchmarks/setup/network-atlas-motif-workloads"

function prepare(size: 1000 | 10000, witnessLimit = 5, reverse = false) {
  const fixture = atlasWorkload({ size, witnessLimit, reverse })
  const result = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return { ...fixture, atlas: result.atlas }
}

describe("Atlas acceptance workloads", () => {
  // Captured from merged 321d8d6a before indexing: compare every serialized
  // fact, support interval, ID, order and provenance field, not just totals.
  it.each([
    [1000, "6b3b2dac2cce9d672914e267306b1eae80df7b011ac4624c2de2ee34a0f14375"],
    [10000, "cc9e9d551eb3b37c5273f583ce4d4276f8911463a70e1f95d4749053c30f06b0"]
  ] as const)(
    "preserves all prepared facts for %i vertices",
    (size, expected) => {
      const { atlas } = prepare(size)
      expect(
        createHash("sha256").update(JSON.stringify(atlas)).digest("hex")
      ).toBe(expected)
      expect(atlasAcceptanceFacts(atlas)).toMatchObject({
        nodes: size,
        edges: size * 5,
        sections: 20,
        stock: size,
        matches: size * 2
      })
      expect(
        atlasAcceptanceFacts(atlas).checks.every((check) => check.passed)
      ).toBe(true)
    }
  )

  it("bounds graph reads independently of vertex × edge growth", () => {
    const { spec, source } = atlasWorkload({ size: 1000, witnessLimit: 5 })
    let reads = 0
    source.edges = source.edges.map((edge) => ({
      id: edge.id,
      get source() {
        reads += 1
        return edge.source
      },
      get target() {
        reads += 1
        return edge.target
      }
    }))
    expect(matchMotifs(spec, source).matches).toHaveLength(2000)
    // A generous operation budget, independent of CPU timing. The previous
    // whole-graph scans exceed it by more than two orders of magnitude.
    expect(reads).toBeLessThan(source.edges.length * 40)
  })

  it("reports high-output fans and matches long chains and repeated episodes", () => {
    for (const { name, spec, source } of atlasMotifWorkloads()) {
      const { matches } = matchMotifs(spec, source)
      if (name.startsWith("serial-chain")) {
        // The existing catalog includes overlapping chains beginning at the
        // source and its first internal successor; this is not a partition.
        expect(matches, name).toHaveLength(2)
        expect(matches[0].nodePath, name).toHaveLength(source.nodes.length)
        expect(matches[0].edgeIds, name).toEqual(
          source.edges.map((edge) => edge.id)
        )
      } else if (name.startsWith("repeated-state-episode")) {
        expect(matches, name).toHaveLength(source.occurrences!.length)
        expect(
          matches.every((match) => match.template === "repeated-state-episode"),
          name
        ).toBe(true)
      } else {
        const fan = matches.find((match) => name.startsWith(match.template))!
        expect(fan, name).toBeDefined()
        if (name.endsWith("bounded")) {
          expect(fan.nodePath, name).toHaveLength(33)
          expect(fan.truncation, name).toEqual({
            disclosed: true,
            fullCount: 9999,
            omitted: 9967
          })
          expect(fan.intersectSectionIds, name).toHaveLength(20)
        } else {
          expect(fan.nodePath, name).toHaveLength(10000)
          expect(fan.truncation, name).toBeUndefined()
        }
      }
    }
  })

  it("keeps complete ledgers and dominance when witness limits or backbone order change", () => {
    const full = prepare(1000)
    const limited = prepare(1000, 2, true)
    expect(limited.atlas.ledger).toEqual(full.atlas.ledger)
    expect(limited.atlas.requiredPaths).toEqual(full.atlas.requiredPaths)
    expect(limited.atlas.forest.backboneEdgeIds).not.toEqual(
      full.atlas.forest.backboneEdgeIds
    )
    expect(atlasAcceptanceFacts(limited.atlas)).toMatchObject({
      stock: 1000,
      matches: 2000,
      truncatedMatches: 2000
    })
    expect(
      atlasAcceptanceFacts(limited.atlas).checks.every((check) => check.passed)
    ).toBe(true)
  })

  it("bounds the overview while accounting for every hidden vertex and edge", () => {
    const { atlas, groups } = prepare(10000)
    const forest = prepareDependencyForest(atlas)
    const scene = dependencyForestLayout({
      nodes: [],
      edges: [],
      config: { forest, collapsedNodeIds: overviewBranches(groups) },
      dimensions: {
        width: 1200,
        height: 1100,
        plot: { x: 0, y: 0, width: 1200, height: 1100 }
      },
      theme: {
        semantic: { text: "#222", surface: "#fff" },
        categorical: ["#47748a"]
      },
      resolveColor: () => "#47748a"
    })
    expect(scene.sceneNodes).toHaveLength(397)
    const hidden = scene.sceneNodes!.reduce(
      (sum, node) => sum + Number(node.datum!.hiddenCount),
      0
    )
    const internal = scene.sceneNodes!.flatMap(
      (node) => node.datum!.internalEdgeIds as string[]
    )
    const painted = scene.sceneEdges!.map((edge) => edge.id!)
    expect(hidden + scene.sceneNodes!.length).toBe(10000)
    expect(new Set([...internal, ...painted])).toEqual(
      new Set(atlas.source.edges.map((edge) => edge.id))
    )
    expect(internal.length + painted.length).toBe(50000)
  })

  it.each([1000, 10000] as const)(
    "renders %i vertices through React SSR and evidence-backed SVG",
    (size) => {
      const props = atlasEvaluationChartProps(
        prepareAtlasEvaluation({ size, witnessLimit: 5 }, 1),
        0
      )
      expect(
        renderToStaticMarkup(<DependencyForestChart {...props} />)
      ).toContain('role="img"')
      const { svg, evidence } = renderChartWithEvidence(
        "DependencyForestChart",
        props
      )
      expect(evidence.markCount).toBeGreaterThan(300)
      expect(evidence.warnings).not.toContain("EMPTY_SCENE")
      expect(svg).toContain("Atlas acceptance overview")
      expect(svg).toContain("500 internal links")
      const description = svg.match(/<desc[^>]*>(.*?)<\/desc>/)?.[1]
      expect(description).toContain(`${size.toLocaleString("en-US")} vertices`)
      expect(description).toContain(
        "Capacity and completion measurements are not supplied"
      )
      expect(svg).not.toMatch(/NaN|Infinity/)
    }
  )
})
