import { describe, expect, it } from "vitest"
import {
  geoContains,
  geoEquirectangular,
  geoPath,
} from "d3-geo"
import {
  geographicDotGridLayout,
  sampleGeographicDotGrid,
} from "./geographicDotGrid"

const rectangle: GeoJSON.Feature = {
  type: "Feature",
  id: "sample-land",
  properties: { name: "Sample Land", group: "west" },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [-30, -18],
      [-30, 18],
      [30, 18],
      [30, -18],
      [-30, -18],
    ]],
  },
}

function context(config = {}) {
  const projection = geoEquirectangular().fitExtent(
    [[12, 12], [388, 208]],
    rectangle
  )
  const path = geoPath(projection)
  return {
    areas: [rectangle],
    points: [],
    lines: [],
    scales: {
      projection,
      geoPath: path,
      projectedPoint: (lon: number, lat: number) =>
        projection([lon, lat]) as [number, number],
      invertedPoint: (x: number, y: number) =>
        projection.invert?.([x, y]) as [number, number],
    },
    dimensions: {
      width: 400,
      height: 220,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      plot: { x: 0, y: 0, width: 400, height: 220 },
    },
    theme: {
      semantic: {},
      categorical: ["#37d5d3", "#ee7b55"],
    },
    resolveColor: (key: string) => key === "west" ? "#37d5d3" : "#ee7b55",
    config,
    selection: null,
  }
}

describe("sampleGeographicDotGrid", () => {
  it("retains only lattice centers inside the geographic mask", () => {
    const ctx = context()
    const sampled = sampleGeographicDotGrid(
      ctx.areas,
      ctx.scales,
      ctx.dimensions,
      { columns: 24 }
    )

    expect(sampled.dots.length).toBeGreaterThan(100)
    expect(sampled.dots.every((dot) =>
      geoContains(rectangle, [dot.longitude, dot.latitude])
    )).toBe(true)
    expect(new Set(sampled.dots.map((dot) =>
      `${dot.gridRow}:${dot.gridColumn}`
    )).size).toBe(sampled.dots.length)
    expect(sampled.dots[0].featureId).toBe("sample-land")
    expect(sampled.dots[0].name).toBe("Sample Land")
  })

  it("honors feature and dot filters", () => {
    const ctx = context()
    const excluded = sampleGeographicDotGrid(
      ctx.areas,
      ctx.scales,
      ctx.dimensions,
      { featureFilter: () => false }
    )
    const checkerboard = sampleGeographicDotGrid(
      ctx.areas,
      ctx.scales,
      ctx.dimensions,
      { cellSize: 12, dotFilter: (dot) => (dot.gridRow + dot.gridColumn) % 2 === 0 }
    )

    expect(excluded.dots).toHaveLength(0)
    expect(checkerboard.dots.length).toBeGreaterThan(0)
    expect(checkerboard.dots.every((dot) =>
      (dot.gridRow + dot.gridColumn) % 2 === 0
    )).toBe(true)
  })

  it("coarsens unsafe density requests with the maxSamples guard", () => {
    const ctx = context()
    const sampled = sampleGeographicDotGrid(
      ctx.areas,
      ctx.scales,
      ctx.dimensions,
      { cellSize: 1, maxSamples: 500 }
    )

    expect(sampled.cellSize).toBeGreaterThanOrEqual(2)
    expect(sampled.dots.length).toBeLessThanOrEqual(500)
  })
})

describe("geographicDotGridLayout", () => {
  it("emits native point nodes with stable lattice identities", () => {
    const result = geographicDotGridLayout(context({
      columns: 20,
      categoryAccessor: "group",
    }))

    expect(result.nodes?.length).toBeGreaterThan(50)
    expect(result.nodes?.every((node) => node.type === "point")).toBe(true)
    expect(result.nodes?.[0].style.fill).toBe("#37d5d3")
    expect(result.nodes?.[0]).toHaveProperty("pointId")
    expect(result.restyle).toBeTypeOf("function")
  })

  it("supports square and hexagon samples plus optional outlines", () => {
    for (const shape of ["square", "hexagon"] as const) {
      const result = geographicDotGridLayout(context({
        columns: 18,
        shape,
        showOutline: true,
      }))
      expect(result.nodes?.every((node) => node.type === "geoarea")).toBe(true)
      expect(result.overlays).toBeTruthy()
    }
  })

  it("reuses the sampled mask when only visual mark geometry changes", () => {
    let filterCalls = 0
    const featureFilter = () => {
      filterCalls += 1
      return true
    }
    const ctx = context({
      columns: 22,
      featureFilter,
      shape: "circle",
    })
    const circles = geographicDotGridLayout(ctx)
    const callsAfterSampling = filterCalls
    const squares = geographicDotGridLayout({
      ...ctx,
      config: { ...ctx.config, shape: "square" },
    })

    expect(callsAfterSampling).toBeGreaterThan(0)
    expect(filterCalls).toBe(callsAfterSampling)
    expect(circles.nodes?.every((node) => node.type === "point")).toBe(true)
    expect(squares.nodes?.every((node) => node.type === "geoarea")).toBe(true)

    geographicDotGridLayout({
      ...ctx,
      dimensions: {
        ...ctx.dimensions,
        width: ctx.dimensions.width + 20,
        plot: { ...ctx.dimensions.plot, width: ctx.dimensions.plot.width + 20 },
      },
    })
    expect(filterCalls).toBeGreaterThan(callsAfterSampling)
  })
})
