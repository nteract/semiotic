import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { cycleRank } from "./cycles"
import { indexGraph } from "./indexGraph"
import { OwnershipBuilder } from "./ownership"
import { prepareNetworkResolution } from "./prepare"
import { getEdgeHistory } from "./queries"
import { sourceSetValues } from "./sets"
import {
  atlasFor,
  flagship,
  flagshipEdges,
  flagshipNodes,
  flagshipPartitions,
  resolveFixture,
  semanticsFor,
  spec
} from "../../../../../scripts/network-resolution/fixtures"

describe("reference ledgers and prepared ownership", () => {
  it("reproduces every supplied F01 authored page ledger, with all original IDs recoverable", () => {
    const reference = JSON.parse(
      readFileSync("scripts/network-resolution/reference-results.json", "utf8")
    )
    const expected = reference.tests.find(
      (test: { name: string }) =>
        test.name === "F01 exact page ledgers and cycle identity"
    ).detail
    const builder = new OwnershipBuilder(
      indexGraph(atlasFor(flagshipNodes, flagshipEdges).source),
      "reference",
      semanticsFor(flagshipEdges)
    )
    const pages = flagshipPartitions.map((parts, ordinal) =>
      builder.page(
        `p${ordinal}`,
        ordinal,
        "Authored reference",
        parts.map((members) => ({
          id: JSON.stringify(members),
          members,
          kind: "authored-group",
          label: members.join(", "),
          childGroupIds: [],
          explanationEventIds: []
        })),
        { status: "complete" }
      )
    )
    expect(
      pages.map((page) => ({
        page: page.id,
        blocks: page.groupIds.length,
        internalEdges: page.internalEdgeCount,
        boundaryEdges: page.boundaryEdgeCount,
        internalRank: page.cycles.internalRank,
        boundaryRank: page.cycles.boundaryRank
      }))
    ).toEqual(expected)
    for (const page of pages) {
      const ids = [
        ...page.groupIds.flatMap((id) =>
          sourceSetValues(
            builder.sets.values(),
            builder.groups.get(id)!.internalEdges
          )
        ),
        ...page.bundleIds.flatMap((id) =>
          sourceSetValues(
            builder.sets.values(),
            builder.bundles.get(id)!.originalEdges
          )
        )
      ]
      expect(ids.sort()).toEqual(flagshipEdges.map(([id]) => id).sort())
      expect(page.cycles.sourceRank).toBe(5)
    }
    expect(pages[3].bundleIds).toHaveLength(6)
  })

  it("plans nested source-backed pages, reuses groups, and makes self-loop history start at zero", () => {
    const resolution = flagship()
    expect(resolution.pages).toHaveLength(5)
    expect(resolution.pages[3].groupIds).toHaveLength(5)
    expect(resolution.pages[3].boundaryEdgeCount).toBe(7)
    expect(getEdgeHistory(resolution, "e18").value.firstInternalPage).toBe(0)
    expect(getEdgeHistory(resolution, "e17").value.firstInternalPage).toBeNull()
    expect(getEdgeHistory(resolution, "e10").value.firstInternalPage).toBe(2)
    for (const transition of resolution.transitions) {
      const from = resolution.pages.find(
          (p) => p.id === transition.fromPageId
        )!,
        to = resolution.pages.find((p) => p.id === transition.toPageId)!
      for (const node of flagshipNodes)
        expect(transition.groupMap[from.nodeOwner[node]]).toBe(
          to.nodeOwner[node]
        )
    }
    expect(new Set(resolution.groups.map((g) => g.id)).size).toBe(
      resolution.groups.length
    )
    expect(resolution.sets.some((set) => set.codec === "set-union/v1")).toBe(
      true
    )
    for (const page of resolution.pages)
      expect(page.cycles.sourceRank).toBe(
        page.cycles.internalRank + page.cycles.boundaryRank
      )
  })

  it("keeps missing or incompatible semantics separate while preserving compatible endpoint pairs", () => {
    const nodes = ["p", "q"],
      edges = [
        ["a", "p", "q"],
        ["b", "p", "q"]
      ]
    expect(resolveFixture(nodes, edges).pages[0].bundleIds).toHaveLength(2)
    const bindings = {
      edgeSemantics: semanticsFor(edges),
      authoredHierarchies: []
    }
    expect(
      resolveFixture(nodes, edges, {}, bindings).pages[0].bundleIds
    ).toHaveLength(1)
    bindings.edgeSemantics[1].relationClass = "legal"
    expect(
      resolveFixture(nodes, edges, {}, bindings).pages[0].bundleIds
    ).toHaveLength(2)
  })

  it("records overlapping candidates without double ownership and preserves base motif matches", () => {
    const atlas = atlasFor(
      ["a", "b", "c", "d"],
      [
        ["ab", "a", "b"],
        ["bc", "b", "c"],
        ["cd", "c", "d"]
      ]
    )
    const before = JSON.stringify(atlas)
    const result = prepareNetworkResolution(
      atlas,
      {
        ...spec,
        rules: [
          { kind: "group-authored", version: "1", hierarchyRef: "one" },
          { kind: "group-authored", version: "1", hierarchyRef: "two" }
        ]
      },
      {
        edgeSemantics: [],
        authoredHierarchies: [
          {
            id: "one",
            groups: [{ id: "ab", label: "AB", sourceNodeIds: ["a", "b"] }]
          },
          {
            id: "two",
            groups: [{ id: "bc", label: "BC", sourceNodeIds: ["b", "c"] }]
          }
        ]
      }
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("preparation failed")
    expect(
      result.value.events.find((e) => e.reason === "crosses-current-block")
        ?.action
    ).toBe("rejected")
    expect(result.value.features).toHaveLength(2)
    expect(JSON.stringify(atlas)).toBe(before)
  })

  it("splits disconnected authored membership and respects visible versus label pins", () => {
    const nodes = ["a", "b", "c"],
      edges = [["ab", "a", "b"]]
    const bindings = {
      edgeSemantics: [],
      authoredHierarchies: [
        {
          id: "h",
          groups: [{ id: "g", label: "Department", sourceNodeIds: nodes }]
        }
      ]
    }
    const rules = [
      {
        kind: "group-authored" as const,
        version: "1" as const,
        hierarchyRef: "h"
      }
    ]
    const grouped = resolveFixture(
      nodes,
      edges,
      { rules, pins: [{ nodeId: "a", kind: "keep-label" }] },
      bindings
    )
    expect(grouped.pages[1].groupIds).toHaveLength(2)
    expect(grouped.pages[1].nodeOwner.a).toBe(grouped.pages[1].nodeOwner.b)
    const pinned = resolveFixture(
      nodes,
      edges,
      { rules, pins: [{ nodeId: "a", kind: "keep-visible" }] },
      bindings
    )
    expect(pinned.pages[1].groupIds).toHaveLength(3)
    expect(pinned.events.some((e) => e.reason === "keep-visible-pin")).toBe(
      true
    )
  })

  it("does not fold cycles, loops, or nonterminal fan leaves", () => {
    const resolution = resolveFixture(
      ["a", "b", "c", "d"],
      [
        ["ab", "a", "b"],
        ["ba", "b", "a"],
        ["ac", "a", "c"],
        ["cd", "c", "d"],
        ["dd", "d", "d"]
      ],
      {
        rules: [
          { kind: "fold-serial-interiors", version: "1" },
          { kind: "fold-pendant-fans", version: "1", minLeaves: 2 }
        ]
      }
    )
    expect(resolution.pages.at(-1)!.groupIds).toHaveLength(4)
  })

  it("discloses budgets without losing source records and makes analysis limits part of identity", () => {
    const nodes = ["a", "b"],
      edges = [
        ["a", "a", "b"],
        ["b", "b", "a"]
      ]
    const rules = [{ kind: "contain-scc" as const, version: "1" as const }]
    const budgeted = resolveFixture(nodes, edges, {
      rules,
      limits: { ...spec.limits, maxCandidates: 0 }
    })
    expect(budgeted.stoppedBecause).toBe("resource-limit")
    expect(budgeted.pages[1].coverage.status).toBe("truncated")
    expect(budgeted.pages[1].boundaryEdgeCount).toBe(2)
    const complete = resolveFixture(nodes, edges, { rules })
    expect(complete.analysisRevision).not.toBe(budgeted.analysisRevision)
    expect(
      resolveFixture(nodes, edges, {
        rules,
        limits: { ...spec.limits, maxPages: 1 }
      }).pages
    ).toHaveLength(1)
  })

  it("is deterministic under source and binding permutations and survives JSON round trips", () => {
    const rules = [{ kind: "contain-scc" as const, version: "1" as const }]
    const a = resolveFixture(
      flagshipNodes,
      flagshipEdges,
      { rules },
      { edgeSemantics: semanticsFor(flagshipEdges), authoredHierarchies: [] }
    )
    const b = resolveFixture(
      [...flagshipNodes].reverse(),
      [...flagshipEdges].reverse(),
      { rules },
      {
        edgeSemantics: semanticsFor([...flagshipEdges].reverse()),
        authoredHierarchies: []
      }
    )
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    const restored = JSON.parse(JSON.stringify(a))
    expect(getEdgeHistory(restored, "e10")).toEqual(getEdgeHistory(a, "e10"))
  })

  it("keeps prototype-like and separator IDs safe", () => {
    const resolution = resolveFixture(
      ["__proto__", "constructor", "a|b", "a"],
      [
        ["__proto__", "__proto__", "constructor"],
        ["x", "a|b", "a"]
      ]
    )
    expect(Object.keys(resolution.pages[0].nodeOwner)).toHaveLength(4)
    expect(resolution.pages[0].boundaryEdgeCount).toBe(2)
    expect(
      JSON.parse(JSON.stringify(resolution)).pages[0].nodeOwner.__proto__
    ).toBe(resolution.pages[0].nodeOwner.__proto__)
  })
})

describe("cycle-account oracle", () => {
  it("accounts for every connected partition of every simple graph through four vertices", () => {
    let graphs = 0,
      partitions = 0
    for (let n = 0; n <= 4; n++) {
      const nodes = Array.from({ length: n }, (_, i) => String(i)),
        pairs: [string, string][] = []
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) pairs.push([nodes[i], nodes[j]])
      for (let bits = 0; bits < 2 ** pairs.length; bits++) {
        graphs++
        const edges = pairs
          .filter((_, i) => bits & (2 ** i))
          .map(([source, target], i) => ({ id: String(i), source, target }))
        const partition = (remaining: string[], blocks: string[][]) => {
          if (!remaining.length) {
            // Independent connectivity via repeated edge closure, not production traversal.
            if (
              blocks.some((block) => {
                const seen = new Set(block.slice(0, 1))
                for (let pass = 0; pass < n; pass++)
                  for (const e of edges) {
                    if (!block.includes(e.source) || !block.includes(e.target))
                      continue
                    if (seen.has(e.source) || seen.has(e.target)) {
                      seen.add(e.source)
                      seen.add(e.target)
                    }
                  }
                return seen.size !== block.length
              })
            )
              return
            partitions++
            const builder = new OwnershipBuilder(
              indexGraph({ nodes: nodes.map((id) => ({ id })), edges }),
              "oracle",
              []
            )
            const page = builder.page(
              "p",
              0,
              "test",
              blocks.map((members, i) => ({
                id: String(i),
                members,
                kind: "authored-group",
                label: String(i),
                childGroupIds: [],
                explanationEventIds: []
              })),
              { status: "complete" }
            )
            expect(page.cycles.internalRank + page.cycles.boundaryRank).toBe(
              cycleRank(nodes, edges)
            )
            return
          }
          const [node, ...rest] = remaining
          partition(rest, [...blocks, [node]])
          for (let i = 0; i < blocks.length; i++)
            partition(
              rest,
              blocks.map((b, j) => (i === j ? [...b, node] : b))
            )
        }
        partition(nodes, [])
      }
    }
    expect(graphs).toBe(76)
    expect(partitions).toBe(499)
  })
})
