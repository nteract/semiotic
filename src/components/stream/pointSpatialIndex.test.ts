import "../../test-utils/registerBuiltInXYPlugins"
import "../../test-utils/provideXYTransitionEngine"
import { describe, expect, it, vi } from "vitest"
import { quadtree as d3Quadtree } from "d3-quadtree"
import { findNearestNode } from "./CanvasHitTester"
import { GeoPipelineStore } from "./GeoPipelineStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import {
  LazyPointIndex,
  POINT_INDEX_THRESHOLD,
  buildPointSpatialIndex,
  buildXYPointSpatialIndex
} from "./pointSpatialIndex"
import type { PointSceneNode, SceneNode } from "./types"

const LAYOUT = { width: 600, height: 400 }

/** Read the private lazy index of any store without widening its API. */
function indexOf(store: object): LazyPointIndex {
  const holder = store as { spatialIndex?: LazyPointIndex; pointIndex?: LazyPointIndex }
  const index = holder.spatialIndex ?? holder.pointIndex
  if (!index) throw new Error("store has no lazy point index")
  return index
}

function datum(i: number) {
  return {
    id: "p" + i,
    x: ((i * 47) % 997) / 9.97,
    y: ((i * 89 + 31) % 991) / 9.91,
    size: 1 + (i % 7)
  }
}

function scatterStore(overrides: Partial<PipelineConfig> = {}): PipelineStore {
  return new PipelineStore({
    chartType: "scatter",
    windowSize: 5000,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.05,
    xAccessor: "x",
    yAccessor: "y",
    pointIdAccessor: "id",
    pointStyle: (d) => ({ fill: "#4e79a7", r: (d as { size: number }).size }),
    ...overrides
  } as PipelineConfig)
}

function points(count: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => datum(i + offset))
}

/** The index exactly as the stores built it eagerly before it became lazy. */
function eagerReference(scene: readonly SceneNode[]) {
  const nodes = scene.filter(
    (node): node is PointSceneNode =>
      node.type === "point" && node.interactive !== false
  )
  let maxRadius = 0
  for (const node of nodes) if (node.r > maxRadius) maxRadius = node.r
  return {
    maxRadius,
    quadtree:
      nodes.length > POINT_INDEX_THRESHOLD
        ? d3Quadtree<PointSceneNode>()
            .x((node) => node.x)
            .y((node) => node.y)
            .addAll(nodes)
        : null
  }
}

describe("LazyPointIndex", () => {
  it("builds on the first read after invalidation and not before", () => {
    const build = vi.fn(() => ({ quadtree: null, maxRadius: 3 }))
    const index = new LazyPointIndex(build)

    expect(index.resolve().maxRadius).toBe(0)
    expect(build).not.toHaveBeenCalled()

    index.invalidate()
    index.invalidate()
    expect(build).not.toHaveBeenCalled()
    expect(index.last.maxRadius).toBe(0)

    expect(index.resolve().maxRadius).toBe(3)
    expect(index.resolve().maxRadius).toBe(3)
    expect(build).toHaveBeenCalledTimes(1)
    expect(index.buildCount).toBe(1)
  })

  it("clear() drops the index and any pending rebuild", () => {
    const build = vi.fn(() => ({ quadtree: null, maxRadius: 9 }))
    const index = new LazyPointIndex(build)
    index.invalidate()
    index.resolve()
    index.invalidate()
    index.clear()

    expect(index.resolve()).toEqual({ quadtree: null, maxRadius: 0 })
    expect(build).toHaveBeenCalledTimes(1)
  })
})

describe("buildPointSpatialIndex", () => {
  const point = (x: number, extra: Partial<PointSceneNode> = {}): PointSceneNode => ({
    type: "point", x, y: 0, r: 4, style: {}, datum: { x }, ...extra
  })

  it("stays linear at the threshold and indexes above it", () => {
    const atThreshold = Array.from({ length: POINT_INDEX_THRESHOLD }, (_, i) => point(i))
    expect(buildPointSpatialIndex(atThreshold).quadtree).toBeNull()
    expect(buildPointSpatialIndex([...atThreshold, point(-1)]).quadtree).not.toBeNull()
  })

  it("XY indexes only point-mark chart types", () => {
    const scene = Array.from({ length: POINT_INDEX_THRESHOLD + 1 }, (_, i) => point(i))
    expect(buildXYPointSpatialIndex("scatter", scene).quadtree).not.toBeNull()
    expect(buildXYPointSpatialIndex("bubble", scene).quadtree).not.toBeNull()
    expect(buildXYPointSpatialIndex("custom", scene).quadtree).not.toBeNull()
    expect(buildXYPointSpatialIndex("line", scene)).toEqual({ quadtree: null, maxRadius: 0 })
  })
})

