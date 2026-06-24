import { describe, it, expect } from "vitest"
import { PipelineStore } from "./PipelineStore"
import type { AreaSceneNode } from "./types"

function buildStore(stackOrder: "key" | "input" | "insideOut" | "asc" | "desc" | undefined) {
  return new PipelineStore({
    chartType: "stackedarea",
    runtimeMode: "bounded",
    windowSize: 200,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    baseline: "wiggle",
    stackOrder,
    xAccessor: "t",
    yAccessor: "v",
    groupAccessor: "group",
  })
}

function ingestStreamgraphData(store: PipelineStore) {
  // 5 groups whose alphabetical order deliberately doesn't match their
  // total order. That way "key" (alpha), "asc", "desc", and "insideOut"
  // each produce a distinct stacking — a buggy branch that falls back
  // to alpha sort would no longer accidentally pass the desc/asc tests.
  //
  //   alpha order:  alpha < bravo < charlie < delta < echo
  //   total order:  charlie (12) > echo (9) > bravo (6) > delta (3) > alpha (1)
  const data: Record<string, unknown>[] = []
  const profiles = [
    { group: "alpha",   base: 1,  amp: 0.5 },  // smallest
    { group: "bravo",   base: 6,  amp: 1.5 },
    { group: "charlie", base: 12, amp: 2 },    // largest
    { group: "delta",   base: 3,  amp: 1 },
    { group: "echo",    base: 9,  amp: 2 },
  ]
  for (let i = 0; i < 20; i++) {
    for (const p of profiles) {
      data.push({ t: i, group: p.group, v: p.base + p.amp * Math.sin(i * 0.4) })
    }
  }
  store.ingest({ inserts: data, bounded: true })
  store.computeScene({ width: 600, height: 200 })
}

function getAreaGroupOrder(store: PipelineStore): string[] {
  return store.scene
    .filter((n): n is AreaSceneNode => n.type === "area")
    .map((n) => n.group ?? "")
}

