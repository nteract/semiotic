import { describe, it, expect } from "vitest"
import { applyDistanceCartogram } from "./geoCartogram"
import type { PointSceneNode } from "./types"
import type { GeoSceneNode } from "./geoTypes"

function point(
  id: string,
  x: number,
  y: number,
  cost: number,
): PointSceneNode {
  return {
    type: "point",
    x,
    y,
    r: 3,
    style: {},
    datum: { id, cost },
    pointId: id,
  }
}

const layout = { width: 200, height: 40 }

describe("applyDistanceCartogram", () => {
  it("radial layout places farther costs farther from center", () => {
    const scene: GeoSceneNode[] = [
      point("origin", 100, 100, 0),
      point("near", 120, 100, 5),
      point("far", 140, 100, 20),
    ]
    const result = applyDistanceCartogram(
      scene,
      {
        center: "origin",
        centerAccessor: "id",
        costAccessor: "cost",
        strength: 1,
        layout: "radial",
      },
      { width: 200, height: 200 },
      0,
    )
    expect(result?.layout).toBe("radial")
    const origin = scene.find((n) => n.type === "point" && n.pointId === "origin") as PointSceneNode
    const near = scene.find((n) => n.type === "point" && n.pointId === "near") as PointSceneNode
    const far = scene.find((n) => n.type === "point" && n.pointId === "far") as PointSceneNode
    const dNear = Math.hypot(near.x - origin.x, near.y - origin.y)
    const dFar = Math.hypot(far.x - origin.x, far.y - origin.y)
    expect(dNear).toBeLessThan(dFar)
  })

  it("strip layout is Langren-style: origin left, cost on x, y collapsed", () => {
    const scene: GeoSceneNode[] = [
      point("origin", 50, 80, 0),
      point("a", 90, 10, 5),
      point("b", 10, 150, 20),
    ]
    const result = applyDistanceCartogram(
      scene,
      {
        center: "origin",
        centerAccessor: "id",
        costAccessor: "cost",
        strength: 1,
        layout: "strip",
      },
      layout,
      0,
    )
    expect(result).not.toBeNull()
    expect(result!.layout).toBe("strip")
    expect(result!.availableRadius).toBeGreaterThan(0)

    const origin = scene.find((n) => n.type === "point" && n.pointId === "origin") as PointSceneNode
    const a = scene.find((n) => n.type === "point" && n.pointId === "a") as PointSceneNode
    const b = scene.find((n) => n.type === "point" && n.pointId === "b") as PointSceneNode

    // Origin at left inset; higher cost farther right.
    expect(origin.x).toBeLessThan(a.x)
    expect(a.x).toBeLessThan(b.x)
    // Strip collapses the cross-axis to the midline (or a small beeswarm).
    expect(Math.abs(origin.y - layout.height / 2)).toBeLessThan(0.5)
    expect(Math.abs(a.y - layout.height / 2)).toBeLessThan(4)
    expect(Math.abs(b.y - layout.height / 2)).toBeLessThan(4)
  })

  it("strip beeswarms coincident costs off the baseline", () => {
    const scene: GeoSceneNode[] = [
      point("origin", 0, 0, 0),
      point("p1", 10, 10, 10),
      point("p2", 20, 20, 10),
      point("p3", 30, 30, 10),
    ]
    applyDistanceCartogram(
      scene,
      {
        center: "origin",
        centerAccessor: "id",
        costAccessor: "cost",
        layout: "strip",
      },
      layout,
      0,
    )
    const ys = scene
      .filter((n): n is PointSceneNode => n.type === "point" && n.pointId !== "origin")
      .map((n) => n.y)
    // Not all three marks should sit on the exact same y after packing.
    expect(new Set(ys.map((y) => Math.round(y * 10) / 10)).size).toBeGreaterThan(1)
  })
})
