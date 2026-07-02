import { describe, it, expect } from "vitest"
import { runs, runLengthEncode } from "./runs"
import { wrapValue, shortestArcDelta, cyclicRangeContains, selectCyclicRange } from "./cyclical"
import { packIntervals, activeCountOverDomain } from "./intervals"
import { polarToXY, xyToAngle, angleScale, radiusScale, ringArcPath, TAU } from "./radialCoords"
import {
  curvedEdgePath,
  orthogonalEdgePath,
  boxEdgeAnchors,
  fanOutBend,
  cubicPoint,
  cubicTangent,
  cubicPath,
} from "./edgeRouter"
import {
  addPoints,
  subtractPoints,
  scalePoint,
  pointMagnitude,
  normalizePoint,
} from "./vector"
import { rectCollide, axisFixedForcePositions } from "./axisFixedForce"
import { unwrapDatum, clamp, mean, withAlpha } from "./recipeUtils"
import { allocateCells } from "./waffle"
import { hitTargetPoint, hitTargetRect, networkHitTarget } from "../stream/hitTarget"
import { linearAxis, hatchFill } from "./recipeChrome"
import { legendSwatches } from "./recipeLegend"

describe("runs / runLengthEncode", () => {
  it("collapses adjacent equal values into index-based half-open runs", () => {
    const r = runs([{ v: "a" }, { v: "a" }, { v: "b" }, { v: "a" }], (d) => d.v)
    expect(r.map((x) => [x.value, x.start, x.end, x.count])).toEqual([
      ["a", 0, 2, 2],
      ["b", 2, 3, 1],
      ["a", 3, 4, 1],
    ])
  })

  it("uses a domain coordinate + step (calendar/condition-ring units)", () => {
    const days = [
      { day: 0, c: "clear" },
      { day: 1, c: "clear" },
      { day: 2, c: "rain" },
    ]
    const r = runs(days, (d) => d.c, { coord: (d) => d.day, step: 1 })
    expect(r[0]).toMatchObject({ value: "clear", start: 0, end: 2, count: 2 })
    expect(r[1]).toMatchObject({ value: "rain", start: 2, end: 3, count: 1 })
  })

  it("breaks a run across a gap larger than step", () => {
    const days = [
      { day: 0, c: "x" },
      { day: 5, c: "x" },
    ]
    const r = runs(days, (d) => d.c, { coord: (d) => d.day, step: 1 })
    expect(r).toHaveLength(2)
  })

  it("truthyOnly forms present-runs and excludes falsy items", () => {
    const r = runs(
      [{ x: true }, { x: false }, { x: true }, { x: true }],
      (d) => d.x,
      { truthyOnly: true },
    )
    expect(r.map((x) => [x.startIndex, x.endIndex])).toEqual([
      [0, 0],
      [2, 3],
    ])
  })

  it("runLengthEncode is an alias", () => {
    expect(runLengthEncode).toBe(runs)
  })
})

describe("cyclical math", () => {
  it("wrapValue handles over/under and offsets", () => {
    expect(wrapValue(370, 365)).toBe(5)
    expect(wrapValue(-1, 365)).toBe(364)
    expect(wrapValue(5, 365)).toBe(5)
  })

  it("shortestArcDelta takes the short way around", () => {
    expect(shortestArcDelta(350, 10, 365)).toBe(25)
    expect(shortestArcDelta(10, 350, 365)).toBe(-25)
    expect(shortestArcDelta(0, 10, 365)).toBe(10)
  })

  it("cyclicRangeContains handles wrap-around ranges", () => {
    expect(cyclicRangeContains(15, 10, 20)).toBe(true)
    expect(cyclicRangeContains(5, 350, 20)).toBe(true) // wraps
    expect(cyclicRangeContains(100, 350, 20)).toBe(false)
  })

  it("selectCyclicRange returns two arcs when wrapping", () => {
    const rows = [{ d: 5 }, { d: 100 }, { d: 360 }]
    expect(selectCyclicRange(rows, (r) => r.d, 350, 20)).toEqual([{ d: 360 }, { d: 5 }])
    expect(selectCyclicRange(rows, (r) => r.d, 0, 200)).toEqual([{ d: 5 }, { d: 100 }])
  })
})