describe("stackOrder", () => {
  // alpha order:  alpha < bravo < charlie < delta < echo
  // total desc:   charlie (12) > echo (9) > bravo (6) > delta (3) > alpha (1)
  // Each branch produces a distinct order, so a buggy fall-through to
  // "key" would visibly break the desc/asc/insideOut assertions.

  it("default 'key' sorts alphabetically", () => {
    const store = buildStore(undefined)
    ingestStreamgraphData(store)
    expect(getAreaGroupOrder(store)).toEqual(["alpha", "bravo", "charlie", "delta", "echo"])
  })

  it("'input' preserves first-seen group order", () => {
    const store = buildStore("input")
    const data: Record<string, unknown>[] = []
    const profiles = [
      { group: "charlie", base: 12 },
      { group: "alpha", base: 1 },
      { group: "echo", base: 9 },
      { group: "bravo", base: 6 },
      { group: "delta", base: 3 },
    ]
    for (let i = 0; i < 20; i++) {
      for (const p of profiles) data.push({ t: i, group: p.group, v: p.base })
    }
    store.ingest({ inserts: data, bounded: true })
    store.computeScene({ width: 600, height: 200 })
    expect(getAreaGroupOrder(store)).toEqual(["charlie", "alpha", "echo", "bravo", "delta"])
  })

  it("'insideOut' places the largest-total group in the middle", () => {
    const store = buildStore("insideOut")
    ingestStreamgraphData(store)
    const order = getAreaGroupOrder(store)
    expect(order).toHaveLength(5)
    // "charlie" (largest total) should sit at the middle (index 2).
    expect(order[2]).toBe("charlie")
    // "alpha" (smallest total) should land at one of the outer edges.
    expect([0, order.length - 1]).toContain(order.indexOf("alpha"))
  })

  it("'desc' sorts by total descending — distinct from alpha order", () => {
    const store = buildStore("desc")
    ingestStreamgraphData(store)
    // Order is by total, not alpha — charlie (largest) first, alpha (smallest) last.
    expect(getAreaGroupOrder(store)).toEqual(["charlie", "echo", "bravo", "delta", "alpha"])
  })

  it("'asc' sorts by total ascending — distinct from alpha order", () => {
    const store = buildStore("asc")
    ingestStreamgraphData(store)
    expect(getAreaGroupOrder(store)).toEqual(["alpha", "delta", "bravo", "echo", "charlie"])
  })

  it("ties on total break by lexicographic key (stable under streaming)", () => {
    // Regression: Array.sort is stable on insertion order, but sliding-
    // window eviction can shift insertion order between frames. Tied
    // totals would re-order and cause layer flicker. Both areaScene
    // and PipelineStore tie-break by key alpha — check that here.
    const store = buildStore("desc")
    // Two groups, identical totals (3 each), inserted in non-alpha order.
    store.ingest({
      inserts: [
        { t: 0, group: "zeta",  v: 1 }, { t: 1, group: "zeta",  v: 1 }, { t: 2, group: "zeta",  v: 1 },
        { t: 0, group: "alpha", v: 1 }, { t: 1, group: "alpha", v: 1 }, { t: 2, group: "alpha", v: 1 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 600, height: 200 })
    // Equal totals → alpha-first (lexicographic tie-break) regardless
    // of insertion order.
    expect(getAreaGroupOrder(store)).toEqual(["alpha", "zeta"])
  })

  it("yDomain stays centered around zero with insideOut + wiggle", () => {
    // Regression: pipeline-store extent computation must use the same
    // group order as the scene builder. Otherwise wiggle offsets differ
    // and yDomain doesn't match what's actually drawn.
    const store = buildStore("insideOut")
    ingestStreamgraphData(store)
    const yd = store.scales!.y.domain()
    expect(yd[0]).toBeLessThan(0)
    expect(yd[1]).toBeGreaterThan(0)
    expect(Math.abs(yd[1]) / Math.abs(yd[0])).toBeGreaterThan(0.7)
    expect(Math.abs(yd[1]) / Math.abs(yd[0])).toBeLessThan(1.3)
  })

  it("falls back to 'key' order for unrecognized stackOrder strings", () => {
    // Regression: areaScene used to enter the totals branch for any
    // string ≠ "key" without an explicit `else` for unknown values,
    // leaving insertion order. PipelineStore's extent path defaults
    // unknown to "key" via `?? "key"`, so the two could diverge for a
    // typoed/forwards-compat value.
    const store = buildStore("nonsense" as unknown as "key")
    ingestStreamgraphData(store)
    expect(getAreaGroupOrder(store)).toEqual(["alpha", "bravo", "charlie", "delta", "echo"])
  })

  it("totals filter for stack ordering matches the stacking pipeline", () => {
    // Regression: areaScene's per-group totals used to filter only on y
    // (Number.isFinite(v)) without checking x. Rows with valid y but
    // invalid x would inflate the order-sort total even though they're
    // skipped by the actual stacking pass. With insideOut/asc/desc that
    // could shuffle a group out of agreement with PipelineStore's
    // extent computation. Both paths now filter on isFinite(x) AND
    // isFinite(y), so order stays consistent.
    const store = new PipelineStore({
      chartType: "stackedarea",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0.1,
      baseline: "wiggle",
      stackOrder: "insideOut",
      xAccessor: "t",
      yAccessor: "v",
      groupAccessor: "group",
    })
    // Group "ghost" has rows with valid y but Infinity x — the stacking
    // pipeline skips these. If the order-sort total counted them, ghost
    // could shoulder its way into the middle slot.
    const data = [
      { t: 0, group: "small", v: 1 }, { t: 1, group: "small", v: 1 }, { t: 2, group: "small", v: 1 },
      { t: 0, group: "real",  v: 5 }, { t: 1, group: "real",  v: 5 }, { t: 2, group: "real",  v: 5 },
      // ghost: huge y values but invalid x — should NOT count toward order.
      { t: Infinity, group: "ghost", v: 100 },
      { t: Infinity, group: "ghost", v: 100 },
      { t: Infinity, group: "ghost", v: 100 },
    ]
    store.ingest({ inserts: data, bounded: true })
    store.computeScene({ width: 400, height: 200 })

    const order = store.scene
      .filter((n): n is import("./types").AreaSceneNode => n.type === "area")
      .map((n) => n.group ?? "")
    // Correctly filtered totals: real=15, small=3, ghost=0.
    // insideOut sort by total desc → [real, small, ghost], then bottom/
    // top alternation puts the largest at the bottom of the stack:
    //   [real, small, ghost]
    // BUGGY filter (only checking y, not x): ghost's 300 counts.
    // Sorted desc → [ghost, real, small]. Bottom-up → [ghost, real, small].
    // The top vs bottom of the stack tells us which filter was applied.
    expect(order[0]).toBe("real")
    // Final stack position must match what PipelineStore's extent code
    // assumed too — verify the yDomain is finite (would be 300+ for the
    // buggy version).
    const yd = store.scales!.y.domain()
    expect(yd[1]).toBeLessThan(50)
  })

  it("filters non-finite values (Infinity, -Infinity) from extent + scene", () => {
    // Regression: previous extent code used `Number.isNaN` which only
    // catches NaN, letting ±Infinity slip through and produce ±Infinity
    // yDomain (zero baseline) or fall back to [0,0] (wiggle/silhouette).
    // Scene builder had the same hole. Both paths now use
    // `Number.isFinite` consistently.
    const store = new PipelineStore({
      chartType: "stackedarea",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0.1,
      baseline: "zero",
      xAccessor: "t",
      yAccessor: "v",
      groupAccessor: "group",
    })
    const data = [
      { t: 0, group: "a", v: 5 },
      { t: 1, group: "a", v: 10 },
      { t: 2, group: "a", v: Infinity }, // should be filtered
      { t: 3, group: "a", v: 8 },
      { t: 0, group: "b", v: 3 },
      { t: 1, group: "b", v: -Infinity }, // should be filtered
      { t: 2, group: "b", v: 4 },
      { t: 3, group: "b", v: 6 },
    ]
    store.ingest({ inserts: data, bounded: true })
    store.computeScene({ width: 400, height: 200 })

    const yd = store.scales!.y.domain()
    expect(Number.isFinite(yd[0])).toBe(true)
    expect(Number.isFinite(yd[1])).toBe(true)
    // Max stacked total: t=3 has a=8 + b=6 = 14. With extentPadding=0.1
    // pad is ~1.4, so domain top ≈ 15.4 — far from Infinity, far from 0.
    expect(yd[1]).toBeGreaterThan(10)
    expect(yd[1]).toBeLessThan(25)
  })
})
