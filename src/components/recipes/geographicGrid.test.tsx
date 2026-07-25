import { describe, expect, it } from "vitest"
import { geoEquirectangular, geoPath } from "d3-geo"
import { renderToStaticMarkup } from "react-dom/server"
import {
  geographicGridLayout,
  gridifyGeographicPoints,
} from "./geographicGrid"

const projection = geoEquirectangular()
const scales = {
  projection,
  geoPath: geoPath(projection),
  projectedPoint: (lon: number, lat: number) =>
    projection([lon, lat]) as [number, number],
  invertedPoint: (x: number, y: number) =>
    projection.invert?.([x, y]) as [number, number],
}

function context(config = {}, points = [
  { id: "WA", name: "Washington", abbr: "WA", row: 0, column: 0, region: "West", value: 2 },
  { id: "ME", name: "Maine", abbr: "ME", row: 0, column: 4, region: "Northeast", value: 8 },
  { id: "TX", name: "Texas", abbr: "TX", row: 3, column: 2, region: "South", value: 20 },
]) {
  return {
    areas: [],
    points,
    lines: [],
    scales,
    dimensions: {
      width: 500,
      height: 260,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      plot: { x: 0, y: 0, width: 500, height: 260 },
    },
    theme: {
      semantic: {},
      categorical: ["#457b9d", "#e76f51", "#2a9d8f"],
    },
    resolveColor: (key: string) =>
      ({ West: "#457b9d", Northeast: "#e76f51", South: "#2a9d8f" })[key]
      ?? "#999999",
    config: {
      rowAccessor: "row",
      columnAccessor: "column",
      idAccessor: "id",
      labelAccessor: "abbr",
      categoryAccessor: "region",
      ...config,
    },
    selection: null,
  }
}

describe("gridifyGeographicPoints", () => {
  it("assigns unique cells, preserves input order, and keeps broad direction", () => {
    const points = [
      { datum: { id: "nw" }, x: -120, y: -45 },
      { datum: { id: "ne" }, x: 120, y: -40 },
      { datum: { id: "sw" }, x: -110, y: 40 },
      { datum: { id: "se" }, x: 115, y: 45 },
      { datum: { id: "center" }, x: 0, y: 0 },
    ]
    const result = gridifyGeographicPoints(points, {
      columns: 4,
      rows: 3,
    })
    const cells = new Set(result.map((point) => `${point.row}:${point.column}`))

    expect(result.map((point) => point.datum.id)).toEqual(
      points.map((point) => point.datum.id)
    )
    expect(cells.size).toBe(points.length)
    expect(result[0].column).toBeLessThan(result[1].column)
    expect(result[0].row).toBeLessThan(result[2].row)
  })

  it("expands undersized explicit grids instead of dropping data", () => {
    const result = gridifyGeographicPoints(
      Array.from({ length: 7 }, (_, index) => ({
        datum: { id: index },
        x: index,
        y: index,
      })),
      { columns: 2, rows: 2 }
    )
    expect(result).toHaveLength(7)
    expect(Math.max(...result.map((point) => point.row))).toBeGreaterThan(1)
  })
})

describe("geographicGridLayout", () => {
  it("emits labelled, accessible circle nodes from an authored table", () => {
    const result = geographicGridLayout(context())

    expect(result.nodes).toHaveLength(3)
    expect(result.nodes?.every((node) => node.type === "point")).toBe(true)
    expect(result.nodes?.map((node) =>
      node.type === "point" ? node.pointId : null
    )).toEqual(["WA", "ME", "TX"])
    expect(result.nodes?.[0].style.fill).toBe("#457b9d")
    expect(renderToStaticMarkup(<>{result.overlays}</>)).toContain(">WA<")
    expect(result.restyle).toBeTypeOf("function")
  })

  it("supports square and hexagonal cartogram cells", () => {
    for (const shape of ["square", "hexagon"] as const) {
      const result = geographicGridLayout(context({ shape }))
      expect(result.nodes?.every((node) => node.type === "geoarea")).toBe(true)
      expect(result.nodes?.every((node) =>
        node.type === "geoarea" && node.pathData.endsWith("Z")
      )).toBe(true)
    }
  })

  it("uses square-root scaling so area, not radius, follows values", () => {
    const result = geographicGridLayout(context({
      sizeAccessor: "value",
      sizeDomain: [0, 20],
      sizeRange: [0, 1],
    }))
    const radii = result.nodes?.map((node) =>
      node.type === "point" ? node.r : 0
    ) ?? []

    expect(radii[2]).toBeGreaterThan(radii[1])
    expect(radii[1]).toBeGreaterThan(radii[0])
  })

  it("gridifies area centroids without requiring authored row/column fields", () => {
    const areas: GeoJSON.Feature[] = [
      {
        type: "Feature",
        id: "west",
        properties: { name: "West" },
        geometry: {
          type: "Polygon",
          coordinates: [[[-120, 20], [-120, 40], [-90, 40], [-90, 20], [-120, 20]]],
        },
      },
      {
        type: "Feature",
        id: "east",
        properties: { name: "East" },
        geometry: {
          type: "Polygon",
          coordinates: [[[60, 20], [60, 40], [100, 40], [100, 20], [60, 20]]],
        },
      },
    ]
    const result = geographicGridLayout({
      ...context({ source: "areas", columns: 4, rows: 2 }),
      areas,
      points: [],
    })

    expect(result.nodes).toHaveLength(2)
    const x = result.nodes?.map((node) =>
      node.type === "point" ? node.x : node.centroid[0]
    ) ?? []
    expect(x[0]).toBeLessThan(x[1])
  })
})
