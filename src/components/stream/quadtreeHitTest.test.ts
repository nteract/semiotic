import { describe, it, expect } from "vitest"
import { quadtree } from "d3-quadtree"
import { findHitPointInQuadtree } from "./quadtreeHitTest"

interface TestPoint { x: number; y: number; r: number; id: string }

function makeQt(points: TestPoint[]) {
  return quadtree<TestPoint>().x(p => p.x).y(p => p.y).addAll(points)
}

describe("findHitPointInQuadtree", () => {
  it("returns the point under the cursor for a simple uniform-radius case", () => {
    const points: TestPoint[] = [
      { x: 10, y: 10, r: 5, id: "a" },
      { x: 50, y: 50, r: 5, id: "b" },
      { x: 90, y: 90, r: 5, id: "c" }
    ]
    const qt = makeQt(points)
    const hit = findHitPointInQuadtree(qt, 51, 51, 30, 5)
    expect(hit?.node.id).toBe("b")
  })

  it("returns null when no point is within its own hit radius", () => {
    const points: TestPoint[] = [{ x: 10, y: 10, r: 5, id: "a" }]
    const qt = makeQt(points)
    // Cursor is 200px away — far outside any possible hit radius
    const hit = findHitPointInQuadtree(qt, 200, 200, 30, 5)
    expect(hit).toBeNull()
  })

  it("prefers a farther large-radius point over a nearer small-radius miss (the core bug)", () => {
    // Without the visit-all-candidates approach, quadtree.find would return
    // the nearest point (`small`), reject it for distance > hitRadius, and
    // miss the bigger point behind it that *does* contain the cursor.
    // getHitRadius(r, 30) = max(r + 5, 12, 30).
    const points: TestPoint[] = [
      { x: 10, y: 0, r: 1, id: "small" },   // dist 40, hitRadius 30 → MISS
      { x: 110, y: 0, r: 80, id: "big" }    // dist 60, hitRadius 85 → HIT
    ]
    const qt = makeQt(points)
    const hit = findHitPointInQuadtree(qt, 50, 0, 30, 80)
    expect(hit?.node.id).toBe("big")
  })

  it("among multiple hits returns the closest by distance", () => {
    const points: TestPoint[] = [
      { x: 100, y: 100, r: 30, id: "far" },   // 30px away, hitRadius ≥ 35
      { x: 108, y: 100, r: 20, id: "near" }   // 22px away, hitRadius ≥ 25
    ]
    const qt = makeQt(points)
    const hit = findHitPointInQuadtree(qt, 130, 100, 30, 30)
    expect(hit?.node.id).toBe("near")
  })

  it("prunes subtrees outside the search radius (perf smoke — no bound violation)", () => {
    // Build a large scatter with only one point near the cursor. If pruning
    // works, we're still correct; if it doesn't, we're also correct but slow.
    // This test just confirms correctness at scale.
    const points: TestPoint[] = []
    for (let i = 0; i < 10000; i++) {
      points.push({ x: 1000 + (i % 100), y: 1000 + Math.floor(i / 100), r: 2, id: `bg${i}` })
    }
    points.push({ x: 50, y: 50, r: 5, id: "target" })
    const qt = makeQt(points)
    const hit = findHitPointInQuadtree(qt, 50, 50, 30, 5)
    expect(hit?.node.id).toBe("target")
  })

  it("handles co-located points via the leaf linked list", () => {
    // d3-quadtree stores points at identical coordinates as a `.next` list.
    const points: TestPoint[] = [
      { x: 50, y: 50, r: 5, id: "a" },
      { x: 50, y: 50, r: 5, id: "b" },
      { x: 50, y: 50, r: 5, id: "c" }
    ]
    const qt = makeQt(points)
    const hit = findHitPointInQuadtree(qt, 50, 50, 30, 5)
    // Any of the three is an acceptable hit — they're all at dist=0.
    expect(hit?.node.id).toMatch(/^[abc]$/)
    expect(hit?.distance).toBe(0)
  })
})