describe("packIntervals", () => {
  it("packs concurrent intervals into distinct tracks, reuses freed tracks", () => {
    const { packed, trackCount } = packIntervals(
      [
        { id: "a", start: 0, end: 2 },
        { id: "b", start: 1, end: 3 },
        { id: "c", start: 3, end: 4 },
      ],
    )
    const trackOf = (id: string) => packed.find((p) => p.item.id === id)!.track
    expect(trackOf("a")).toBe(0)
    expect(trackOf("b")).toBe(1) // overlaps a
    expect(trackOf("c")).toBe(0) // a ended by 2, free at 3
    expect(trackCount).toBe(2)
  })

  it("accepts custom accessors", () => {
    const { trackCount } = packIntervals(
      [{ s: 0, e: 5 }, { s: 1, e: 2 }],
      { start: "s", end: "e" },
    )
    expect(trackCount).toBe(2)
  })
})

describe("activeCountOverDomain", () => {
  it("counts active intervals per sampled position", () => {
    const counts = activeCountOverDomain(
      [
        { start: 1775, end: 1783 },
        { start: 1812, end: 1815 },
      ],
      { start: "start", end: "end", domain: [1775, 1815], step: 1 },
    )
    expect(counts[0]).toEqual({ value: 1775, count: 1 })
    expect(counts.find((c) => c.value === 1813)).toEqual({ value: 1813, count: 1 })
    expect(counts.find((c) => c.value === 1800)).toEqual({ value: 1800, count: 0 })
  })
})

describe("radial coordinate kit", () => {
  it("polarToXY uses 0 = up, clockwise", () => {
    const up = polarToXY(0, 10)
    expect(up.x).toBeCloseTo(0)
    expect(up.y).toBeCloseTo(-10)
    const right = polarToXY(Math.PI / 2, 10)
    expect(right.x).toBeCloseTo(10)
    expect(right.y).toBeCloseTo(0)
  })

  it("xyToAngle inverts polarToXY", () => {
    const a = 1.2
    const p = polarToXY(a, 50)
    expect(xyToAngle(p.x, p.y)).toBeCloseTo(a)
  })

  it("angleScale / radiusScale map domains linearly", () => {
    const a = angleScale([0, 365])
    expect(a(0)).toBeCloseTo(0)
    expect(a(365)).toBeCloseTo(TAU)
    const r = radiusScale([-10, 110], [0, 120])
    expect(r(-10)).toBeCloseTo(0)
    expect(r(110)).toBeCloseTo(120)
    expect(r(50)).toBeCloseTo(60)
  })

  it("ringArcPath emits sectors, wedges, and full rings", () => {
    const sector = ringArcPath(0, Math.PI / 2, 10, 20)
    expect(sector.startsWith("M")).toBe(true)
    expect(sector).toContain("A")
    const wedge = ringArcPath(0, Math.PI / 2, 0, 20)
    expect(wedge).toContain("L") // line to center
    const ring = ringArcPath(0, TAU, 10, 20)
    expect((ring.match(/A/g) || []).length).toBeGreaterThanOrEqual(4) // two outer + two inner arcs
  })
})

describe("edge-router kit", () => {
  it("curvedEdgePath is an S-curve, with a side-bow for near-level ends", () => {
    expect(curvedEdgePath({ x: 0, y: 0 }, { x: 0, y: 100 })).toContain("C")
    expect(curvedEdgePath({ x: 0, y: 0 }, { x: 80, y: 2 })).toContain("Q")
  })

  it("boxEdgeAnchors exits/enters the right edges by direction", () => {
    const down = boxEdgeAnchors(
      { cx: 0, cy: 0, width: 40, height: 20 },
      { cx: 0, cy: 100, width: 40, height: 20 },
    )
    expect(down.from.y).toBe(10) // bottom of source
    expect(down.to.y).toBe(90) // top of target
  })

  it("fanOutBend centers a fan", () => {
    expect(fanOutBend(2, { modulo: 5, spread: 5 })).toBe(0)
    expect(fanOutBend(0, { modulo: 5, spread: 5 })).toBe(-10)
    expect(fanOutBend(0, { count: 3, spread: 10 })).toBe(-10)
  })

  it("orthogonalEdgePath is rectilinear", () => {
    const d = orthogonalEdgePath({ x: 0, y: 0 }, { x: 50, y: 50 })
    expect(d).toContain("L")
    expect(d).not.toContain("C")
  })

  it("cubicPoint hits the endpoints and the midpoint of a symmetric curve", () => {
    const curve = { p0: { x: 0, y: 0 }, p1: { x: 0, y: 10 }, p2: { x: 10, y: 10 }, p3: { x: 10, y: 0 } }
    expect(cubicPoint(curve, 0)).toEqual({ x: 0, y: 0 })
    expect(cubicPoint(curve, 1)).toEqual({ x: 10, y: 0 })
    const mid = cubicPoint(curve, 0.5)
    expect(mid.x).toBeCloseTo(5)
    expect(mid.y).toBeCloseTo(7.5)
  })

  it("cubicTangent points along increasing t and cubicPath serializes the curve", () => {
    const curve = { p0: { x: 0, y: 0 }, p1: { x: 10, y: 0 }, p2: { x: 20, y: 0 }, p3: { x: 30, y: 0 } }
    const tan = cubicTangent(curve, 0)
    expect(tan.x).toBeGreaterThan(0)
    expect(tan.y).toBeCloseTo(0)
    expect(cubicPath(curve)).toBe("M0,0 C10,0 20,0 30,0")
  })
})

