import { describe, expect, it } from "vitest"
import { supplierStory } from "../../../../scripts/network-atlas/stories/supplierStory"
import { prepareNetworkAtlas } from "./prepare"
import { buildRequiredPaths } from "./requiredPaths"
import { stronglyConnectedComponents } from "./directedGraph"
import {
  getRequiredPaths,
  getBypassWitness,
  getDependencyExclusion
} from "./dependencyQueries"
import {
  prepareDependencyForest,
  dependencyMatrix,
  getBranchResidualConnections
} from "./dependencyForest"
import type { NetworkAtlasSource } from "./types"

describe("Dependency X-Ray admitted facts", () => {
  it("matches the independently checked supplier arithmetic and root-relative claims", () => {
    const { projection, fixture, measures } = supplierStory()
    expect(measures.exposureBps).toBe(fixture.expected.exposureBps)
    expect(measures.shortfallBps).toBe(fixture.expected.shortfallBps)
    expect(measures.additional).toBe(
      fixture.expected.additionalIndependentUnitsPerWeek
    )
    const { atlas } = projection
    expect(getRequiredPaths(atlas, "A").value?.dominatorIds).toEqual([
      "world",
      "X"
    ])
    expect(getRequiredPaths(atlas, "B").value?.dominatorIds).toEqual([
      "world",
      "X"
    ])
    expect(getRequiredPaths(atlas, "product").value?.dominatorIds).toEqual([
      "world"
    ])
    expect(
      getBypassWitness(atlas, { target: "A", avoiding: ["X"] }).value
    ).toEqual({ exists: false })
    const witness = getBypassWitness(atlas, {
      target: "product",
      avoiding: ["X"]
    })
    expect(witness.value?.path).toEqual({
      nodeIds: ["world", "C", "product"],
      edgeIds: ["wC", "Cp"]
    })
    expect(witness.analysisRevision).toBe(atlas.analysisRevision)
    expect(witness.scope).toContain("directed-admitted")
  })

  it("recomputes after adding or deleting a zero-capacity bypass without changing the outage scenario", () => {
    const before = supplierStory()
    const after = supplierStory(true)
    expect(after.measures).toEqual(before.measures)
    const { atlas } = after.projection
    expect(getRequiredPaths(atlas, "A").value?.dominatorIds).toEqual(["world"])
    expect(getRequiredPaths(atlas, "B").value?.dominatorIds).toContain("X")
    expect(
      getBypassWitness(atlas, { target: "A", avoiding: ["X"] }).value?.path
    ).toEqual({ nodeIds: ["world", "Y", "A"], edgeIds: ["wY", "YA"] })
    expect(
      atlas.ledger.entries.find((entry) => entry.subjectId === "Y")?.value
    ).toBe(0)
    const deleted = prepareNetworkAtlas(atlas.spec, {
      ...atlas.source,
      revision: "deleted-bypass",
      edges: atlas.source.edges.filter((edge) => edge.id !== "YA")
    })
    if (!deleted.ok) throw new Error("fixture admission failed")
    expect(deleted.atlas.analysisRevision).not.toBe(atlas.analysisRevision)
    expect(getRequiredPaths(deleted.atlas, "A").value?.dominatorIds).toContain(
      "X"
    )
  })

  it("keeps full-graph facts while display ranking changes", () => {
    const { atlas } = supplierStory().projection
    const asc = prepareDependencyForest(atlas)
    const desc = prepareDependencyForest(atlas, {
      rankingPolicyId: "rooted-traversal:id-desc"
    })
    expect([...desc.forest.backboneEdgeIds].sort()).not.toEqual(
      [...asc.forest.backboneEdgeIds].sort()
    )
    expect(desc.atlas).toBe(asc.atlas)
    for (const view of [asc, desc]) {
      expect(
        [
          ...view.forest.backboneEdgeIds,
          ...view.residual.residualEdgeIds
        ].sort()
      ).toEqual(atlas.source.edges.map((edge) => edge.id).sort())
    }
    expect(
      getBranchResidualConnections(asc, "X").some((edge) => edge.id === "Ap")
    ).toBe(true)
  })

  it("retains cyclic regions, parallel edges, self-loops, multiple roots and unreachable unknowns", () => {
    const { atlas } = supplierStory().projection
    const source: NetworkAtlasSource = {
      ...atlas.source,
      nodes: ["r", "q", "a", "b", "z", "__proto__"].map((id) => ({
        id,
        sectionId: "Origin",
        ...(id === "z" ? { completeness: "unknown" as const } : {})
      })),
      edges: [
        { id: "ra", source: "r", target: "a" },
        { id: "ra2", source: "r", target: "a" },
        { id: "qb", source: "q", target: "b" },
        { id: "ab", source: "a", target: "b" },
        { id: "ba", source: "b", target: "a" },
        { id: "aa", source: "a", target: "a" },
        { id: "hostile", source: "a", target: "__proto__" }
      ],
      measureValues: []
    }
    const spec = {
      ...atlas.spec,
      forest: {
        display: {
          kind: "rooted-backbone" as const,
          roots: ["r", "q"],
          rankingPolicyId: "rooted-traversal:id-asc"
        },
        requiredPaths: {
          roots: ["r", "q"],
          relationScopeId: "directed-admitted" as const
        }
      }
    }
    const prepared = prepareNetworkAtlas(spec, source)
    if (!prepared.ok) throw new Error("fixture admission failed")
    const view = prepareDependencyForest(prepared.atlas)
    expect(view.components).toContainEqual(["a", "b"])
    expect(view.atlas.requiredPaths?.immediateDominatorByNode.a).toBeNull()
    expect(view.atlas.requiredPaths?.unreachableNodeIds).toEqual(["z"])
    expect(getRequiredPaths(view.atlas, "a").status).toBe("incomplete")
    expect(
      getRequiredPaths(view.atlas, "__proto__").value?.dominatorIds
    ).toEqual(["a"])
    expect(
      dependencyMatrix(view, ["r", "a", "b"]).find(
        (cell) => cell.source === "r" && cell.target === "a"
      )?.edgeIds
    ).toEqual(["ra", "ra2"])
    expect(view.residual.residualEdgeIds).toContain("aa")
    expect(view.residual.residualEdgeIds).toContain("ba")
    expect(
      [...view.forest.backboneEdgeIds, ...view.residual.residualEdgeIds].sort()
    ).toEqual(source.edges.map((edge) => edge.id).sort())
    expect(
      getBypassWitness(view.atlas, { target: "z", avoiding: ["a"] }).status
    ).toBe("incomplete")
  })

  it("does not turn ordinary path survival into AND-prerequisite completion", () => {
    const { atlas } = supplierStory().projection
    const result = getDependencyExclusion(atlas, ["A"])
    expect(result.value?.lostNodeIds).toEqual(["A"])
    expect(result.limitations.join(" ")).toContain("AND prerequisites")
    expect(result.value).not.toHaveProperty("completion")
  })

  it("rejects unsupported relation scopes, missing roots and absent query targets", () => {
    const { atlas } = supplierStory().projection
    for (const requiredPaths of [
      { roots: [], relationScopeId: "directed-admitted" },
      { roots: ["missing"], relationScopeId: "directed-admitted" },
      { roots: ["world"], relationScopeId: "ownership" }
    ]) {
      const result = prepareNetworkAtlas(
        {
          ...atlas.spec,
          forest: { ...atlas.spec.forest, requiredPaths }
        } as typeof atlas.spec,
        atlas.source
      )
      expect(result.ok).toBe(false)
    }
    expect(getRequiredPaths(atlas, "missing").status).toBe("unknown")
    expect(
      getBypassWitness(atlas, { target: "A", avoiding: ["missing"] }).status
    ).toBe("unknown")
  })
})

