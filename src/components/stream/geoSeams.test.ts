import { extractGeoNavPoints } from "./geoKeyboardNavigation"
import { describe, expect, it } from "vitest"
import { geoContains, geoEquirectangular, geoEqualEarth, geoMercator, geoPath } from "d3-geo"
import { zoomIdentity } from "d3-zoom"
import { GeoPipelineStore } from "./GeoPipelineStore"
import { applyDistanceCartogram } from "./geoCartogram"
import { buildBuiltInGeoScene } from "./geoSceneBuilder"
import { findNearestGeoNode } from "./GeoCanvasHitTester"
import type { GeoPipelineConfig } from "./geoTypes"

const size = { width: 600, height: 320 }
const route = {
  name: "Pacific crossing",
  coordinates: [
    { lon: 168, lat: 12 },
    { lon: -164, lat: 14 }
  ]
}
const styles = ["basic", "arc", "offset"] as const
const lineTypes = ["geo", "line"] as const
const hitContext = document.createElement("canvas").getContext("2d")!

describe("geographic route styling at the clip extent", () => {
  const extent: [[number, number], [number, number]] = [[100, 100], [500, 250]]
  it.each([
    { flowStyle: "offset" as const, ends: [[99, 130], [99, 200]], hit: [102, 165] },
    { flowStyle: "arc" as const, ends: [[200, 99], [400, 99]], hit: [300, 129] }
  ])("clips the $flowStyle after it enters the rectangle", ({ flowStyle, ends, hit }) => {
    const projection = geoEquirectangular().translate([300, 160]).scale(200).clipExtent(extent)
    const coordinates = ends.map(([x, y]) => {
      const [lon, lat] = projection.invert!([x, y])!
      return { lon, lat }
    })
    const datum = { coordinates }
    const lines = buildBuiltInGeoScene({
      projection, path: geoPath(projection), areas: [], points: [], lines: [datum], layout: size,
      config: { projection, lineType: "line", flowStyle, lineStyle: () => ({ strokeWidth: 4 }) }
    }).filter(node => node.type === "line")
    expect(lines).toHaveLength(1)
    expect(findNearestGeoNode(lines, hit[0], hit[1], 1, hitContext)?.node.datum).toBe(datum)
    expect(lines[0].path.every(([x, y]) => x >= 100 && x <= 500 && y >= 100 && y <= 250)).toBe(true)
    expect(extractGeoNavPoints(lines).map(point => point.datum)).toEqual([datum])
    expect(projection.clipExtent()).toEqual(extent)
  })
})