describe("vector kit", () => {
  it("adds, subtracts, and scales points component-wise", () => {
    expect(addPoints({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 })
    expect(subtractPoints({ x: 3, y: 4 }, { x: 1, y: 2 })).toEqual({ x: 2, y: 2 })
    expect(scalePoint({ x: 2, y: -3 }, 2)).toEqual({ x: 4, y: -6 })
  })

  it("pointMagnitude is Euclidean length", () => {
    expect(pointMagnitude({ x: 3, y: 4 })).toBe(5)
  })

  it("normalizePoint returns a unit vector and is safe on the zero vector", () => {
    const u = normalizePoint({ x: 0, y: 5 })
    expect(u).toEqual({ x: 0, y: 1 })
    expect(normalizePoint({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })
})

describe("numeric / color utilities", () => {
  it("clamp bounds a value to its range", () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(99, 0, 10)).toBe(10)
  })

  it("mean averages and returns 0 for an empty list", () => {
    expect(mean([2, 4, 6])).toBe(4)
    expect(mean([])).toBe(0)
  })

  it("withAlpha turns hex into rgba, expands shorthand, clamps alpha, and passes through non-hex", () => {
    expect(withAlpha("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)")
    expect(withAlpha("#f00", 1)).toBe("rgba(255, 0, 0, 1)")
    expect(withAlpha("#000000", 2)).toBe("rgba(0, 0, 0, 1)")
    expect(withAlpha("var(--semiotic-danger)", 0.5)).toBe("var(--semiotic-danger)")
  })
})

describe("allocateCells", () => {
  it("allocates cells proportionally with no drift (largest remainder)", () => {
    const out = allocateCells(
      [{ key: "a", weight: 7 }, { key: "b", weight: 2 }, { key: "c", weight: 1 }],
      100,
    )
    expect(out.map((g) => g.cells)).toEqual([70, 20, 10])
    expect(out.reduce((s, g) => s + g.cells, 0)).toBe(100)
  })

  it("minPerCategory keeps tiny categories visible and total still matches", () => {
    const out = allocateCells(
      [{ key: "big", weight: 99 }, { key: "tiny", weight: 1 }],
      10,
      { minPerCategory: 1 },
    )
    expect(out.find((g) => g.key === "tiny")!.cells).toBeGreaterThanOrEqual(1)
    expect(out.reduce((s, g) => s + g.cells, 0)).toBe(10)
  })

  it("returns zero cells for empty / non-positive inputs", () => {
    expect(allocateCells([{ key: "a", weight: 5 }], 0).every((g) => g.cells === 0)).toBe(true)
    expect(allocateCells([{ key: "a", weight: 0 }], 10).every((g) => g.cells === 0)).toBe(true)
  })
})

describe("rectCollide", () => {
  it("pushes overlapping boxes apart along the free axis", () => {
    const f = rectCollide(
      [
        { id: "a", x: 0, y: 0, width: 40, height: 20 },
        { id: "b", x: 10, y: 0, width: 40, height: 20 },
      ],
      { axis: "x", padding: 0, strength: 0.5 },
    )
    expect(f.get("a")!).toBeLessThan(0)
    expect(f.get("b")!).toBeGreaterThan(0)
  })

  it("ignores boxes that don't overlap on the cross axis", () => {
    const f = rectCollide(
      [
        { id: "a", x: 0, y: 0, width: 40, height: 20 },
        { id: "b", x: 10, y: 500, width: 40, height: 20 },
      ],
      { axis: "x" },
    )
    expect(f.get("a")).toBe(0)
    expect(f.get("b")).toBe(0)
  })
})

describe("axisFixedForcePositions", () => {
  const plot = { x: 0, y: 0, width: 400, height: 600 }
  const nodes = [
    { id: "a", year: 1900 },
    { id: "b", year: 1950 },
    { id: "c", year: 2000 },
  ]
  const edges = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
  ]
  const cfg = { fixedAccessor: "year", fixedDomain: [1900, 2000] as [number, number] }

  it("pins the fixed axis from data and keeps free axis in bounds", () => {
    const { positioned, byId } = axisFixedForcePositions(nodes, edges, plot, cfg)
    expect(positioned).toHaveLength(3)
    // year → y, monotonic
    expect(byId.get("a")!.y).toBeLessThan(byId.get("c")!.y)
    for (const p of positioned) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(400)
    }
  })

  it("is deterministic for identical inputs", () => {
    const a = axisFixedForcePositions(nodes, edges, plot, cfg)
    const b = axisFixedForcePositions(nodes, edges, plot, cfg)
    expect(a.positioned.map((p) => [p.id, Math.round(p.x), Math.round(p.y)])).toEqual(
      b.positioned.map((p) => [p.id, Math.round(p.x), Math.round(p.y)]),
    )
  })

  it("unwraps frame node wrappers", () => {
    const wrapped = nodes.map((n) => ({ data: n }))
    const { positioned } = axisFixedForcePositions(wrapped, edges, plot, cfg)
    expect(positioned.map((p) => p.data.id).sort()).toEqual(["a", "b", "c"])
  })
})

describe("unwrapDatum", () => {
  it("returns the raw datum whether wrapped or not", () => {
    expect(unwrapDatum({ data: { a: 1 } })).toEqual({ a: 1 })
    expect(unwrapDatum({ a: 1 })).toEqual({ a: 1 })
    expect(unwrapDatum(null)).toBeNull()
  })

  it("unwraps the .datum nesting some interaction payloads use", () => {
    expect(unwrapDatum({ datum: { a: 2 } })).toEqual({ a: 2 })
    // .data wins when both are present (frame wrappers put the user object there)
    expect(unwrapDatum({ data: { a: 1 }, datum: { a: 2 } })).toEqual({ a: 1 })
  })
})

describe("hitTarget helpers", () => {
  it("hitTargetPoint emits an invisible, anchored, keyed point node", () => {
    const n = hitTargetPoint({ x: 3, y: 4, datum: { d: 1 }, id: "p1" })
    expect(n).toMatchObject({
      type: "point",
      x: 3,
      y: 4,
      r: 8,
      pointId: "p1",
      _transitionKey: "p1",
    })
    expect(n.style.opacity).toBe(0)
  })

  it("hitTargetRect emits a transparent rect with transition identity", () => {
    const n = hitTargetRect({ x: 1, y: 2, width: 10, height: 5, datum: {}, id: "r1", group: "g" })
    expect(n).toMatchObject({ type: "rect", x: 1, y: 2, w: 10, h: 5, group: "g", _transitionKey: "r1" })
    expect(n.style.opacity).toBe(0)
  })

  it("networkHitTarget picks circle vs rect by shape", () => {
    const circle = networkHitTarget({ x: 0, y: 0, datum: {}, id: "c", r: 12 })
    expect(circle).toMatchObject({ type: "circle", cx: 0, cy: 0, r: 12, id: "c" })
    const rect = networkHitTarget({ x: 1, y: 2, width: 8, height: 6, datum: {}, id: "r" })
    expect(rect).toMatchObject({ type: "rect", x: 1, y: 2, w: 8, h: 6, id: "r" })
  })
})

describe("chrome overlays", () => {
  it("linearAxis returns a <g> of ticks", () => {
    const axis = linearAxis({ scale: (v) => v * 2, ticks: [0, 1, 2], orient: "top" }) as {
      type: string
      props: { children: unknown[] }
    }
    expect(axis.type).toBe("g")
    expect(axis.props.children).toHaveLength(3)
  })

  it("legendSwatches returns a <g> with one group per entry", () => {
    const legend = legendSwatches({
      x: 0,
      y: 0,
      entries: [{ label: "A", color: "#f00" }, { label: "B", line: "#0f0" }, { label: "Band", hatch: true }],
    }) as { type: string; props: { children: unknown[] } }
    expect(legend.type).toBe("g")
    expect(legend.props.children).toHaveLength(3)
  })

  it("hatchFill returns a <pattern> def and a matching url(#id) fill", () => {
    const hatch = hatchFill({ id: "env", color: "#abc" }) as {
      def: { type: string; props: { id: string } }
      fill: string
    }
    expect(hatch.def.type).toBe("pattern")
    expect(hatch.def.props.id).toBe("env")
    expect(hatch.fill).toBe("url(#env)")
  })
})
