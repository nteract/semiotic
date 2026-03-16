import { describe, it, expect, vi, beforeEach } from "vitest"
import { findNearestGeoNode } from "./GeoCanvasHitTester"
import type { GeoAreaSceneNode, GeoSceneNode } from "./geoTypes"
import type { PointSceneNode, LineSceneNode } from "./types"

// Mock canvas context with isPointInPath
function createMockHitCtx() {
  const pathsInPoint = new Set<string>()

  return {
    isPointInPath: vi.fn((path: Path2D, x: number, y: number) => {
      // Simulate: any path whose data starts with "M0" is "hit" for point (50,50)
      // We use the pathsInPoint set to control which paths register hits
      return pathsInPoint.has((path as any).__testId)
    }),
    _registerHit: (id: string) => pathsInPoint.add(id),
    _clearHits: () => pathsInPoint.clear()
  } as any
}

// Helper to create a Path2D mock that carries an ID
const origPath2D = globalThis.Path2D
beforeEach(() => {
  let counter = 0
  globalThis.Path2D = class MockPath2D {
    __testId: string
    constructor(d?: string) {
      this.__testId = d || `path-${counter++}`
    }
  } as any
})

describe("findNearestGeoNode", () => {
  it("finds point nodes by proximity", () => {
    const pointNode: PointSceneNode = {
      type: "point",
      x: 100,
      y: 100,
      r: 5,
      style: { fill: "red" },
      datum: { id: "test" }
    }

    const hitCtx = createMockHitCtx()
    const result = findNearestGeoNode([pointNode], 102, 102, 30, hitCtx)

    expect(result).not.toBeNull()
    expect(result!.node).toBe(pointNode)
  })

  it("returns null when no nodes are near", () => {
    const pointNode: PointSceneNode = {
      type: "point",
      x: 100,
      y: 100,
      r: 5,
      style: { fill: "red" },
      datum: { id: "test" }
    }

    const hitCtx = createMockHitCtx()
    const result = findNearestGeoNode([pointNode], 500, 500, 30, hitCtx)

    expect(result).toBeNull()
  })

  it("prefers points over areas (z-order)", () => {
    const pointNode: PointSceneNode = {
      type: "point",
      x: 50,
      y: 50,
      r: 5,
      style: { fill: "red" },
      datum: { id: "point" }
    }

    const areaNode: GeoAreaSceneNode = {
      type: "geoarea",
      pathData: "M0,0L100,0L100,100L0,100Z",
      centroid: [50, 50],
      bounds: [[0, 0], [100, 100]],
      screenArea: 10000,
      style: { fill: "blue" },
      datum: { id: "area" },
      interactive: true
    }

    const hitCtx = createMockHitCtx()
    hitCtx._registerHit("M0,0L100,0L100,100L0,100Z")

    const result = findNearestGeoNode([areaNode, pointNode], 50, 50, 30, hitCtx)

    // Point should win because it's checked first
    expect(result).not.toBeNull()
    expect(result!.node.type).toBe("point")
  })

  it("skips non-interactive geo areas", () => {
    const areaNode: GeoAreaSceneNode = {
      type: "geoarea",
      pathData: "M0,0L100,0L100,100L0,100Z",
      centroid: [50, 50],
      bounds: [[0, 0], [100, 100]],
      screenArea: 10000,
      style: { fill: "blue" },
      datum: { id: "graticule" },
      interactive: false
    }

    const hitCtx = createMockHitCtx()
    hitCtx._registerHit("M0,0L100,0L100,100L0,100Z")

    const result = findNearestGeoNode([areaNode], 50, 50, 30, hitCtx)
    expect(result).toBeNull()
  })

  it("finds line nodes by segment distance", () => {
    const lineNode: LineSceneNode = {
      type: "line",
      path: [[0, 50], [100, 50]],
      style: { stroke: "red", strokeWidth: 2 },
      datum: { id: "route" }
    }

    const hitCtx = createMockHitCtx()
    // Mouse at (50, 52) — 2px from the line
    const result = findNearestGeoNode([lineNode], 50, 52, 30, hitCtx)

    expect(result).not.toBeNull()
    expect(result!.node.type).toBe("line")
  })
})