for (const [name, createProjection] of [
  ["equirectangular", geoEquirectangular],
  ["equalEarth", geoEqualEarth]
] as const) {
  describe(name, () => {
    const projection = createProjection().fitExtent(
      [
        [10, 10],
        [590, 310]
      ],
      { type: "Sphere" }
    )
    function scene(config: Partial<GeoPipelineConfig>, data = [route]) {
      return buildBuiltInGeoScene({
        projection,
        path: geoPath(projection),
        layout: size,
        lines: data,
        areas: [],
        points: [],
        config: { projection, ...config }
      }).filter((node) => node.type === "line")
    }
    for (const lineType of lineTypes) {
      for (const flowStyle of styles) {
        it(`clips ${lineType} / ${flowStyle} into two hittable fragments and one keyboard stop`, () => {
          const lines = scene({ lineType, flowStyle })
          expect(lines).toHaveLength(2)
          const fragments = lines.map((line) => {
            const x = line.path.map(([x]) => x)
            expect(Math.max(...x) - Math.min(...x)).toBeLessThan(60)
            const a = line.path[0],
              b = line.path[1]
            const hit = findNearestGeoNode(
              lines,
              (a[0] + b[0]) / 2,
              (a[1] + b[1]) / 2,
              2,
              hitContext
            )
            expect(hit?.node.datum).toBe(route)
            return x[0]
          })
          expect(Math.min(...fragments)).toBeLessThan(120)
          expect(Math.max(...fragments)).toBeGreaterThan(480)
          expect(
            findNearestGeoNode(lines, ...projection([0, 13])!, 8, hitContext)
          ).toBeNull()
          const stops = extractGeoNavPoints(lines)
          expect(stops).toHaveLength(1)
          expect(stops[0].datum).toBe(route)
          expect(
            findNearestGeoNode(lines, stops[0].x, stops[0].y, 1, hitContext)
              ?.node.datum
          ).toBe(route)
        })
      }
    }
    it.each(lineTypes)(
      "keeps a route beginning exactly on the seam keyboard-accessible (%s)",
      (lineType) => {
        const data = {
          name: "Boundary route",
          coordinates: [
            { lon: 180, lat: 0 },
            { lon: -160, lat: 0 }
          ]
        }
        const precision = projection.precision()
        const lines = scene({ lineType }, [data])
        expect(projection.precision()).toBe(precision)
        expect(lines).toHaveLength(1)
        expect(extractGeoNavPoints(lines).map((point) => point.datum)).toEqual([
          data
        ])
      }
    )
    it.each([10, -25])("keeps the projected chord across 180° at latitude %s", lat => {
      const coordinates = [{ lon: -90, lat }, { lon: 90, lat }]
      const datum = { name: "Half-turn", coordinates }
      const lines = scene({ lineType: "line" }, [datum])
      const endpoints = coordinates.map(({ lon, lat }) => projection([lon, lat])!)
      expect(lines.map(line => line.path)).toEqual([endpoints])
      const [x, y] = projection([0, lat])!
      expect(findNearestGeoNode(lines, x, y, 1, hitContext)?.node.datum).toBe(datum)
      const [stop] = extractGeoNavPoints(lines)
      expect(stop.y).toBeCloseTo(y)
      expect(findNearestGeoNode(lines, stop.x, stop.y, 1, hitContext)?.node.datum).toBe(datum)
    })

    it("keeps an ordinary long straight route and its intermediate vertices", () => {
      const coordinates = [
        { lon: -130, lat: 2 },
        { lon: 8, lat: -10 },
        { lon: 55, lat: 10 }
      ]
      const [line] = scene({ lineType: "line" }, [
        { name: "Continental", coordinates }
      ])
      expect(line.path).toEqual(
        coordinates.map(({ lon, lat }) => projection([lon, lat]))
      )
    })
  })
}

it("clips polar stations to the same Mercator extent as areas and routes", () => {
  const projection = geoMercator().fitSize([600, 320], { type: "Sphere" })
  const points = [-89, -72, 72, 89].map((lat) => ({ lon: 0, lat }))
  const scene = buildBuiltInGeoScene({
    projection,
    path: geoPath(projection),
    layout: size,
    lines: [],
    areas: [],
    points,
    config: { projection }
  })
  expect(scene.map((node) => node.datum)).toEqual([points[1], points[2]])
  expect(extractGeoNavPoints(scene).map((point) => point.datum)).toEqual([
    points[2],
    points[1]
  ])
})

it.each(lineTypes)("keeps a visible keyboard target after panning and zooming a %s route", lineType => {
  for (const zoom of [1, 1.25]) {
    const projection = geoEquirectangular().scale(zoom * 600 / (2 * Math.PI)).translate([500, 160])
    const lines = buildBuiltInGeoScene({
      projection, path: geoPath(projection), layout: size,
      lines: [route], areas: [], points: [], config: { projection, lineType }
    }).filter(node => node.type === "line")
    const stops = extractGeoNavPoints(lines)
    expect(stops).toHaveLength(1)
    const [stop] = stops
    expect(stop.x).toBeGreaterThan(0)
    expect(stop.x).toBeLessThan(size.width)
    expect(findNearestGeoNode(lines, stop.x, stop.y, 1, hitContext)?.node.datum).toBe(route)
  }
})

