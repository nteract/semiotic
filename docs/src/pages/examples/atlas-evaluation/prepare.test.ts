import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "semiotic/server"
import { prepareAtlasEvaluation } from "./prepare"
import { atlasEvaluationChartProps } from "./view"

describe("Atlas acceptance projection", () => {
  it.each([false, true])("uses the requested backbone when reverse=%s", (reverse) => {
    const { forest } = prepareAtlasEvaluation({ size: 1000, witnessLimit: 2, reverse }, 1)
    expect(forest.forest.rankingPolicyId).toBe(`rooted-traversal:id-${reverse ? "desc" : "asc"}`)
    expect(forest.forest).toEqual(forest.atlas.forest)
    expect(forest.residual).toEqual(forest.atlas.residualEdges)
  })

  it("changes the exported layout while preserving the original graph and analytical facts", () => {
    const asc = prepareAtlasEvaluation({ size: 1000, witnessLimit: 2 }, 1)
    const desc = prepareAtlasEvaluation({ size: 1000, witnessLimit: 2, reverse: true }, 1)
    expect(desc.forest.forest.backboneEdgeIds).not.toEqual(asc.forest.forest.backboneEdgeIds)
    expect(desc.forest.order).not.toEqual(asc.forest.order)
    expect(desc.forest.sceneSeeds).toEqual(asc.forest.sceneSeeds)
    expect(desc.forest.atlas.ledger).toEqual(asc.forest.atlas.ledger)
    expect(desc.forest.atlas.requiredPaths).toEqual(asc.forest.atlas.requiredPaths)
    expect(desc.forest.atlas.motifs).toEqual(asc.forest.atlas.motifs)
    expect(desc.facts).toEqual(asc.facts)

    const positions = [asc, desc].map((result) => {
      // Exercise the serialized config used by the lab's JSON and SVG exports.
      const props = JSON.parse(JSON.stringify(atlasEvaluationChartProps(result, 0)))
      const { svg, evidence } = renderChartWithEvidence("DependencyForestChart", props)
      expect(evidence.warnings).not.toContain("EMPTY_SCENE")
      const document = new DOMParser().parseFromString(svg, "image/svg+xml")
      const labels = [...document.querySelectorAll("text")]
        .filter((label) => /^r1\.[1-5]$/.test(label.textContent ?? ""))
        .map((label) => ({
          id: label.textContent,
          x: label.getAttribute("x"),
          y: label.getAttribute("y"),
        }))
        .sort((a, b) => a.id!.localeCompare(b.id!))
      expect(labels).toHaveLength(5)
      return labels
    })
    expect(positions[1]).not.toEqual(positions[0])
  })
})
