import { describe, it, expect } from "vitest"
import { PipelineStore } from "./PipelineStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { GeoPipelineStore } from "./GeoPipelineStore"
import type { Datum } from "../charts/shared/datumTypes"

/**
 * Cross-family invariant harness.
 *
 * The four pipeline stores (XY / ordinal / network / geo) are independent,
 * hand-written siblings. Historically a guard added to one family's `clear()`
 * or version handling did not propagate to the others, and because each store
 * was only ever tested in isolation, two latent correctness bugs shipped:
 *
 *   - `NetworkPipelineStore.clear()` left topology-diff state stale, so a
 *     clear()+reload diffed the new graph against the pre-clear node/edge set
 *     and mis-classified every reappearing node.
 *   - `OrdinalPipelineStore.clear()` left the categorical color cache
 *     populated, so a clear()+reload drifted category colors vs. a fresh mount.
 *
 * Both were invisible in per-family tests because the *sibling* stores happened
 * to handle `clear()` correctly. This file asserts the SHARED contract across
 * all four families, so a future divergence in any one of them fails here
 * rather than shipping as a silent bug.
 *
 * (XY's own color-cache reset is additionally covered by
 * PipelineStore.cache.test.ts — "clear resets group color map".)
 */

interface FamilyHarness {
  name: string
  /** Construct a store and expose a uniform set of operations over it. */
  make: () => {
    /** The family's monotonic rebuild counter (`version` / `layoutVersion`). */
    version: () => number
    /** Ingest dataset "A" or "B" and (re)build the scene, like a real frame. */
    ingest: (set: "A" | "B") => void
    clear: () => void
  }
}

const XY_LAYOUT = { width: 400, height: 300 }
const ORDINAL_LAYOUT = { width: 400, height: 300 }
const GEO_LAYOUT = { width: 600, height: 400 }
const NETWORK_SIZE: [number, number] = [600, 400]

const families: FamilyHarness[] = [
  {
    name: "xy",
    make() {
      const store = new PipelineStore({
        xAccessor: "x",
        yAccessor: "y",
        chartType: "scatter",
        windowSize: 100,
        windowMode: "sliding" as const,
        arrowOfTime: "right",
        extentPadding: 0,
      })
      const sets: Record<"A" | "B", Datum[]> = {
        A: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
        B: [{ x: 3, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 5 }],
      }
      return {
        version: () => store.version,
        ingest: (set) => {
          store.ingest({ inserts: sets[set], bounded: true })
          store.computeScene(XY_LAYOUT)
        },
        clear: () => store.clear(),
      }
    },
  },
  {
    name: "ordinal",
    make() {
      const store = new OrdinalPipelineStore({
        chartType: "bar",
        windowSize: 1000,
        windowMode: "sliding",
        extentPadding: 0.05,
        projection: "vertical",
        oAccessor: "category",
        rAccessor: "value",
      })
      const sets: Record<"A" | "B", Datum[]> = {
        A: [{ category: "A", value: 10 }, { category: "B", value: 20 }],
        B: [{ category: "P", value: 1 }, { category: "Q", value: 2 }, { category: "R", value: 3 }],
      }
      return {
        version: () => store.version,
        ingest: (set) => {
          store.ingest({ inserts: sets[set], bounded: true })
          store.computeScene(ORDINAL_LAYOUT)
        },
        clear: () => store.clear(),
      }
    },
  },
  {
    name: "network",
    make() {
      const store = new NetworkPipelineStore({
        chartType: "sankey",
        orientation: "horizontal",
        nodeIDAccessor: "id",
        sourceAccessor: "source",
        targetAccessor: "target",
        valueAccessor: "value",
      })
      const sets: Record<"A" | "B", { nodes: Datum[]; edges: Datum[] }> = {
        A: { nodes: [{ id: "A" }, { id: "B" }], edges: [{ source: "A", target: "B", value: 10 }] },
        B: { nodes: [{ id: "X" }, { id: "Y" }, { id: "Z" }], edges: [{ source: "X", target: "Y", value: 5 }, { source: "Y", target: "Z", value: 3 }] },
      }
      return {
        version: () => store.layoutVersion,
        ingest: (set) => {
          store.ingestBounded(sets[set].nodes, sets[set].edges, NETWORK_SIZE)
          store.buildScene(NETWORK_SIZE)
        },
        clear: () => store.clear(),
      }
    },
  },
  {
    name: "geo",
    make() {
      const store = new GeoPipelineStore({ projection: "mercator", xAccessor: "lon", yAccessor: "lat" })
      const sets: Record<"A" | "B", Datum[]> = {
        A: [{ id: "sf", lon: -122.4, lat: 37.8 }, { id: "ny", lon: -74, lat: 40.7 }],
        B: [{ id: "la", lon: -118.2, lat: 34.1 }, { id: "ch", lon: -87.6, lat: 41.9 }, { id: "mi", lon: -80.2, lat: 25.8 }],
      }
      return {
        version: () => store.version,
        ingest: (set) => {
          store.setPoints(sets[set])
          store.computeScene(GEO_LAYOUT)
        },
        clear: () => store.clear(),
      }
    },
  },
]

