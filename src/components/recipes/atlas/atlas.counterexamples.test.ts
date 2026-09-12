import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { prepareNetworkAtlas } from "./prepare"
import {
  followSupportedRoute,
  getMotifPrevalence,
  uniqueEntityCount
} from "./queries"
import type { NetworkAtlasSource, NetworkAtlasSpec } from "./types"

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../scripts/network-atlas/fixtures"
)

function loadJson(name: string): {
  spec: NetworkAtlasSpec
  source: NetworkAtlasSource
  expected: Record<string, unknown>
} {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8"))
}

describe("ghost-route", () => {
  const fixture = loadJson("ghost-route.json")
  const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!prepared.ok) {
    throw new Error(prepared.issues.map((issue) => issue.message).join("; "))
  }
  const { atlas } = prepared

  it("does not report an observed A → X → D journey", () => {
    const composite = followSupportedRoute(atlas, { route: ["A", "X", "D"] })
    expect(composite.value?.supported).toBe(false)
    expect(composite.value?.graphWalkExists).toBe(true)
    expect(composite.limitations).toContain("unsupported-composite")
    const fromA = followSupportedRoute(atlas, { fromNode: "A" })
    expect(fromA.value?.nextNodes).toEqual(["X"])
    const viaA = followSupportedRoute(atlas, { fromNode: "X", viaNode: "A" })
    expect(viaA.value?.nextNodes).toEqual(["B"])
    expect(viaA.value?.nextNodes).not.toContain("D")
  })
})

describe("overlap-entity", () => {
  const fixture = loadJson("overlap-entity.json")
  const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!prepared.ok) {
    throw new Error(prepared.issues.map((issue) => issue.message).join("; "))
  }
  const { atlas } = prepared

  it("keeps one entity when serial-chain and fan-in both match", () => {
    expect(uniqueEntityCount(atlas)).toBe(1)
    const chain = getMotifPrevalence(atlas, { template: "serial-chain" })
    const fanIn = getMotifPrevalence(atlas, { template: "fan-in" })
    expect(chain.value?.matchCount).toBeGreaterThan(0)
    expect(fanIn.value?.matchCount).toBeGreaterThan(0)
    expect(chain.value?.entityCount).toBe(1)
    expect(fanIn.value?.entityCount).toBe(1)
  })
})

describe("missing-prehistory", () => {
  const fixture = loadJson("missing-prehistory.json")
  const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!prepared.ok) {
    throw new Error(prepared.issues.map((issue) => issue.message).join("; "))
  }

  it("downgrades the motif claim to incomplete instead of zero", () => {
    const prevalence = getMotifPrevalence(prepared.atlas, { template: "serial-chain" })
    expect(prevalence.status).toBe("incomplete")
    expect(prevalence.limitations).toContain("missing-prehistory")
    expect(prepared.atlas.motifs.incompleteCandidates).toHaveLength(1)
  })
})

describe("edge-coverage", () => {
  const fixture = loadJson("edge-coverage.json")
  const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!prepared.ok) {
    throw new Error(prepared.issues.map((issue) => issue.message).join("; "))
  }
  const { atlas } = prepared
  const expected = fixture.expected as {
    backboneEdgeIds: string[]
    residualEdgeIds: string[]
    originalEdgeIds: string[]
  }

  it("keeps parallel edges and self-loops by id in the disjoint union", () => {
    expect(atlas.forest.backboneEdgeIds.sort()).toEqual([...expected.backboneEdgeIds].sort())
    expect(atlas.residualEdges.residualEdgeIds).toEqual(expected.residualEdgeIds)
    expect(atlas.residualEdges.originalEdgeIds.sort()).toEqual(
      [...expected.originalEdgeIds].sort()
    )
    expect(atlas.source.nodes.some((node) => node.id === "__proto__")).toBe(true)
  })
})
