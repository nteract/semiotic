import { describe, expect, it } from "vitest"
import {
  getRequiredPaths,
  prepareDependencyForest,
  requiredTargets,
  type PreparedNetworkAtlas
} from "semiotic/atlas/core"
import { supplierStory } from "../../../../scripts/network-atlas/stories/supplierStory"

function atlasFixture(): PreparedNetworkAtlas {
  return JSON.parse(JSON.stringify(supplierStory().projection.atlas))
}

// Bound reads so a regression reports a failure instead of hanging the test worker.
function boundedReads<T extends object>(record: T): T {
  let reads = 0
  return new Proxy(record, {
    get(target, key, receiver) {
      if (++reads > 100) throw new Error("Unbounded dominator traversal")
      return Reflect.get(target, key, receiver)
    }
  })
}

describe("public queries over serialized dominator chains", () => {
  it.each([
    "self-cycle",
    "two-cycle",
    "unknown parent",
    "missing entry",
    "invalid parent",
    "missing table"
  ])("reports unknown without partial claims for a %s", (kind) => {
    const atlas = atlasFixture()
    const parents = atlas.requiredPaths!.immediateDominatorByNode
    if (kind === "self-cycle") parents.A = "A"
    if (kind === "two-cycle") parents.X = "A"
    if (kind === "unknown parent") parents.A = "absent"
    if (kind === "missing entry") delete parents.X
    if (kind === "invalid parent") Object.assign(parents, { X: 7 })
    atlas.requiredPaths!.immediateDominatorByNode = boundedReads(parents)
    if (kind === "missing table")
      Object.assign(atlas.requiredPaths!, { immediateDominatorByNode: null })
    const result = getRequiredPaths(atlas, "A")
    expect(result.status).toBe("unknown")
    expect(result.value).toBeUndefined()
    expect(result.evidenceRefs).toEqual([])
    expect(result.limitations.join(" ")).toMatch(/invalid.*dominator/i)
    expect(result.analysisRevision).toBe(atlas.analysisRevision)
  })

  it("does not treat inherited parents as admitted ancestry", () => {
    const atlas = atlasFixture()
    const parents = atlas.requiredPaths!.immediateDominatorByNode
    delete parents.X
    Object.setPrototypeOf(parents, { X: "world" })
    expect(getRequiredPaths(atlas, "A").status).toBe("unknown")
  })

  it("retains ordered ancestry, roots and unreachable nodes after JSON round-trip", () => {
    const atlas = atlasFixture()
    atlas.source.nodes.push({ id: "unreachable" })
    atlas.requiredPaths!.unreachableNodeIds.push("unreachable")
    expect(getRequiredPaths(atlas, "A").value).toEqual({
      target: "A",
      reachable: true,
      dominatorIds: ["world", "X"]
    })
    expect(getRequiredPaths(atlas, "world").value).toEqual({
      target: "world",
      reachable: true,
      dominatorIds: []
    })
    expect(getRequiredPaths(atlas, "unreachable").value).toEqual({
      target: "unreachable",
      reachable: false,
      dominatorIds: []
    })
    expect(getRequiredPaths(atlas, "absent").status).toBe("unknown")
  })

  it("rejects cyclic reverse ancestry instead of hanging the dependency renderer", () => {
    const forest = prepareDependencyForest(atlasFixture())
    forest.requiredChildren.A = ["X"]
    forest.requiredChildren = boundedReads(forest.requiredChildren)
    expect(() => requiredTargets(forest, "X")).toThrow(/invalid.*dominator/i)
  })

  it("rejects malformed reverse ancestry and ignores inherited children", () => {
    const forest = prepareDependencyForest(atlasFixture())
    Object.setPrototypeOf(forest.requiredChildren, { absent: ["A"] })
    expect(requiredTargets(forest, "absent")).toEqual([])
    delete forest.requiredChildren.A
    expect(() => requiredTargets(forest, "X")).toThrow(/invalid.*dominator/i)
  })

  it("rejects unknown dominator parents before building a dependency projection", () => {
    const atlas = atlasFixture()
    atlas.requiredPaths!.immediateDominatorByNode.A = "absent"
    expect(() => prepareDependencyForest(atlas)).toThrow(/invalid.*dominator/i)
  })
})
