import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import { PipelineStore } from "./PipelineStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { NetworkPipelineStore } from "./NetworkPipelineStore"

// ═══════════════════════════════════════════════════════════════════════
// PipelineStore.remove
// ═══════════════════════════════════════════════════════════════════════

describe("PipelineStore.remove", () => {
  it("removes points by ID using pointIdAccessor", () => {
    const store = new PipelineStore({
      chartType: "scatter",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      pointIdAccessor: "id",
    })

    store.ingest({
      inserts: [
        { id: "a", x: 1, y: 10 },
        { id: "b", x: 2, y: 20 },
        { id: "c", x: 3, y: 30 },
      ],
      bounded: true,
    })

    const removed = store.remove("b")
    expect(removed).toHaveLength(1)
    expect(removed[0].id).toBe("b")
    expect(store.getData()).toHaveLength(2)
    expect(store.getData().map(d => d.id)).toEqual(["a", "c"])
  })

  it("removes multiple IDs at once", () => {
    const store = new PipelineStore({
      chartType: "scatter",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      pointIdAccessor: "id",
    })

    store.ingest({
      inserts: [
        { id: "a", x: 1, y: 10 },
        { id: "b", x: 2, y: 20 },
        { id: "c", x: 3, y: 30 },
      ],
      bounded: true,
    })

    const removed = store.remove(["a", "c"])
    expect(removed).toHaveLength(2)
    expect(store.getData()).toHaveLength(1)
    expect(store.getData()[0].id).toBe("b")
  })

  it("removes all and returns to empty state", () => {
    const store = new PipelineStore({
      chartType: "scatter", windowSize: 100, windowMode: "sliding",
      arrowOfTime: "right", extentPadding: 0,
      xAccessor: "x", yAccessor: "y", pointIdAccessor: "id",
    })
    store.ingest({ inserts: [{ id: "a", x: 1, y: 10 }, { id: "b", x: 2, y: 20 }], bounded: true })

    store.remove(["a", "b"])
    expect(store.getData()).toHaveLength(0)
    // Should not crash on computeScene with empty buffer
    store.computeScene({ width: 200, height: 100 })
    expect(store.scene.length).toBe(0)
  })

  it("remove is idempotent — second call returns empty", () => {
    const store = new PipelineStore({
      chartType: "scatter", windowSize: 100, windowMode: "sliding",
      arrowOfTime: "right", extentPadding: 0,
      xAccessor: "x", yAccessor: "y", pointIdAccessor: "id",
    })
    store.ingest({ inserts: [{ id: "a", x: 1, y: 10 }], bounded: true })

    expect(store.remove("a")).toHaveLength(1)
    expect(store.remove("a")).toHaveLength(0) // already gone
  })

  it("extents update after removing boundary values", () => {
    const store = new PipelineStore({
      chartType: "scatter", windowSize: 100, windowMode: "sliding",
      arrowOfTime: "right", extentPadding: 0,
      xAccessor: "x", yAccessor: "y", pointIdAccessor: "id",
    })
    store.ingest({
      inserts: [
        { id: "a", x: 1, y: 10 },
        { id: "b", x: 5, y: 50 },
        { id: "c", x: 3, y: 30 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 200, height: 100 })
    const extBefore = store.getExtents()
    expect(extBefore?.x[1]).toBe(5) // max is b

    store.remove("b") // remove the max
    store.computeScene({ width: 200, height: 100 })
    const extAfter = store.getExtents()
    expect(extAfter?.x[1]).toBe(3) // new max is c
  })

  it("throws when pointIdAccessor is not configured", () => {
    const store = new PipelineStore({
      chartType: "scatter",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
    })

    store.ingest({ inserts: [{ x: 1, y: 10 }], bounded: true })
    expect(() => store.remove("a")).toThrow("pointIdAccessor")
  })

  it("scene rebuilds correctly after remove", () => {
    const store = new PipelineStore({
      chartType: "scatter",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      pointIdAccessor: "id",
    })

    store.ingest({
      inserts: [
        { id: "a", x: 1, y: 10 },
        { id: "b", x: 2, y: 20 },
        { id: "c", x: 3, y: 30 },
      ],
      bounded: true,
    })

    store.computeScene({ width: 200, height: 100 })
    expect(store.scene.length).toBe(3)

    store.remove("b")
    store.computeScene({ width: 200, height: 100 })
    expect(store.scene.length).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// PipelineStore.update
// ═══════════════════════════════════════════════════════════════════════

describe("PipelineStore.update", () => {
  it("updates a point's value by ID", () => {
    const store = new PipelineStore({
      chartType: "scatter",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      pointIdAccessor: "id",
    })

    store.ingest({
      inserts: [
        { id: "a", x: 1, y: 10 },
        { id: "b", x: 2, y: 20 },
      ],
      bounded: true,
    })

    const previous = store.update("b", d => ({ ...d, y: 99 }))
    expect(previous).toHaveLength(1)
    expect(previous[0].y).toBe(20) // old value

    const data = store.getData()
    expect(data.find(d => d.id === "b")?.y).toBe(99) // new value
    expect(data).toHaveLength(2) // size unchanged
  })

  it("scene rebuilds with updated values", () => {
    const store = new PipelineStore({
      chartType: "scatter",
      windowSize: 100,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      pointIdAccessor: "id",
    })

    store.ingest({
      inserts: [{ id: "a", x: 1, y: 10 }, { id: "b", x: 2, y: 20 }],
      bounded: true,
    })

    store.computeScene({ width: 200, height: 100 })
    store.update("a", d => ({ ...d, y: 50 }))
    store.computeScene({ width: 200, height: 100 })

    // Scene should still have 2 points
    expect(store.scene.length).toBe(2)
  })

  it("extents update after update changes boundary value", () => {
    const store = new PipelineStore({
      chartType: "scatter", windowSize: 100, windowMode: "sliding",
      arrowOfTime: "right", extentPadding: 0,
      xAccessor: "x", yAccessor: "y", pointIdAccessor: "id",
    })
    store.ingest({
      inserts: [{ id: "a", x: 1, y: 10 }, { id: "b", x: 5, y: 50 }],
      bounded: true,
    })
    store.computeScene({ width: 200, height: 100 })
    expect(store.getExtents()?.y[1]).toBe(50)

    store.update("b", d => ({ ...d, y: 30 }))
    store.computeScene({ width: 200, height: 100 })
    expect(store.getExtents()?.y[1]).toBe(30)
  })

  it("update only modifies matched items, others untouched", () => {
    const store = new PipelineStore({
      chartType: "scatter", windowSize: 100, windowMode: "sliding",
      arrowOfTime: "right", extentPadding: 0,
      xAccessor: "x", yAccessor: "y", pointIdAccessor: "id",
    })
    store.ingest({
      inserts: [{ id: "a", x: 1, y: 10 }, { id: "b", x: 2, y: 20 }],
      bounded: true,
    })
    store.update("a", d => ({ ...d, y: 99 }))

    const data = store.getData()
    expect(data.find(d => d.id === "a")?.y).toBe(99)
    expect(data.find(d => d.id === "b")?.y).toBe(20) // untouched
  })

  it("throws without pointIdAccessor", () => {
    const store = new PipelineStore({
      chartType: "scatter", windowSize: 100, windowMode: "sliding",
      arrowOfTime: "right", extentPadding: 0,
      xAccessor: "x", yAccessor: "y",
    })
    store.ingest({ inserts: [{ x: 1, y: 10 }], bounded: true })
    expect(() => store.update("a", d => d)).toThrow("pointIdAccessor")
  })
})

// ═══════════════════════════════════════════════════════════════════════
// OrdinalPipelineStore.update
// ═══════════════════════════════════════════════════════════════════════

describe("OrdinalPipelineStore.update", () => {
  it("updates item value by ID", () => {
    const store = new OrdinalPipelineStore({
      chartType: "bar", windowSize: 100, windowMode: "sliding",
      extentPadding: 0, projection: "vertical",
      oAccessor: "category", rAccessor: "value", dataIdAccessor: "id",
    })
    store.ingest({ inserts: [{ id: "1", category: "A", value: 10 }, { id: "2", category: "B", value: 20 }], bounded: true })

    const prev = store.update("1", d => ({ ...d, value: 99 }))
    expect(prev).toHaveLength(1)
    expect(prev[0].value).toBe(10)
    expect(store.getData().find(d => d.id === "1")?.value).toBe(99)
  })

  it("updates category — categories rebuilt", () => {
    const store = new OrdinalPipelineStore({
      chartType: "bar", windowSize: 100, windowMode: "sliding",
      extentPadding: 0, projection: "vertical",
      oAccessor: "category", rAccessor: "value", dataIdAccessor: "id",
    })
    store.ingest({ inserts: [{ id: "1", category: "A", value: 10 }, { id: "2", category: "B", value: 20 }], bounded: true })

    store.update("2", d => ({ ...d, category: "C" }))
    store.computeScene({ width: 200, height: 100 })
    // Category B should be gone, C should be present
    const data = store.getData()
    expect(data.find(d => d.id === "2")?.category).toBe("C")
  })

  it("throws without dataIdAccessor", () => {
    const store = new OrdinalPipelineStore({
      chartType: "bar", windowSize: 100, windowMode: "sliding",
      extentPadding: 0, projection: "vertical",
      oAccessor: "category", rAccessor: "value",
    })
    store.ingest({ inserts: [{ category: "A", value: 10 }], bounded: true })
    expect(() => store.update("1", d => d)).toThrow("dataIdAccessor")
  })
})

// ═══════════════════════════════════════════════════════════════════════
// OrdinalPipelineStore.remove
// ═══════════════════════════════════════════════════════════════════════

describe("OrdinalPipelineStore.remove", () => {
  it("removes items by dataIdAccessor", () => {
    const store = new OrdinalPipelineStore({
      chartType: "bar",
      windowSize: 100,
      windowMode: "sliding",
      extentPadding: 0,
      projection: "vertical",
      oAccessor: "category",
      rAccessor: "value",
      dataIdAccessor: "id",
    })

    store.ingest({
      inserts: [
        { id: "1", category: "A", value: 10 },
        { id: "2", category: "B", value: 20 },
        { id: "3", category: "C", value: 30 },
      ],
      bounded: true,
    })

    const removed = store.remove("2")
    expect(removed).toHaveLength(1)
    expect(removed[0].id).toBe("2")
    expect(store.getData()).toHaveLength(2)
  })

  it("rebuilds categories after removal", () => {
    const store = new OrdinalPipelineStore({
      chartType: "bar",
      windowSize: 100,
      windowMode: "sliding",
      extentPadding: 0,
      projection: "vertical",
      oAccessor: "category",
      rAccessor: "value",
      dataIdAccessor: "id",
    })

    store.ingest({
      inserts: [
        { id: "1", category: "A", value: 10 },
        { id: "2", category: "B", value: 20 },
      ],
      bounded: true,
    })

    store.remove("2")
    // Category "B" should be gone from the store's category tracking
    store.computeScene({ width: 200, height: 100 })
    expect(store.scene.length).toBe(1) // only category A
  })

  it("throws without dataIdAccessor", () => {
    const store = new OrdinalPipelineStore({
      chartType: "bar",
      windowSize: 100,
      windowMode: "sliding",
      extentPadding: 0,
      projection: "vertical",
      oAccessor: "category",
      rAccessor: "value",
    })

    store.ingest({ inserts: [{ category: "A", value: 10 }], bounded: true })
    expect(() => store.remove("1")).toThrow("dataIdAccessor")
  })
})

// ═══════════════════════════════════════════════════════════════════════
// NetworkPipelineStore.removeNode / removeEdge
// ═══════════════════════════════════════════════════════════════════════

describe("NetworkPipelineStore.removeNode", () => {
  it("removes a node and its connected edges", () => {
    const store = new NetworkPipelineStore({
      chartType: "force",
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
    })

    store.ingestBounded(
      [{ id: "A" }, { id: "B" }, { id: "C" }],
      [{ source: "A", target: "B" }, { source: "B", target: "C" }],
      [300, 200]
    )

    expect(store.nodes.size).toBe(3)
    expect(store.edges.size).toBe(2)

    const removed = store.removeNode("B")
    expect(removed).toBe(true)
    expect(store.nodes.size).toBe(2)
    expect(store.nodes.has("B")).toBe(false)
    // Both edges connected to B should be gone
    expect(store.edges.size).toBe(0)
  })

  it("returns false for non-existent node", () => {
    const store = new NetworkPipelineStore({
      chartType: "force",
      nodeIDAccessor: "id",
    })
    store.ingestBounded([{ id: "A" }], [], [200, 200])
    expect(store.removeNode("Z")).toBe(false)
  })
})

describe("NetworkPipelineStore.updateNode", () => {
  it("updates a node's data", () => {
    const store = new NetworkPipelineStore({
      chartType: "force",
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
    })
    store.ingestBounded([{ id: "A", label: "old" }], [], [200, 200])

    const previous = store.updateNode("A", d => ({ ...d, label: "new" }))
    expect(previous?.label).toBe("old")
    expect(store.nodes.get("A")?.data?.label).toBe("new")
  })

  it("returns null for non-existent node", () => {
    const store = new NetworkPipelineStore({ chartType: "force", nodeIDAccessor: "id" })
    store.ingestBounded([{ id: "A" }], [], [200, 200])
    expect(store.updateNode("Z", d => d)).toBeNull()
  })
})

describe("NetworkPipelineStore.updateEdge", () => {
  it("updates an edge's data and value", () => {
    const store = new NetworkPipelineStore({
      chartType: "sankey",
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "value",
    })
    store.ingestBounded(
      [{ id: "A" }, { id: "B" }],
      [{ source: "A", target: "B", value: 100 }],
      [200, 200]
    )

    const previous = store.updateEdge("A", "B", d => ({ ...d, value: 200 }))
    expect(previous).not.toBeNull()
    // Edge value should be updated
    for (const [, edge] of store.edges) {
      expect(edge.value).toBe(200)
    }
  })
})

describe("NetworkPipelineStore.removeEdge", () => {
  it("removes an edge by source and target", () => {
    const store = new NetworkPipelineStore({
      chartType: "force",
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
    })

    store.ingestBounded(
      [{ id: "A" }, { id: "B" }, { id: "C" }],
      [{ source: "A", target: "B" }, { source: "B", target: "C" }],
      [300, 200]
    )

    const removed = store.removeEdge("A", "B")
    expect(removed).toBe(true)
    expect(store.edges.size).toBe(1)
    // Nodes remain
    expect(store.nodes.size).toBe(3)
  })

  it("returns false for non-existent edge", () => {
    const store = new NetworkPipelineStore({
      chartType: "force",
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
    })
    store.ingestBounded([{ id: "A" }, { id: "B" }], [{ source: "A", target: "B" }], [200, 200])
    expect(store.removeEdge("A", "C")).toBe(false)
  })
})