it.each([1, 1.25])("anchors a wrapped area in the visible part of a panned map at zoom %s", zoom => {
  const projection = geoEquirectangular().scale(zoom * 600 / (2 * Math.PI)).translate([500, 160])
  const feature: GeoJSON.Feature = { type: "Feature", properties: { name: "Islands" }, geometry: {
    type: "Polygon", coordinates: [[[160, -10], [160, 10], [-162, 10], [-162, -10], [160, -10]]]
  } }
  const areas = buildBuiltInGeoScene({
    config: { projection }, projection, path: geoPath(projection), layout: size, areas: [feature], points: [], lines: []
  })
  const stops = extractGeoNavPoints(areas)
  expect(stops).toHaveLength(1)
  expect(Math.abs(stops[0].x - (500 - zoom * 285))).toBeLessThan(0.5)
  expect(geoContains(feature, projection.invert!([stops[0].x, stops[0].y])!)).toBe(true)
})

it("retains an authored polar waypoint between two visible cartogram stations", () => {
  const projection = geoMercator().fitExtent([[0, 0], [600, 320]], { type: "Sphere" })
  const points = [{ id: "a", lon: -20, lat: 70 }, { id: "b", lon: 20, lat: 70, cost: 1 }]
  const polar = { source: "a", target: "b", coordinates: [points[0], { lon: 0, lat: 89 }, points[1]] }
  const transform = { center: "a", costAccessor: "cost", strength: 0.5, lineMode: "fractional" as const }
  const scene = buildBuiltInGeoScene({ projection, path: geoPath(projection), layout: size,
    areas: [], points, lines: [polar], config: { projection, pointIdAccessor: "id", projectionTransform: transform, lineType: "line" } })
  applyDistanceCartogram(scene, transform, size, 0)
  const route = scene.find(node => node.type === "line")!
  const [start, end] = scene.filter(node => node.type === "point")
  const waypoint = projection([0, 89])!
  const original = projection([-20, 70])!
  expect(route.path).toHaveLength(3)
  expect(route.path[1][1]).toBeCloseTo(waypoint[1] + (start.y + end.y) / 2 - original[1])
})

it("clips the fallback map when a configured radial transform is skipped", () => {
  const store = new GeoPipelineStore({
    projection: "equirectangular", pointIdAccessor: "id",
    projectionTransform: { center: "source", costAccessor: "cost", strength: 0 }
  })
  store.setPoints([{ id: "source", lon: 168, lat: 0, cost: 0 }, { id: "dest", lon: -164, lat: 0, cost: 2 }])
  store.setLines([route])
  store.computeScene(size)
  const proj = store.scales!.projection
  const zoom = 600 / (2 * Math.PI * proj.scale())
  const [x, y] = proj.translate()
  store.applyZoomTransform(zoomIdentity.translate(500 - x * zoom, 160 - y * zoom).scale(zoom), size)
  expect(store.cartogramLayout).toBeNull()
  const stops = extractGeoNavPoints(store.scene.filter(node => node.type === "line"))
  expect(stops).toHaveLength(1)
  expect(stops[0].x).toBeGreaterThan(0)
  expect(stops[0].x).toBeLessThan(size.width)
})

it.each(lineTypes)("retains a fully clipped %s route between repositioned polar stations", lineType => {
  const points = [{ id: "a", lon: 0, lat: 88, cost: 0 }, { id: "b", lon: 20, lat: 89, cost: 4 }]
  const polar = { source: "a", target: "b", coordinates: [points[0], { lon: 7, lat: 88.7 }, points[1]] }
  const projection = geoMercator().fitSize([size.width, size.height], { type: "Sphere" })
  const input = { projection, path: geoPath(projection), layout: size, areas: [], points, lines: [polar] }
  const config = { projection, pointIdAccessor: "id", lineType }
  expect(buildBuiltInGeoScene({ ...input, config }).filter(node => node.type === "line")).toEqual([])
  const transform = { center: "a", costAccessor: "cost", layout: "strip", lineMode: "fractional" } as const
  const scene = buildBuiltInGeoScene({ ...input, config: { ...config, projectionTransform: transform } })
  expect(applyDistanceCartogram(scene, transform, size, 0)?.layout).toBe("strip")
  const line = scene.find(node => node.type === "line")!
  const stations = scene.filter(node => node.type === "point")
  expect(line.path[0]).toEqual([stations[0].x, stations[0].y])
  expect(line.path.at(-1)).toEqual([stations[1].x, stations[1].y])
  expect(line.path.length).toBeGreaterThan(2)
  const [stop] = extractGeoNavPoints([line])
  expect(stop.datum).toBe(polar)
  expect(findNearestGeoNode([line], stop.x, stop.y, 1, hitContext)?.node.datum).toBe(polar)
})

