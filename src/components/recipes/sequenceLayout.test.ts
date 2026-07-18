import { describe, expect, it } from "vitest"
import {
  estimateLabelWidth,
  layoutChipStrip,
  layoutSequence,
  packSpanLevels,
  partitionSharedEdges,
  scaleArcBand,
  spanArcPath,
  spanArcPeakY
} from "./sequenceLayout"
import { hullFromBoxes } from "./recipeChrome"

describe("layoutSequence", () => {
  it("places items evenly between padding on a baseline", () => {
    const positions = layoutSequence(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      { width: 300, y: 100, paddingLeft: 50, paddingRight: 50 }
    )
    expect(positions.get("a")).toEqual({ id: "a", x: 50, y: 100, index: 0 })
    expect(positions.get("c")).toEqual({ id: "c", x: 250, y: 100, index: 2 })
    expect(positions.get("b")?.x).toBeCloseTo(150)
  })

  it("centers a single item between padding", () => {
    const positions = layoutSequence([{ id: "only" }], {
      width: 200,
      y: 40,
      paddingLeft: 20,
      paddingRight: 20
    })
    expect(positions.get("only")?.x).toBe(20)
    expect(positions.get("only")?.index).toBe(0)
  })
})

describe("layoutChipStrip", () => {
  it("sizes chips by estimated label width and returns centers", () => {
    const positions = layoutChipStrip(
      [
        { id: "hi", label: "hi" },
        { id: "hello", label: "hello" }
      ],
      { width: 400, y: 50, paddingLeft: 20, paddingRight: 20, gap: 10 }
    )
    const hi = positions.get("hi")!
    const hello = positions.get("hello")!
    expect(hi.width).toBe(estimateLabelWidth("hi"))
    expect(hello.width).toBe(estimateLabelWidth("hello"))
    expect(hello.x).toBeGreaterThan(hi.x)
    expect(hi.y).toBe(50)
  })
})

describe("packSpanLevels", () => {
  it("packs short spans low and stacks overlapping long spans", () => {
    const { packed, levelCount, maxLevel } = packSpanLevels([
      { id: "short", a: 0, b: 1 },
      { id: "overlap", a: 0, b: 3 },
      { id: "after", a: 2, b: 4 }
    ])
    const levelOf = (id: string) => packed.find((row) => row.span.id === id)!.level
    expect(levelOf("short")).toBe(0)
    expect(levelOf("overlap")).toBe(1)
    // starts at 2 after short ended at 1; can share level 0 with short
    expect(levelOf("after")).toBe(0)
    expect(levelCount).toBe(2)
    expect(maxLevel).toBe(1)
  })

  it("allows endpoint-sharing spans on the same level", () => {
    const { packed } = packSpanLevels([
      { id: "a", a: 0, b: 2 },
      { id: "b", a: 2, b: 4 }
    ])
    expect(packed.every((row) => row.level === 0)).toBe(true)
  })
})

describe("scaleArcBand + spanArcPath", () => {
  it("stretches levels into the free vertical band", () => {
    const metrics = scaleArcBand({
      baselineY: 400,
      ceilingY: 80,
      levelCount: 3
    })
    expect(metrics.arcLift).toBeGreaterThanOrEqual(26)
    expect(metrics.levelStep).toBeGreaterThanOrEqual(28)
    const peak0 = spanArcPeakY(400, 0, metrics)
    const peak2 = spanArcPeakY(400, 2, metrics)
    expect(peak0).toBeLessThan(400)
    expect(peak2).toBeLessThan(peak0)
    expect(peak2).toBeGreaterThan(80)
  })

  it("emits a quadratic path with feet above the baseline", () => {
    const d = spanArcPath(10, 90, 200, 120, { footLift: 20 })
    expect(d).toBe("M10 180Q50 120 90 180")
  })
})

describe("partitionSharedEdges", () => {
  it("splits shared topology from exclusive edges", () => {
    const a = [
      { id: "shared", source: "1", target: "2", relation: "nsubj" },
      { id: "only-a", source: "1", target: "3", relation: "obl" }
    ]
    const b = [
      { id: "shared-b", source: "1", target: "2", relation: "nsubj" },
      { id: "only-b", source: "2", target: "3", relation: "nmod" }
    ]
    const { shared, exclusive } = partitionSharedEdges([a, b], (edge) =>
      `${edge.source}|${edge.target}|${edge.relation}`
    )
    expect(shared).toHaveLength(1)
    expect(shared[0].id).toBe("shared")
    expect(exclusive[0].map((edge) => edge.id)).toEqual(["only-a"])
    expect(exclusive[1].map((edge) => edge.id)).toEqual(["only-b"])
  })

  it("defaults to id / source-target-relation keys", () => {
    const { shared } = partitionSharedEdges([
      [{ id: "e1" }, { id: "e2" }],
      [{ id: "e1" }, { id: "e3" }]
    ])
    expect(shared.map((edge) => (edge as { id: string }).id)).toEqual(["e1"])
  })
})

describe("hullFromBoxes", () => {
  it("returns a padded AABB that fully surrounds discrete chips", () => {
    const hull = hullFromBoxes(
      [
        { x: 10, y: 20, width: 40, height: 20 },
        { x: 60, y: 15, width: 30, height: 30 }
      ],
      { x: 8, y: 4 }
    )
    expect(hull).toEqual({
      x: 2,
      y: 11,
      width: 96,
      height: 38
    })
  })

  it("returns null for an empty set", () => {
    expect(hullFromBoxes([])).toBeNull()
  })
})
