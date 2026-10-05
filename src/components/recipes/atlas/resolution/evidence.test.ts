import { describe, expect, it } from "vitest"
import {
  atlasFor,
  flagship,
  resolveFixture,
  semanticsFor,
  spec
} from "../../../../../scripts/network-resolution/fixtures"
import { prepareNetworkResolution } from "./prepare"
import { projectComponentCutaway, traceComponentPort } from "./ports"
import { sourceSetValues } from "./sets"
import { getEdgeAlternative } from "./witnesses"
import type {
  PortPathQuery,
  PreparedNetworkResolution,
  ResolutionSpec
} from "./types"

function queryFor(
  resolution: PreparedNetworkResolution,
  node: string
): PortPathQuery {
  const page = resolution.pages.at(-1)!,
    groupId = page.nodeOwner[node]
  const ports = resolution.ports.filter((p) => p.groupId === groupId)
  return {
    pageId: page.id,
    groupId,
    ingressId: ports.find((p) => p.direction === "in")!.id,
    egressId: ports.find((p) => p.direction === "out")!.id,
    basis: "structural",
    continuation: "inside-only",
    scopeId: resolution.spec.relationScopeId
  }
}

describe("scoped evidence", () => {
  it("paginates all port-pair tiles, including off-diagonal tiles", () => {
    const inside = Array.from({ length: 9 }, (_, i) => `n${i}`)
    const edges = inside.flatMap((id, i) => [
      [`in${i}`, "A", id],
      [`out${i}`, id, "Z"],
      ...(i > 0 ? [[`chain${i}`, inside[i - 1], id]] : [])
    ])
    const resolution = resolveFixture(
      ["A", ...inside, "Z"],
      edges,
      {
        rules: [{ kind: "group-authored", version: "1", hierarchyRef: "h" }]
      },
      {
        edgeSemantics: [],
        authoredHierarchies: [
          {
            id: "h",
            groups: [{ id: "g", label: "Ports", sourceNodeIds: inside }]
          }
        ]
      }
    )
    const page = resolution.pages[1],
      pairs = new Set<string>()
    for (let offset = 0; offset < 4; offset++) {
      const tile = projectComponentCutaway(
        resolution,
        page.id,
        page.nodeOwner.n0,
        { offset, query: false }
      ).value
      expect(tile.pageCount).toBe(4)
      for (const cell of tile.cells)
        pairs.add(`${cell.query.ingressId}/${cell.query.egressId}`)
    }
    expect(pairs.size).toBe(81)
  })
  it("exposes F02's false quotient route at its actual boundary endpoints", () => {
    const resolution = resolveFixture(
      ["A", "x1", "x2", "D"],
      [
        ["a", "A", "x1"],
        ["b", "x2", "x1"],
        ["c", "x2", "D"]
      ],
      {
        rules: [{ kind: "group-authored", version: "1", hierarchyRef: "h" }]
      },
      {
        edgeSemantics: [],
        authoredHierarchies: [
          {
            id: "h",
            groups: [{ id: "x", label: "X", sourceNodeIds: ["x1", "x2"] }]
          }
        ]
      }
    )
    const query = queryFor(resolution, "x1")
    expect(traceComponentPort(resolution, query)).toMatchObject({
      verdict: "no",
      coverage: { status: "complete" }
    })
    expect(
      projectComponentCutaway(resolution, query.pageId, query.groupId).value
    ).toMatchObject({ queriedPairs: 1, supportedPairs: 0, totalPairs: 1 })
    expect(
      projectComponentCutaway(resolution, query.pageId, query.groupId, {
        query: false
      }).value.cells[0].result
    ).toMatchObject({ verdict: "unknown", coverage: { reason: "unqueried" } })
  })

  it("distinguishes structural continuation from F03's two incompatible journeys", () => {
    const nodes = ["A", "X", "B", "C", "D"],
      edges = [
        ["ax", "A", "X"],
        ["xb", "X", "B"],
        ["cx", "C", "X"],
        ["xd", "X", "D"]
      ]
    const occurrences = [
      { id: "one", entityId: "1", nodePath: ["A", "X", "B"], complete: true },
      { id: "two", entityId: "2", nodePath: ["C", "X", "D"], complete: true }
    ]
    const resolution = resolveFixture(nodes, edges, {}, undefined, occurrences)
    const query = queryFor(resolution, "X")
    const byId = (id: string) =>
      resolution.sets.find(
        (set) =>
          set.codec === "sorted-string-ids/v1" &&
          set.ref.domain === "edge" &&
          set.values.length === 1 &&
          set.values[0] === id
      )!.ref
    query.ingressEdges = byId("ax")
    query.egressEdges = byId("xd")
    query.continuation = "boundary-context"
    expect(traceComponentPort(resolution, query)).toMatchObject({
      verdict: "yes",
      witness: { nodeIds: ["A", "X", "D"], edgeIds: ["ax", "xd"] }
    })
    expect(
      traceComponentPort(resolution, { ...query, basis: "observed" })
    ).toMatchObject({ verdict: "no", coverage: { status: "complete" } })
    const missing = resolveFixture(nodes, edges)
    expect(
      traceComponentPort(missing, {
        ...queryFor(missing, "X"),
        basis: "observed",
        continuation: "boundary-context"
      })
    ).toMatchObject({
      verdict: "unknown",
      coverage: { reason: "missing-traces" }
    })
  })

  it("returns contiguous repeated-visit offsets and reports parallel edge identity honestly", () => {
    const edges = [
      ["ax", "A", "X"],
      ["ax2", "A", "X"],
      ["xb", "X", "B"],
      ["bx", "B", "X"],
      ["xd", "X", "D"]
    ]
    const resolution = resolveFixture(
      ["A", "X", "B", "D"],
      edges,
      {},
      undefined,
      [
        {
          id: "repeat",
          entityId: "1",
          complete: true,
          nodePath: ["A", "X", "B", "X", "D"]
        }
      ]
    )
    const query = {
      ...queryFor(resolution, "X"),
      basis: "observed" as const,
      continuation: "boundary-context" as const
    }
    // Both ingress records remain possible for the A-X-B segment.
    const result = traceComponentPort(resolution, query)
    expect(result).toMatchObject({
      verdict: "yes",
      witness: {
        startOffset: 0,
        endOffset: 2,
        nodeIds: ["A", "X", "B"],
        edgeIdentity: "ambiguous"
      }
    })
    if (result.verdict !== "yes") throw new Error("expected evidence")
    expect(result.witness).not.toHaveProperty("edgeIds")
    const oneEdge = resolution.sets.find(
      (set) =>
        set.codec === "sorted-string-ids/v1" &&
        set.ref.domain === "edge" &&
        set.values.length === 1 &&
        set.values[0] === "ax"
    )!.ref
    expect(
      traceComponentPort(resolution, { ...query, ingressEdges: oneEdge })
    ).toMatchObject({
      verdict: "unknown",
      coverage: { reason: "parallel-edge-identity-unavailable" }
    })
  })

  it("keeps all F04 parallel records and never lets them mutually justify subduing", () => {
    const edges = [
      ["a", "p", "q"],
      ["b", "p", "q"]
    ]
    const resolution = resolveFixture(
      ["p", "q"],
      edges,
      {
        rules: [
          {
            kind: "annotate-dag-transitivity",
            version: "1",
            semanticPolicyId: "reachability/v1"
          }
        ]
      },
      { edgeSemantics: semanticsFor(edges), authoredHierarchies: [] }
    )
    expect(resolution.pages[1].boundaryEdgeCount).toBe(2)
    expect(
      resolution.events.filter((e) => e.action === "subdued")
    ).toHaveLength(0)
    expect(getEdgeAlternative(resolution, "a").value).toMatchObject({
      verdict: "yes",
      witness: { edgeIds: ["b"] }
    })
  })

  it("replays transitive witnesses against source edges retained by the final DAG reading", () => {
    const resolution = flagship()
    const subdued = new Set(
      resolution.events
        .filter((e) => e.action === "subdued")
        .flatMap((e) => sourceSetValues(resolution.sets, e.affectedEdges))
    )
    expect(subdued.has("e17")).toBe(true)
    for (const { value: witness } of resolution.witnesses) {
      if (witness.kind !== "structural-path")
        throw new Error("unexpected witness kind")
      expect(witness.edgeIds.length).toBeGreaterThanOrEqual(2)
      witness.edgeIds.forEach((id, i) => {
        expect(subdued.has(id)).toBe(false)
        expect(resolution.source.edges.find((e) => e.id === id)).toMatchObject({
          source: witness.nodeIds[i],
          target: witness.nodeIds[i + 1]
        })
      })
    }
    expect(resolution.pages.at(-1)!.cycles).toEqual(
      resolution.pages.at(-2)!.cycles
    )
    expect(
      resolution.pages
        .at(-1)!
        .presentation.some((p) => p.subduedForReachability)
    ).toBe(true)
  })

  it("returns unknown for unfinished searches, and unsupported coverage for unlicensed subduing", () => {
    const nodes = ["a", "b", "c"],
      edges = [
        ["ab", "a", "b"],
        ["bc", "b", "c"],
        ["ac", "a", "c"]
      ]
    const resolution = resolveFixture(nodes, edges, {
      limits: { ...spec.limits, maxExploredEdges: 0 }
    })
    expect(getEdgeAlternative(resolution, "ac")).toMatchObject({
      coverage: { status: "truncated" },
      value: { verdict: "unknown" }
    })
    const unsupported = resolveFixture(nodes, edges, {
      rules: [
        {
          kind: "annotate-dag-transitivity",
          version: "1",
          semanticPolicyId: "reachability/v1"
        }
      ]
    })
    expect(unsupported.pages[1].coverage.status).toBe("unsupported")
    expect(unsupported.pages[1].groupIds).toEqual(unsupported.pages[0].groupIds)
    const stopped = resolveFixture(
      nodes,
      edges,
      {
        rules: [
          {
            kind: "annotate-dag-transitivity",
            version: "1",
            semanticPolicyId: "reachability/v1"
          },
          { kind: "contain-scc", version: "1" }
        ],
        pageRuleCounts: [2],
        limits: { ...spec.limits, maxExploredEdges: 0 }
      },
      { edgeSemantics: semanticsFor(edges), authoredHierarchies: [] }
    )
    expect(stopped.stoppedBecause).toBe("resource-limit")
    expect(stopped.pages[1].coverage.status).toBe("truncated")
    expect(stopped.pages[1].originalEdgeCount).toBe(3)
  })
})

