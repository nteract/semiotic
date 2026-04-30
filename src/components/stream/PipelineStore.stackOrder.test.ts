import { describe, it, expect } from "vitest"
import { PipelineStore } from "./PipelineStore"
import type { AreaSceneNode } from "./types"

function buildStore(stackOrder: "key" | "insideOut" | "asc" | "desc" | undefined) {
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
  // 5 groups with deliberately asymmetric totals so insideOut produces a
  // meaningful re-ordering. Group "huge" should land in the middle when
  // insideOut is set; "tiny" should be at one of the outer edges.
  const data: Record<string, unknown>[] = []
  const profiles = [
    { group: "tiny",   base: 1,  amp: 0.5 },
    { group: "small",  base: 3,  amp: 1 },
    { group: "huge",   base: 12, amp: 2 },
    { group: "medium", base: 6,  amp: 1.5 },
    { group: "large",  base: 9,  amp: 2 },
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
  it("default 'key' sorts alphabetically", () => {
    const store = buildStore(undefined)
    ingestStreamgraphData(store)
    expect(getAreaGroupOrder(store)).toEqual(["huge", "large", "medium", "small", "tiny"])
  })

  it("'insideOut' places the largest-total group in the middle", () => {
    const store = buildStore("insideOut")
    ingestStreamgraphData(store)
    const order = getAreaGroupOrder(store)
    // 5 groups → "huge" should sit at index 2 (the middle).
    expect(order).toHaveLength(5)
    expect(order[2]).toBe("huge")
    // "tiny" (smallest total) should land at one of the outer edges.
    expect([0, order.length - 1]).toContain(order.indexOf("tiny"))
  })

  it("'desc' sorts largest-first (largest at the bottom of the stack)", () => {
    const store = buildStore("desc")
    ingestStreamgraphData(store)
    expect(getAreaGroupOrder(store)).toEqual(["huge", "large", "medium", "small", "tiny"])
  })

  it("'asc' sorts smallest-first", () => {
    const store = buildStore("asc")
    ingestStreamgraphData(store)
    expect(getAreaGroupOrder(store)).toEqual(["tiny", "small", "medium", "large", "huge"])
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
})
