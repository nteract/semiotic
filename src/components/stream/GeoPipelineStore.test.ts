import { describe, it, expect, vi } from "vitest"
import { GeoPipelineStore } from "./GeoPipelineStore"
import type { GeoPipelineConfig } from "./geoTypes"

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

    const node = store.scene[0] as any
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

    const points = store.scene.filter(n => n.type === "point")
    expect(points.length).toBe(3)

    const sf = points[0] as any
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

    const lines = store.scene.filter(n => n.type === "line")
    expect(lines.length).toBe(1)

    const route = lines[0] as any
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
    const grat = store.scene[0] as any
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

      const points = store.scene.filter(n => n.type === "point") as any[]
      expect(points.length).toBe(3)

      // Rome should stay at its projected position (center)
      const rome = points.find((p: any) => p.datum.id === "rome")
      expect(rome).toBeTruthy()

      // Athens (5 days) should be closer to center than London (30 days)
      const athens = points.find((p: any) => p.datum.id === "athens")
      const london = points.find((p: any) => p.datum.id === "london")

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
      const geoPoints = geoStore.scene.filter(n => n.type === "point") as any[]

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
      const cartoPoints = cartoStore.scene.filter(n => n.type === "point") as any[]

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

      const points = store.scene.filter(n => n.type === "point") as any[]
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
      const points = store.scene.filter(n => n.type === "point") as any[]
      expect(points.length).toBe(3)
    })
  })
})
