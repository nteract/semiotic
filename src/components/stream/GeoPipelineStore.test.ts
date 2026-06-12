import { describe, it, expect } from "vitest"
import { GeoPipelineStore } from "./GeoPipelineStore"
import type { GeoAreaSceneNode, GeoLineSceneNode, GeoPipelineConfig, GeoSceneNode } from "./geoTypes"
import type { PointSceneNode } from "./types"

const isGeoArea = (node: GeoSceneNode): node is GeoAreaSceneNode => node.type === "geoarea"
const isGeoLine = (node: GeoSceneNode): node is GeoLineSceneNode => node.type === "line"
const isPoint = (node: GeoSceneNode): node is PointSceneNode => node.type === "point"

// Simple test features
const usStates: GeoJSON.Feature[] = [
  {
    type: "Feature",
    properties: { name: "California", population: 39500000 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-124, 42], [-114, 42], [-114, 32], [-124, 32], [-124, 42]]]
    }
  },
  {
    type: "Feature",
    properties: { name: "Texas", population: 29100000 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-106, 36], [-93, 36], [-93, 26], [-106, 26], [-106, 36]]]
    }
  }
]

const cities = [
  { id: "sf", name: "San Francisco", lon: -122.4, lat: 37.8 },
  { id: "ny", name: "New York", lon: -74.0, lat: 40.7 },
  { id: "la", name: "Los Angeles", lon: -118.2, lat: 34.1 }
]

const routes = [
  {
    source: "sf",
    target: "ny",
    coordinates: [
      { lon: -122.4, lat: 37.8 },
      { lon: -74.0, lat: 40.7 }
    ]
  }
]

function makeConfig(overrides: Partial<GeoPipelineConfig> = {}): GeoPipelineConfig {
  return {
    projection: "mercator",
    xAccessor: "lon",
    yAccessor: "lat",
    ...overrides
  }
}

