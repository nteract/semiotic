import { describe, expect, it } from "vitest"
import { geoEquirectangular, geoPath } from "d3-geo"
import { renderToStaticMarkup } from "react-dom/server"
import {
  isometricLandmarkLayout,
  selectIsometricLandmarks,
  type IsometricLandmarkConfig,
} from "./isometricLandmarks"

const center = { lon: 2.3522, lat: 48.8566 }
const config: IsometricLandmarkConfig = {
  center,
  centerId: "paris",
  gridSize: 5,
  gridRadiusKm: 75,
}
const points = [
  { id: "paris", name: "Paris", kind: "city", ...center },
  { id: "north", name: "North Museum", kind: "culture", lon: 2.35, lat: 49.35 },
  { id: "east", name: "East Castle", kind: "defense", lon: 3.08, lat: 48.86 },
  { id: "outside", name: "Outside", kind: "arena", lon: 5.5, lat: 51 },
]

describe("isometricLandmarkLayout", () => {
  it("builds an odd square grid and forces the configured center", () => {
    const tiles = selectIsometricLandmarks(points, config)
    expect(tiles).toHaveLength(25)
    expect(tiles.find((tile) => tile.row === 2 && tile.column === 2)?.landmark?.id)
      .toBe("paris")
    expect(tiles.some((tile) => tile.landmark?.id === "outside")).toBe(false)
  })

  it("emits interactive diamond nodes and a sprite overlay", () => {
    const projection = geoEquirectangular()
      .fitExtent([[0, 0], [400, 240]], {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [center.lon, center.lat] },
      })
    const result = isometricLandmarkLayout({
      areas: [],
      points,
      lines: [],
      scales: {
        projection,
        geoPath: geoPath(projection),
        projectedPoint: (lon, lat) => projection([lon, lat]) as [number, number],
        invertedPoint: (x, y) => projection.invert?.([x, y]) as [number, number],
      },
      dimensions: {
        width: 500,
        height: 320,
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        plot: { x: 0, y: 0, width: 500, height: 320 },
      },
      theme: { semantic: {}, categorical: [] },
      resolveColor: () => "#000",
      config: {
        ...config,
        terrainByCell: {
          "tile-0-0": { kind: "ocean", coverage: 0.75 },
        },
      },
      selection: null,
    })

    expect(result.nodes).toHaveLength(25)
    expect(result.nodes?.every((node) => node.type === "geoarea")).toBe(true)
    expect(result.nodes?.every((node) => node.type !== "geoarea" || node.pathData.endsWith("Z"))).toBe(true)
    expect(result.nodes?.[0].style.fill).toBe("#4d8192")
    expect(result.nodes?.[0].datum?.terrainKind).toBe("ocean")
    expect(result.overlays).toBeTruthy()
    expect(result.restyle).toBeTypeOf("function")
  })

  it("retains every feature in a cell and renders an additional-count badge", () => {
    const crowdedPoints = [
      points[0],
      { id: "museum-a", name: "Museum A", kind: "culture", lon: 2.36, lat: 48.86 },
      { id: "museum-b", name: "Museum B", kind: "culture", lon: 2.37, lat: 48.85 },
    ]
    const tiles = selectIsometricLandmarks(crowdedPoints, config)
    const centerTile = tiles.find((tile) => tile.row === 2 && tile.column === 2)

    expect(centerTile?.landmark?.id).toBe("paris")
    expect(centerTile?.landmarks).toHaveLength(3)

    const result = isometricLandmarkLayout({
      areas: [],
      points: crowdedPoints,
      lines: [],
      scales: {
        projection: geoEquirectangular(),
        geoPath: geoPath(geoEquirectangular()),
        projectedPoint: () => [0, 0],
        invertedPoint: () => [0, 0],
      },
      dimensions: {
        width: 500,
        height: 320,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        plot: { x: 0, y: 0, width: 500, height: 320 },
      },
      theme: { semantic: {}, categorical: [] },
      resolveColor: () => "#000",
      config,
      selection: null,
    })
    const centerNode = result.nodes?.find((node) =>
      node.type === "geoarea" && node.datum?.id === "paris"
    )
    expect(centerNode?.datum?.features).toHaveLength(3)
    expect(renderToStaticMarkup(<>{result.overlays}</>)).toContain("+2")
  })

  it("increases grid density at higher detail levels", () => {
    expect(selectIsometricLandmarks(points, { ...config, gridSize: 3 })).toHaveLength(9)
    expect(selectIsometricLandmarks(points, { ...config, gridSize: 9 })).toHaveLength(81)
  })

  it("uses candidate priority before proximity when choosing a cell icon", () => {
    const sameCell = [
      points[0],
      {
        id: "nearby-museum",
        name: "Nearby Museum",
        kind: "culture",
        lon: 2.7,
        lat: 48.86,
      },
      {
        id: "interesting-city",
        name: "Interesting City",
        kind: "city",
        lon: 2.8,
        lat: 48.87,
      },
    ]
    const tiles = selectIsometricLandmarks(sameCell, {
      ...config,
      candidatePriorityAccessor: (datum) => datum.kind === "city" ? 0 : 100,
    })
    const occupied = tiles.find((tile) =>
      tile.landmarks.some((landmark) => landmark.id === "interesting-city")
    )

    expect(occupied?.landmark?.id).toBe("interesting-city")
  })
})