// ── Universal invariant: version monotonicity ──────────────────────────────
// Every store exposes a rebuild counter consumed as a cache key / render
// trigger. It must be monotonic and must NOT reset on clear() — a reset can
// collide with a consumer's last-seen value and skip a render (the bug A4
// fixed in NetworkPipelineStore, which used to set layoutVersion = 0).
describe.each(families)("$name store: version counter", ({ make }) => {
  it("advances on ingest and clear(), and never resets to a prior value", () => {
    const h = make()
    const v0 = h.version()
    h.ingest("A")
    const v1 = h.version()
    h.ingest("B")
    const v2 = h.version()
    h.clear()
    const v3 = h.version()
    h.ingest("A")
    const v4 = h.version()

    expect(v1).toBeGreaterThanOrEqual(v0)
    expect(v2).toBeGreaterThanOrEqual(v1)
    // clear() advances the counter rather than resetting it.
    expect(v3).toBeGreaterThan(v2)
    expect(v4).toBeGreaterThanOrEqual(v3)
  })
})

// ── Derived-state reset: a clear()+reload must behave like a fresh store ─────

describe("clear() fully resets derived state (clear+reload === fresh)", () => {
  it("ordinal: a reloaded dataset gets the same category colors as a fresh store", () => {
    const cfg = {
      chartType: "bar" as const,
      windowSize: 1000,
      windowMode: "sliding" as const,
      extentPadding: 0.05,
      projection: "vertical" as const,
      oAccessor: "category",
      rAccessor: "value",
    }
    const layout = { width: 400, height: 300 }
    const setA: Datum[] = [{ category: "A", value: 10 }, { category: "B", value: 20 }]
    const setB: Datum[] = [{ category: "P", value: 1 }, { category: "Q", value: 2 }, { category: "R", value: 3 }]

    const fills = (store: OrdinalPipelineStore): (string | null)[] =>
      (store.scene as Array<{ style?: { fill?: string } }>).map((n) => n.style?.fill ?? null)

    // Fresh store rendering dataset B.
    const fresh = new OrdinalPipelineStore(cfg)
    fresh.ingest({ inserts: setB, bounded: true })
    fresh.computeScene(layout)
    const freshFills = fills(fresh)

    // Reused store: render A, clear, then render the same dataset B.
    const reused = new OrdinalPipelineStore(cfg)
    reused.ingest({ inserts: setA, bounded: true })
    reused.computeScene(layout)
    reused.clear()
    reused.ingest({ inserts: setB, bounded: true })
    reused.computeScene(layout)

    // Before the A2 fix the palette index kept climbing across clear(), so the
    // reloaded categories drifted to later palette colors than a fresh mount.
    expect(fills(reused)).toEqual(freshFills)
  })

  it("network: a reloaded graph classifies topology exactly like a fresh store", () => {
    const cfg = {
      chartType: "sankey" as const,
      orientation: "horizontal" as const,
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "value",
    }
    // Overlapping graphs so BOTH added and removed sets are discriminating:
    // node "A" is shared between the two graphs.
    const graphA = { nodes: [{ id: "A" }, { id: "B" }], edges: [{ source: "A", target: "B", value: 10 }] }
    const graphB = { nodes: [{ id: "A" }, { id: "C" }], edges: [{ source: "A", target: "C", value: 5 }] }

    // Fresh store ingesting graph B: every node is "added" vs an empty previous
    // graph, and nothing is "removed".
    const fresh = new NetworkPipelineStore(cfg)
    fresh.ingestBounded(graphB.nodes, graphB.edges, NETWORK_SIZE)
    const freshAdded = [...fresh.addedNodes].sort()
    const freshRemoved = [...fresh.removedNodes].sort()

    // Reused store: ingest A, clear, ingest B. After clear() the "previous"
    // graph must be empty, so the diff matches the fresh store exactly.
    const reused = new NetworkPipelineStore(cfg)
    reused.ingestBounded(graphA.nodes, graphA.edges, NETWORK_SIZE)
    reused.clear()
    reused.ingestBounded(graphB.nodes, graphB.edges, NETWORK_SIZE)

    // Before the A1 fix, clear() left previousNodeIds = {A, B}, so reloading
    // {A, C} reported added = {C} (A looked unchanged) and removed = {B}.
    expect([...reused.addedNodes].sort()).toEqual(freshAdded)
    expect([...reused.removedNodes].sort()).toEqual(freshRemoved)
    expect(reused.removedNodes.size).toBe(0)
  })
})