describe("GeoPipelineStore", () => {
  it("creates store with config", () => {
    const store = new GeoPipelineStore(makeConfig())
    expect(store.scene).toEqual([])
    expect(store.scales).toBeNull()
    expect(store.version).toBe(0)
  })

  it("builds area scene nodes from GeoJSON features", () => {
    const store = new GeoPipelineStore(makeConfig())
    store.setAreas(usStates)
    store.computeScene({ width: 600, height: 400 })

    expect(store.scene.length).toBe(2)
    expect(store.scene[0].type).toBe("geoarea")

    const node = store.scene[0]
    expect(isGeoArea(node)).toBe(true)
    if (!isGeoArea(node)) throw new Error("Expected geoarea scene node")
    expect(node.pathData).toBeTruthy()
    expect(node.centroid).toHaveLength(2)
    expect(node.bounds).toHaveLength(2)
    expect(node.datum).toBe(usStates[0])
    expect(node.interactive).toBe(true)
  })

  it("builds point scene nodes from coordinate data", () => {
    const store = new GeoPipelineStore(makeConfig())
    store.setPoints(cities)
    store.computeScene({ width: 600, height: 400 })

    const points = store.scene.filter(isPoint)
    expect(points.length).toBe(3)

    const sf = points[0]
    expect(typeof sf.x).toBe("number")
    expect(isFinite(sf.x)).toBe(true)
    expect(typeof sf.y).toBe("number")
    expect(isFinite(sf.y)).toBe(true)
    expect(sf.datum).toBe(cities[0])
  })

  it("builds line scene nodes from route data", () => {
    const store = new GeoPipelineStore(makeConfig({
      lineDataAccessor: "coordinates"
    }))
    store.setPoints(cities)
    store.setLines(routes)
    store.computeScene({ width: 600, height: 400 })

    const lines = store.scene.filter(isGeoLine)
    expect(lines.length).toBe(1)

    const route = lines[0]
    expect(route.path.length).toBe(2)
    expect(route.datum).toBe(routes[0])
  })

  it("produces scales with projection functions", () => {
    const store = new GeoPipelineStore(makeConfig())
    store.setPoints(cities)
    store.computeScene({ width: 600, height: 400 })

    expect(store.scales).not.toBeNull()
    expect(store.scales!.projection).toBeTruthy()
    expect(store.scales!.geoPath).toBeTruthy()

    const projected = store.scales!.projectedPoint(-122.4, 37.8)
    expect(projected).not.toBeNull()
    expect(typeof projected![0]).toBe("number")
    expect(isFinite(projected![0])).toBe(true)
    expect(typeof projected![1]).toBe("number")
    expect(isFinite(projected![1])).toBe(true)
  })

  it("supports projection shorthand strings", () => {
    const projections = ["mercator", "equalEarth", "naturalEarth", "equirectangular"] as const
    for (const p of projections) {
      const store = new GeoPipelineStore(makeConfig({ projection: p }))
      store.setPoints(cities)
      store.computeScene({ width: 600, height: 400 })
      expect(store.scales).not.toBeNull()
    }
  })

  it("supports projection config object", () => {
    const store = new GeoPipelineStore(makeConfig({
      projection: { type: "mercator", center: [-100, 40] }
    }))
    store.setPoints(cities)
    store.computeScene({ width: 600, height: 400 })
    expect(store.scales).not.toBeNull()
  })

  it("renders graticule as first node when enabled", () => {
    const store = new GeoPipelineStore(makeConfig({ graticule: true }))
    store.setAreas(usStates)
    store.computeScene({ width: 600, height: 400 })

    // Graticule + 2 areas = 3 nodes
    expect(store.scene.length).toBe(3)
    const grat = store.scene[0]
    expect(isGeoArea(grat)).toBe(true)
    if (!isGeoArea(grat)) throw new Error("Expected graticule geoarea scene node")
    expect(grat.type).toBe("geoarea")
    expect(grat.interactive).toBe(false)
    expect(grat.style.fill).toBe("none")
  })

  it("increments version on each computeScene", () => {
    const store = new GeoPipelineStore(makeConfig())
    store.setPoints(cities)
    store.computeScene({ width: 600, height: 400 })
    expect(store.version).toBe(1)
    store.computeScene({ width: 600, height: 400 })
    expect(store.version).toBe(2)
  })

  it("clears all state", () => {
    const store = new GeoPipelineStore(makeConfig())
    store.setPoints(cities)
    store.setAreas(usStates)
    store.computeScene({ width: 600, height: 400 })
    expect(store.scene.length).toBeGreaterThan(0)

    store.clear()
    expect(store.scene).toEqual([])
    expect(store.scales).toBeNull()
  })

  describe("distance cartogram", () => {
    it("repositions points by cost distance", () => {
      const costCities = [
        { id: "rome", lon: 12.5, lat: 41.9, travelDays: 0 },
        { id: "athens", lon: 23.7, lat: 37.9, travelDays: 5 },
        { id: "london", lon: -0.1, lat: 51.5, travelDays: 30 }
      ]

      const store = new GeoPipelineStore(makeConfig({
        pointIdAccessor: "id",
        projectionTransform: {
          center: "rome",
          centerAccessor: "id",
          costAccessor: "travelDays",
          strength: 1
        }
      }))
      store.setPoints(costCities)
      store.computeScene({ width: 600, height: 400 })

      const points = store.scene.filter(isPoint)
      expect(points.length).toBe(3)

      // Rome should stay at its projected position (center)
      const rome = points.find((p) => p.datum?.id === "rome")
      expect(rome).toBeTruthy()

      // Athens (5 days) should be closer to center than London (30 days)
      const athens = points.find((p) => p.datum?.id === "athens")
      const london = points.find((p) => p.datum?.id === "london")
      expect(athens).toBeTruthy()
      expect(london).toBeTruthy()
      if (!rome || !athens || !london) throw new Error("Expected cartogram point nodes")

      const distAthens = Math.sqrt((athens.x - rome.x) ** 2 + (athens.y - rome.y) ** 2)
      const distLondon = Math.sqrt((london.x - rome.x) ** 2 + (london.y - rome.y) ** 2)

      expect(distAthens).toBeLessThan(distLondon)
    })

    it("strength=0 preserves geographic positions", () => {
      const costCities = [
        { id: "a", lon: 0, lat: 0, cost: 0 },
        { id: "b", lon: 10, lat: 10, cost: 100 }
      ]

      // Geographic positions
      const geoStore = new GeoPipelineStore(makeConfig({ pointIdAccessor: "id" }))
      geoStore.setPoints(costCities)
      geoStore.computeScene({ width: 600, height: 400 })
      const geoPoints = geoStore.scene.filter(isPoint)

      // Cartogram with strength=0
      const cartoStore = new GeoPipelineStore(makeConfig({
        pointIdAccessor: "id",
        projectionTransform: {
          center: "a",
          centerAccessor: "id",
          costAccessor: "cost",
          strength: 0
        }
      }))
      cartoStore.setPoints(costCities)
      cartoStore.computeScene({ width: 600, height: 400 })
      const cartoPoints = cartoStore.scene.filter(isPoint)

      // Positions should be identical when strength=0
      expect(cartoPoints[0].x).toBeCloseTo(geoPoints[0].x, 1)
      expect(cartoPoints[0].y).toBeCloseTo(geoPoints[0].y, 1)
      expect(cartoPoints[1].x).toBeCloseTo(geoPoints[1].x, 1)
      expect(cartoPoints[1].y).toBeCloseTo(geoPoints[1].y, 1)
    })
  })

  describe("streaming", () => {
    it("pushes points via streaming API", () => {
      const store = new GeoPipelineStore(makeConfig())
      store.initStreaming(100)
      store.pushPoint({ lon: -122.4, lat: 37.8 })
      store.pushPoint({ lon: -74.0, lat: 40.7 })
      store.computeScene({ width: 600, height: 400 })

      const points = store.scene.filter(n => n.type === "point")
      expect(points.length).toBe(2)
    })

    it("applies decay to streaming points", () => {
      const store = new GeoPipelineStore(makeConfig({
        decay: { type: "linear", minOpacity: 0.1 }
      }))
      store.initStreaming(10)
      for (let i = 0; i < 5; i++) {
        store.pushPoint({ lon: -120 + i, lat: 37 })
      }
      store.computeScene({ width: 600, height: 400 })

      const points = store.scene.filter(isPoint)
      expect(points.length).toBe(5)

      // Oldest point should have lowest opacity
      expect(points[0]._decayOpacity).toBeLessThan(points[4]._decayOpacity!)
      // Newest should be ~1
      expect(points[4]._decayOpacity).toBeCloseTo(1, 1)
    })
  })

  describe("projectionExtent", () => {
    it("constrains projection to specified bounds", () => {
      const store = new GeoPipelineStore(makeConfig({
        projectionExtent: [[-125, 25], [-65, 50]]  // CONUS bounds
      }))
      store.setPoints(cities)
      store.computeScene({ width: 600, height: 400 })

      expect(store.scales).not.toBeNull()
      const points = store.scene.filter(isPoint)
      expect(points.length).toBe(3)
    })
  })

  // ── Line ingest snapshot semantics ─────────────────────────────────
  // pushLine / pushManyLines mutate `lineData` in place for
  // performance; setLines and getLines must defensive-copy on the
  // boundary so callers can't observe ingest-side mutation on a
  // snapshot they thought was stable, and so push can't leak into
  // a React-owned `lines` prop array.
  describe("line ingest snapshot semantics", () => {
    it("setLines defensive-copies the input so push doesn't leak", () => {
      const store = new GeoPipelineStore(makeConfig({ lineIdAccessor: "id" }))
      const userArray = [{ id: "a", coordinates: [[0, 0], [1, 1]] }]
      store.setLines(userArray)
      store.pushLine({ id: "b", coordinates: [[2, 2], [3, 3]] })
      // User's original array must remain length-1.
      expect(userArray).toHaveLength(1)
      // Store's internal data has both.
      expect(store.getLines()).toHaveLength(2)
    })

    it("getLines returns a snapshot — push doesn't mutate prior reads", () => {
      const store = new GeoPipelineStore(makeConfig({ lineIdAccessor: "id" }))
      store.pushLine({ id: "a", coordinates: [[0, 0], [1, 1]] })
      const snapshot = store.getLines()
      expect(snapshot).toHaveLength(1)
      store.pushLine({ id: "b", coordinates: [[2, 2], [3, 3]] })
      // Prior snapshot stays length-1; the new push is visible only
      // on a fresh getLines() call.
      expect(snapshot).toHaveLength(1)
      expect(store.getLines()).toHaveLength(2)
    })

    it("pushManyLines appends and increments version", () => {
      const store = new GeoPipelineStore(makeConfig({ lineIdAccessor: "id" }))
      const v0 = store.version
      store.pushManyLines([
        { id: "a", coordinates: [[0, 0], [1, 1]] },
        { id: "b", coordinates: [[2, 2], [3, 3]] },
      ])
      expect(store.getLines()).toHaveLength(2)
      expect(store.version).toBeGreaterThan(v0)
    })

    it("removeLine filters by id and bumps version", () => {
      const store = new GeoPipelineStore(makeConfig({ lineIdAccessor: "id" }))
      store.pushManyLines([
        { id: "a", coordinates: [[0, 0], [1, 1]] },
        { id: "b", coordinates: [[2, 2], [3, 3]] },
        { id: "c", coordinates: [[4, 4], [5, 5]] },
      ])
      const removed = store.removeLine("b")
      expect(removed).toHaveLength(1)
      expect(removed[0].id).toBe("b")
      expect(store.getLines()).toHaveLength(2)
    })

    it("removeLine throws when lineIdAccessor isn't configured", () => {
      const store = new GeoPipelineStore(makeConfig())
      store.pushLine({ id: "a", coordinates: [[0, 0], [1, 1]] })
      expect(() => store.removeLine("a")).toThrow(/lineIdAccessor/)
    })
  })

  describe("transition enter-fade", () => {
    it("fades in points that enter on a data change, leaving existing points opaque", () => {
      const store = new GeoPipelineStore(makeConfig({
        pointIdAccessor: "id",
        transition: { duration: 300 },
        introAnimation: false
      }))
      // First render settles two points at full opacity — no intro animation,
      // and no previous scene to transition from.
      store.setPoints([
        { id: "a", lon: -100, lat: 40 },
        { id: "b", lon: -80, lat: 35 }
      ])
      store.computeScene({ width: 600, height: 400 })

      // Second render adds "c" — it should enter by fading in from opacity 0.
      store.setPoints([
        { id: "a", lon: -100, lat: 40 },
        { id: "b", lon: -80, lat: 35 },
        { id: "c", lon: -120, lat: 45 }
      ])
      store.computeScene({ width: 600, height: 400 })

      const findPoint = (id: string) =>
        store.scene.find(
          (n): n is PointSceneNode => n.type === "point" && n.pointId === id
        )

      const pointC = findPoint("c")
      expect(pointC).toBeDefined()
      // Entering point starts transparent with a positive opacity target.
      expect(pointC!.style?.opacity).toBe(0)
      const target = pointC!._targetOpacity
      expect(target).toBeGreaterThan(0)

      // Pre-existing points are not "entering" — they carry no enter-fade target.
      expect(findPoint("a")!._targetOpacity).toBeUndefined()

      // Completing the transition restores the target opacity and clears state.
      const done = store.advanceTransition(performance.now() + 1000)
      expect(done).toBe(false)
      const pointCDone = findPoint("c")
      expect(pointCDone!.style?.opacity).toBe(target)
      expect(pointCDone!._targetOpacity).toBeUndefined()
    })
  })
})