describe("malformed inputs", () => {
  it.each([
    { schemaVersion: "bad" },
    { limits: { ...spec.limits, maxCandidates: NaN } },
    { rules: [{ kind: "contain-scc", version: "99" }] },
    { pageRuleCounts: [2] },
    { pins: [{ kind: "keep-visible", nodeId: "missing" }] }
  ])("rejects invalid specs before graph preparation: %j", (override) => {
    const result = prepareNetworkResolution(atlasFor(["a"], []), {
      ...spec,
      ...override
    } as ResolutionSpec)
    expect(result.ok).toBe(false)
  })
  it("rejects duplicate IDs, dangling edges, stale revisions and nonnested hierarchies", () => {
    const atlas = atlasFor(["a", "b", "c"], [["ab", "a", "b"]])
    atlas.source.nodes.push({ id: "a" })
    atlas.source.edges.push({ id: "bad", source: "missing", target: "b" })
    atlas.source.revision = "stale"
    const result = prepareNetworkResolution(atlas, spec, {
      edgeSemantics: [],
      authoredHierarchies: [
        {
          id: "h",
          groups: [
            { id: "ab", label: "AB", sourceNodeIds: ["a", "b"] },
            { id: "bc", label: "BC", sourceNodeIds: ["b", "c"] }
          ]
        }
      ]
    })
    expect(result.ok).toBe(false)
    expect(result.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining([
        "duplicate-node",
        "dangling-edge",
        "stale-atlas",
        "nonnested-hierarchy"
      ])
    )
  })
})
