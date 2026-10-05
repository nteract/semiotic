import { describe, expect, it } from "vitest"
import {
  resolveFixture,
  spec
} from "../../../../../scripts/network-resolution/fixtures"
import { sourceSetValues } from "./sets"

const nodes = ["a", "b", "c", "d", "e", "f"]
const edges = nodes.slice(1).map((node, i) => [`edge${i}`, nodes[i], node])
const rule = {
  kind: "group-authored",
  version: "1",
  hierarchyRef: "h"
} as const
const groups = [
  { id: "root", label: "Root", sourceNodeIds: nodes },
  {
    id: "child",
    parentId: "root",
    label: "Child",
    sourceNodeIds: nodes.slice(0, 4)
  },
  {
    id: "leaf",
    parentId: "child",
    label: "Leaf",
    sourceNodeIds: nodes.slice(0, 2)
  },
  {
    id: "sibling",
    parentId: "root",
    label: "Sibling",
    sourceNodeIds: nodes.slice(4)
  }
]
const bindings = {
  edgeSemantics: [],
  authoredHierarchies: [{ id: "h", groups }]
}

describe("authored hierarchy planning", () => {
  it.each([true, false])(
    "preserves every nested level and its provenance (parent IDs: %s)",
    (explicit) => {
      const input = explicit
        ? bindings
        : {
            ...bindings,
            authoredHierarchies: [
              {
                id: "h",
                groups: groups.map(({ id, label, sourceNodeIds }) => ({
                  id,
                  label,
                  sourceNodeIds
                }))
              }
            ]
          }
      const resolution = resolveFixture(nodes, edges, { rules: [rule] }, input)
      expect(resolution.pages).toHaveLength(2)
      const authored = resolution.groups.filter(
        (g) => g.kind === "authored-group"
      )
      expect(authored.map((g) => g.label).sort()).toEqual([
        "Child",
        "Leaf",
        "Root",
        "Sibling"
      ])
      const named = (label: string) => authored.find((g) => g.label === label)!
      expect(named("Root").childGroupIds.sort()).toEqual(
        [named("Child").id, named("Sibling").id].sort()
      )
      expect(named("Child").childGroupIds).toContain(named("Leaf").id)
      expect(resolution.pages[1].groupIds).toEqual([named("Root").id])
      expect(resolution.events).toHaveLength(4)
      expect(resolution.events.every((e) => e.action === "grouped")).toBe(true)
      for (const group of authored) {
        const event = resolution.events.find((e) =>
          group.explanationEventIds.includes(e.id)
        )!
        expect(event.beforeGroupIds).toEqual(group.childGroupIds)
        expect(event.afterGroupIds).toEqual([group.id])
        expect(
          group.childGroupIds
            .flatMap((id) =>
              sourceSetValues(
                resolution.sets,
                resolution.groups.find((g) => g.id === id)!.sourceNodes
              )
            )
            .sort()
        ).toEqual(sourceSetValues(resolution.sets, group.sourceNodes).sort())
      }
      expect(resolution.transitions[0].eventIds).toHaveLength(4)
      for (const node of nodes)
        expect(
          resolution.transitions[0].groupMap[
            resolution.pages[0].nodeOwner[node]
          ]
        ).toBe(named("Root").id)
      expect(
        resolveFixture(
          [...nodes].reverse(),
          [...edges].reverse(),
          { rules: [rule] },
          {
            ...input,
            authoredHierarchies: [
              {
                id: "h",
                groups: [...input.authoredHierarchies[0].groups].reverse()
              }
            ]
          }
        )
      ).toEqual(resolution)
    }
  )

  it("retains a child when a disconnected parent's part has the same membership", () => {
    const resolution = resolveFixture(
      ["a", "b", "x"],
      [["ab", "a", "b"]],
      { rules: [rule] },
      {
        edgeSemantics: [],
        authoredHierarchies: [
          {
            id: "h",
            groups: [
              { id: "parent", label: "Parent", sourceNodeIds: ["a", "b", "x"] },
              {
                id: "child",
                label: "Child",
                parentId: "parent",
                sourceNodeIds: ["a", "b"]
              }
            ]
          }
        ]
      }
    )
    const child = resolution.groups.find((g) => g.label === "Child")!
    const parent = resolution.groups.find(
      (g) => g.id === resolution.pages[1].nodeOwner.a
    )!
    expect(parent.label).toBe("Parent (1/2)")
    expect(parent.childGroupIds).toEqual([child.id])
    expect(resolution.events.every((e) => e.action === "grouped")).toBe(true)
  })

  it("accounts for unexamined levels when the candidate budget ends inside a hierarchy", () => {
    const resolution = resolveFixture(
      nodes,
      edges,
      {
        rules: [rule],
        limits: { ...spec.limits, maxCandidates: 1 }
      },
      bindings
    )
    expect(resolution.stoppedBecause).toBe("resource-limit")
    expect(resolution.pages[1].coverage).toEqual({
      status: "truncated",
      reason: "candidate-budget",
      examined: 1,
      total: 4
    })
    expect(
      resolution.groups
        .filter((g) => g.kind === "authored-group")
        .map((g) => g.label)
    ).toEqual(["Leaf"])
    expect(Object.keys(resolution.pages[1].nodeOwner).sort()).toEqual(nodes)
  })

  it("reuses a hierarchy on repeated rules without introducing cyclic child ownership", () => {
    const resolution = resolveFixture(
      nodes,
      edges,
      { rules: [rule, rule], pageRuleCounts: [2] },
      bindings
    )
    expect(resolution.pages).toHaveLength(2)
    expect(
      resolution.groups.filter((g) => g.kind === "authored-group")
    ).toHaveLength(4)
    expect(
      resolution.events.filter((e) => e.action === "grouped")
    ).toHaveLength(4)
    expect(resolution.events.at(-1)?.reason).toBe("already-contained")
  })
})