describe("PipelineStore spatial index", () => {
  it("does not build the index during push-only work", () => {
    const store = scatterStore()
    store.ingest({ inserts: points(2000), bounded: true })
    store.computeScene(LAYOUT)
    for (let i = 0; i < 25; i++) {
      store.ingest({ inserts: [datum(2000 + i)], bounded: false, boundedAppend: true })
      store.computeScene(LAYOUT)
    }
    // A resize takes the proportional-remap path, which also moves points.
    store.computeScene({ width: 640, height: 420 })

    expect(store.scene.length).toBe(2025)
    expect(indexOf(store).buildCount).toBe(0)
  })

  it("builds on the first hit test and reuses the index until the scene changes", () => {
    const store = scatterStore()
    store.ingest({ inserts: points(2000), bounded: true })
    store.computeScene(LAYOUT)

    expect(store.quadtree).not.toBeNull()
    expect(indexOf(store).buildCount).toBe(1)

    findNearestNode(store.scene, 300, 200, 30, store.quadtree, store.maxPointRadius)
    findNearestNode(store.scene, 10, 20, 30, store.quadtree, store.maxPointRadius)
    expect(indexOf(store).buildCount).toBe(1)

    store.ingest({ inserts: [datum(2000)], bounded: false, boundedAppend: true })
    store.computeScene(LAYOUT)
    expect(indexOf(store).buildCount).toBe(1)
    expect(store.quadtree!.size()).toBe(2001)
    expect(indexOf(store).buildCount).toBe(2)

    // The resize remap moves points in place; the next read must reindex.
    store.computeScene({ width: 640, height: 420 })
    expect(indexOf(store).buildCount).toBe(2)
    void store.maxPointRadius
    expect(indexOf(store).buildCount).toBe(3)
  })

  it("returns the same hits as the eager index and as a linear scan", () => {
    const store = scatterStore()
    store.ingest({ inserts: points(3000), bounded: true })
    store.computeScene(LAYOUT)

    const reference = eagerReference(store.scene)
    expect(reference.quadtree).not.toBeNull()
    expect(store.maxPointRadius).toBe(reference.maxRadius)

    let hits = 0
    for (let px = 0; px <= LAYOUT.width; px += 12) {
      for (let py = 0; py <= LAYOUT.height; py += 12) {
        const lazy = findNearestNode(store.scene, px, py, 6, store.quadtree, store.maxPointRadius)
        const eager = findNearestNode(store.scene, px, py, 6, reference.quadtree, reference.maxRadius)
        const linear = findNearestNode(store.scene, px, py, 6)
        expect(lazy?.node).toBe(eager?.node)
        expect(lazy?.node).toBe(linear?.node)
        expect(lazy?.distance).toBe(eager?.distance)
        if (lazy) hits++
      }
    }
    expect(hits).toBeGreaterThan(100)
  })

  it("leaves small and non-point scenes unindexed", () => {
    const small = scatterStore()
    small.ingest({ inserts: points(POINT_INDEX_THRESHOLD), bounded: true })
    small.computeScene(LAYOUT)
    expect(small.quadtree).toBeNull()
    expect(small.maxPointRadius).toBe(7)

    const line = scatterStore({ chartType: "line", pointStyle: undefined })
    line.ingest({ inserts: points(2000), bounded: true })
    line.computeScene(LAYOUT)
    expect(line.quadtree).toBeNull()
    expect(line.maxPointRadius).toBe(0)
  })

  it("clear() drops the index", () => {
    const store = scatterStore()
    store.ingest({ inserts: points(2000), bounded: true })
    store.computeScene(LAYOUT)
    expect(store.quadtree).not.toBeNull()

    store.clear()
    expect(store.quadtree).toBeNull()
    expect(store.maxPointRadius).toBe(0)
  })

  it("scans linearly during a transition and indexes the settled positions after it", () => {
    const store = scatterStore({ transition: { duration: 300 } })
    store.ingest({ inserts: points(1500), bounded: true })
    store.computeScene(LAYOUT)
    expect(store.activeTransition).toBeNull()
    expect(store.quadtree).not.toBeNull()
    const buildsBefore = indexOf(store).buildCount

    // Same ids, mirrored positions: every point animates across the plot.
    const moved = points(1500).map((d) => ({ ...d, x: 100 - d.x, y: 100 - d.y }))
    store.ingest({ inserts: moved, bounded: true })
    store.computeScene(LAYOUT)
    expect(store.activeTransition).not.toBeNull()

    // Mid-transition the marks are between positions: no index is offered,
    // none is built, and the hit test reads the animated coordinates.
    store.advanceTransition(store.activeTransition!.startTime + 150)
    expect(store.quadtree).toBeNull()
    void store.maxPointRadius
    expect(indexOf(store).buildCount).toBe(buildsBefore)

    expect(store.advanceTransition(store.activeTransition!.startTime + 1000)).toBe(false)
    expect(store.activeTransition).toBeNull()

    const settled = store.quadtree
    expect(settled).not.toBeNull()
    expect(indexOf(store).buildCount).toBe(buildsBefore + 1)
    for (const node of store.scene.slice(0, 200)) {
      if (node.type !== "point") continue
      const indexed = findNearestNode(store.scene, node.x, node.y, 4, settled, store.maxPointRadius)
      const linear = findNearestNode(store.scene, node.x, node.y, 4)
      expect(indexed).not.toBeNull()
      expect(indexed?.node).toBe(linear?.node)
    }
  })
})