it("prepares a 12,000-node chain without recursive stack growth", () => {
  const nodes = Array.from({ length: 12000 }, (_, i) => ({ id: String(i) }))
  const edges = nodes
    .slice(1)
    .map((node, i) => ({ id: String(i), source: String(i), target: node.id }))
  const source: NetworkAtlasSource = {
    graphRef: "deep",
    revision: "1",
    nodes,
    edges,
    measureValues: []
  }
  const result = buildRequiredPaths(source, {
    roots: ["0"],
    relationScopeId: "directed-admitted"
  })
  expect(result.immediateDominatorByNode["11999"]).toBe("11998")
  expect(result.reachableNodeIds).toHaveLength(12000)
})

it("agrees with independent vertex-deletion reachability across 1,024 small cyclic graphs", () => {
  const ids = ["r", "a", "b", "c"]
  const pairs = ids
    .flatMap((source) =>
      ids
        .filter((target) => target !== source)
        .map((target) => ({ source, target }))
    )
    .slice(0, 10)
  for (let mask = 0; mask < 1024; mask++) {
    const source: NetworkAtlasSource = {
      graphRef: "enumerated",
      revision: String(mask),
      nodes: ids.map((id) => ({ id })),
      edges: pairs.flatMap((pair, i) =>
        mask & (1 << i) ? [{ ...pair, id: String(i) }] : []
      ),
      measureValues: []
    }
    const reachable = (excluded?: string) => {
      const seen = new Set<string>(excluded === "r" ? [] : ["r"])
      let changed = true
      while (changed) {
        changed = false
        for (const edge of source.edges)
          if (
            seen.has(edge.source) &&
            edge.target !== excluded &&
            !seen.has(edge.target)
          ) {
            seen.add(edge.target)
            changed = true
          }
      }
      return seen
    }
    const result = buildRequiredPaths(source, {
      roots: ["r"],
      relationScopeId: "directed-admitted"
    })
    expect(result.reachableNodeIds.sort()).toEqual([...reachable()].sort())
    for (const target of result.reachableNodeIds) {
      const ancestors: string[] = []
      let parent = result.immediateDominatorByNode[target]
      while (parent !== null) {
        ancestors.push(parent)
        parent = result.immediateDominatorByNode[parent]
      }
      expect(ancestors.sort()).toEqual(
        ids.filter((id) => id !== target && !reachable(id).has(target)).sort()
      )
    }
    expect(stronglyConnectedComponents(source).flat().sort()).toEqual(
      [...ids].sort()
    )
  }
})
