import { describe, expect, it } from "vitest"
import { extractNetworkNavPoints, nextNetworkIndex } from "./networkKeyboardNav"
import { buildNavGraph, resolvePosition } from "./navigationGraph"
import { buildNetworkTableModel } from "./networkAccessibleDataTableModel"
import type { NetworkSceneNode } from "./networkSceneTypes"

const scene: NetworkSceneNode[] = [0, 1, 2].flatMap((i) => [
  {
    type: "rect",
    id: `owner-${i}`,
    x: i * 200,
    y: 0,
    w: 100,
    h: 100,
    datum: { id: `owner-${i}`, label: `Owner ${i}` },
    style: {}
  },
  ...[0, 1].map((row) => ({
    type: "rect" as const,
    id: `owner-${i}-row-${row}`,
    navParentId: `owner-${i}`,
    x: i * 200,
    y: 40 + row * 20,
    w: 100,
    h: 20,
    datum: { id: `row-${row}`, label: `Row ${row}` },
    style: {}
  }))
])

describe("authored network navigation groups", () => {
  it("walks owners, descends to rows and ascends without conflating repeated row IDs", () => {
    const graph = buildNavGraph(extractNetworkNavPoints(scene))
    let index = graph.idToIdx.get("owner-0")!
    const step = (key: string) => {
      index = nextNetworkIndex(key, resolvePosition(graph, index), graph, [], {
        current: -1
      })!
      return graph.flat[index]?.navId
    }
    expect(step("ArrowRight")).toBe("owner-1")
    expect(step("ArrowRight")).toBe("owner-2")
    expect(step("Enter")).toBe("owner-2-row-0")
    expect(step("ArrowDown")).toBe("owner-2-row-1")
    expect(step("Home")).toBe("owner-2-row-0")
    expect(step("End")).toBe("owner-2-row-1")
    expect(step("Escape")).toBe("owner-2")
    expect(step("Escape")).toBeUndefined()
    expect(index).toBe(-1)
  })
  it("includes the authored group in accessible table rows", () => {
    const model = buildNetworkTableModel(scene, [])
    const children = model.nodeRows.filter(
      (r) => r.semantic.values.group != null
    )
    expect(children).toHaveLength(6)
    expect(children.map((r) => r.semantic.values.group)).toEqual([
      "owner-0",
      "owner-0",
      "owner-1",
      "owner-1",
      "owner-2",
      "owner-2"
    ])
  })
  it.each(["datum", "accessibleDatum", "tableFields"] as const)(
    "preserves an authored group from %s in accessible node and edge rows",
    (source) => {
      const fields = { group: "Finance", value: 7 }
      const metadata =
        source === "tableFields"
          ? { accessibility: { tableFields: fields } }
          : { [source]: fields }
      const model = buildNetworkTableModel(
        [{ ...scene[1], ...metadata }],
        [
          {
            type: "line",
            datum: { source: "a", target: "b" },
            navParentId: "owner-0",
            ...metadata
          }
        ]
      )
      expect(model.nodeRows[0].semantic.values.group).toBe("Finance")
      expect(model.edgeRows[0].values.group).toBe("Finance")
    }
  )
  it("keeps orphan and cyclic nodes reachable", () => {
    const graph = buildNavGraph(
      extractNetworkNavPoints(
        scene.slice(0, 3).map((n, i) => ({
          ...n,
          navParentId:
            i === 0 ? "missing" : i === 1 ? "owner-0-row-1" : "owner-0-row-0"
        }))
      )
    )
    const ids = new Set([
      nextNetworkIndex("Home", resolvePosition(graph, 0), graph, [], {
        current: -1
      }),
      nextNetworkIndex("End", resolvePosition(graph, 0), graph, [], {
        current: -1
      })
    ])
    expect(ids.size).toBe(2)
  })
})