it("includes polar sources when the cartogram can reposition them", () => {
  const data = [{ id: "center", lon: 0, lat: 89, cost: 0 }, { id: "dest", lon: 20, lat: 0, cost: 4 }]
  const store = new GeoPipelineStore({
    projection: "mercator", pointIdAccessor: "id",
    projectionTransform: { center: "center", costAccessor: "cost", layout: "strip" }
  })
  store.setPoints(data)
  store.computeScene(size)
  expect(store.cartogramLayout?.layout).toBe("strip")
  const targets = extractGeoNavPoints(store.scene)
  expect(targets.map(stop => stop.datum)).toEqual(data)
  for (const point of targets) {
    expect(point.x).toBeGreaterThanOrEqual(0)
    expect(point.x).toBeLessThanOrEqual(size.width)
    expect(point.y).toBeGreaterThanOrEqual(0)
    expect(point.y).toBeLessThanOrEqual(size.height)
  }
})

describe("styled routes at the edge of the viewport", () => {
  const projection = geoEquirectangular()
    .scale(600 / (2 * Math.PI))
    .translate([300, 160])
  const steep = {
    source: "a",
    target: "b",
    coordinates: [
      { lon: 179, lat: -75 },
      { lon: -179, lat: 75 }
    ]
  }
  const points = steep.coordinates.map((p, i) => ({
    ...p,
    id: i ? "b" : "a",
    cost: i
  }))
  const scene = (flowStyle: GeoPipelineConfig["flowStyle"]) =>
    buildBuiltInGeoScene({
      projection,
      path: geoPath(projection),
      layout: size,
      lines: [steep],
      points,
      areas: [],
      config: { projection, flowStyle, lineType: "line", pointIdAccessor: "id" }
    })
  it.each(["arc", "offset"] as const)(
    "clips the final %s stroke and keeps one visible keyboard target",
    (flowStyle) => {
      const lines = scene(flowStyle).filter((node) => node.type === "line")
      expect(lines.length).toBeGreaterThan(0)
      for (const line of lines)
        for (const [x, y] of line.path) {
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThanOrEqual(600)
          expect(y).toBeGreaterThanOrEqual(0)
          expect(y).toBeLessThanOrEqual(320)
        }
      const stops = extractGeoNavPoints(lines)
      expect(stops).toHaveLength(1)
      expect(
        findNearestGeoNode(lines, stops[0].x, stops[0].y, 1, hitContext)?.node
          .datum
      ).toBe(steep)
    }
  )
  it.each(["straight", "fractional"] as const)(
    "reattaches one complete %s cartogram edge across the date line",
    (lineMode) => {
      const nodes = scene("basic")
      expect(nodes.filter((node) => node.type === "line")).toHaveLength(2)
      applyDistanceCartogram(
        nodes,
        { center: "a", costAccessor: "cost", layout: "strip", lineMode },
        size,
        0
      )
      const lines = nodes.filter((node) => node.type === "line")
      expect(lines).toHaveLength(1)
      const [start, end] = nodes.filter((node) => node.type === "point")
      expect(lines[0].path[0]).toEqual([start.x, start.y])
      expect(lines[0].path.at(-1)).toEqual([end.x, end.y])
      expect(lines[0].style._edgeFade).toBeFalsy()
      if (lineMode === "fractional")
        expect(lines[0].path.length).toBeGreaterThan(2)
    }
  )
})