describe("OrdinalPipelineStore point index", () => {
  function swarmStore(): OrdinalPipelineStore {
    return new OrdinalPipelineStore({
      chartType: "swarm",
      windowSize: 5000,
      windowMode: "sliding",
      extentPadding: 0.05,
      projection: "vertical",
      oAccessor: "category",
      rAccessor: "value"
    })
  }
  const rows = (count: number, offset = 0) =>
    Array.from({ length: count }, (_, i) => ({
      category: "c" + ((i + offset) % 4),
      value: ((i + offset) * 37) % 101
    }))

  it("builds on the first hit test, not on scene rebuilds", () => {
    const store = swarmStore()
    store.ingest({ inserts: rows(1200), bounded: true })
    store.computeScene({ width: 600, height: 400 })
    store.ingest({ inserts: rows(10, 1200), bounded: false })
    store.computeScene({ width: 600, height: 400 })
    expect(indexOf(store).buildCount).toBe(0)

    const reference = buildPointSpatialIndex(store.scene)
    expect(reference.quadtree).not.toBeNull()
    expect(store.pointQuadtree!.size()).toBe(reference.quadtree!.size())
    expect(store.maxPointRadius).toBe(reference.maxRadius)
    expect(indexOf(store).buildCount).toBe(1)

    store.ingest({ inserts: rows(10, 1210), bounded: false })
    store.computeScene({ width: 600, height: 400 })
    expect(indexOf(store).buildCount).toBe(1)
    expect(store.pointQuadtree!.size()).toBe(1220)
    expect(indexOf(store).buildCount).toBe(2)
  })

  it("drops the index when the buffer empties", () => {
    const store = swarmStore()
    store.ingest({ inserts: rows(1200), bounded: true })
    store.computeScene({ width: 600, height: 400 })
    expect(store.pointQuadtree).not.toBeNull()

    store.clear()
    store.computeScene({ width: 600, height: 400 })
    expect(store.pointQuadtree).toBeNull()
    expect(store.maxPointRadius).toBe(0)
  })
})

describe("GeoPipelineStore point index", () => {
  const cities = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: "city" + i,
      lon: -120 + ((i * 7) % 60),
      lat: 25 + ((i * 11) % 24)
    }))

  it("builds on the first hit test, not on each reprojection", () => {
    const store = new GeoPipelineStore({
      projection: "mercator",
      xAccessor: "lon",
      yAccessor: "lat",
      pointIdAccessor: "id"
    })
    store.setPoints(cities(900))
    store.computeScene({ width: 600, height: 400 })
    store.computeScene({ width: 640, height: 420 })
    expect(store.scene.filter((node) => node.type === "point")).toHaveLength(900)
    expect(indexOf(store).buildCount).toBe(0)

    const reference = buildPointSpatialIndex(store.scene)
    expect(store.quadtree!.size()).toBe(reference.quadtree!.size())
    expect(store.maxPointRadius).toBe(reference.maxRadius)
    expect(indexOf(store).buildCount).toBe(1)

    store.computeScene({ width: 600, height: 400 })
    expect(indexOf(store).buildCount).toBe(1)
    expect(store.quadtree).not.toBeNull()
    expect(indexOf(store).buildCount).toBe(2)

    store.clear()
    expect(store.quadtree).toBeNull()
  })
})
