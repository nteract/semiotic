import { describe, expect, it } from "vitest"
import type { ProcessSankeyBandSpec } from "./streamingLayout"
import { applyProcessSankeyLabelDensity } from "./labelPlacement"
import { emitProcessSankeyScenes } from "./streamingLayout"

function band(id: string, label: string, labelY = 50): ProcessSankeyBandSpec {
  return {
    id,
    pathD: "M0,0Z",
    fill: "#000",
    rawDatum: { id, label, priority: id === "keep-me" ? 100 : 1 },
    labelX: 10,
    labelY,
    labelText: label,
  }
}

describe("applyProcessSankeyLabelDensity (M5)", () => {
  it("prefers explicit labelPriorityAccessor scores under auto", () => {
    const bands = [
      band("keep-me", "Important state", 10),
      band("a", "aaaaaaaaaaaaaaaa", 20),
      band("b", "bbbbbbbbbbbbbbbb", 30),
      band("c", "cccccccccccccccc", 40),
      band("d", "dddddddddddddddd", 50),
      band("e", "eeeeeeeeeeeeeeee", 60),
      band("f", "ffffffffffffffff", 70),
      band("g", "gggggggggggggggg", 80),
    ]
    // Tiny plot → budget floor of 4; priority should force keep-me into the set.
    const result = applyProcessSankeyLabelDensity(bands, 120, 120, "auto", {
      priorityById: new Map([["keep-me", 99], ["a", 1], ["b", 1], ["c", 1], ["d", 1], ["e", 1], ["f", 1], ["g", 1]]),
      maxLabels: 4,
    })
    const visible = result.filter((b) => b.labelText.trim().length > 0).map((b) => b.id)
    expect(visible).toContain("keep-me")
    expect(visible).toHaveLength(4)
    const deferred = result.find((b) => b.id === "g")!
    expect(deferred.labelDeferred).toBe(true)
    expect(deferred.labelFullText).toBe("gggggggggggggggg")
    expect(deferred.labelText).toBe("")
  })

  it("does not reflow geometry when priority changes — only visibility", () => {
    const bands = [band("a", "A", 10), band("b", "B", 40)]
    const low = applyProcessSankeyLabelDensity(bands, 80, 80, "auto", {
      priorityById: new Map([["a", 1], ["b", 2]]),
      maxLabels: 1,
    })
    const high = applyProcessSankeyLabelDensity(bands, 80, 80, "auto", {
      priorityById: new Map([["a", 9], ["b", 1]]),
      maxLabels: 1,
    })
    expect(low.map((b) => b.labelY)).toEqual(high.map((b) => b.labelY))
    expect(low.map((b) => b.labelX)).toEqual(high.map((b) => b.labelX))
    expect(low.find((b) => b.id === "b")!.labelText).toBe("B")
    expect(high.find((b) => b.id === "a")!.labelText).toBe("A")
  })

  it("reveals a deferred label under selection without changing band geometry", () => {
    const bands = applyProcessSankeyLabelDensity(
      [band("vis", "Visible", 10), band("hid", "Hidden long name", 20)],
      80, 80, "auto",
      { priorityById: new Map([["vis", 10], ["hid", 1]]), maxLabels: 1 },
    )
    const hid = bands.find((b) => b.id === "hid")!
    expect(hid.labelDeferred).toBe(true)

    const scenes = emitProcessSankeyScenes({
      nodes: [],
      edges: [],
      dimensions: { plot: { x: 0, y: 0, width: 200, height: 200 } },
      theme: {} as never,
      resolveColor: (k) => String(k),
      config: {
        bands,
        ribbons: [],
        showLabels: true,
        selectionDatum: "raw",
      },
      selection: {
        isActive: true,
        predicate: (d) => (d as { id?: string }).id === "hid",
      },
    } as never)

    const labels = scenes.labels ?? []
    expect(labels.some((l) => l.text === "Hidden long name")).toBe(true)
    expect(labels.some((l) => l.text === "Visible")).toBe(true)
  })
})
