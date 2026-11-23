import { createElement } from "react"
import type { StreamGeoFrameProps } from "../../src/components/stream/geoTypes"

export function seamProps(
  projection: "equirectangular" | "equalEarth",
  width: number
): StreamGeoFrameProps {
  return {
    projection,
    size: [width, 300],
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    fitPadding: 0.07,
    description: "Pacific routes and polar stations",
    areas: [
      {
        type: "Feature",
        properties: { name: "Pacific reserve" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [160, -30],
              [160, -10],
              [-162, -10],
              [-162, -30],
              [160, -30]
            ]
          ]
        }
      }
    ],
    lines: [
      {
        name: "Pacific crossing",
        coordinates: [
          { lon: 158, lat: 28 },
          { lon: -154, lat: 35 }
        ]
      }
    ],
    points: [
      { name: "North station", lon: -38, lat: 83 },
      { name: "South station", lon: 54, lat: -83 }
    ],
    areaStyle: () => ({ fill: "#23865a" }),
    lineStyle: () => ({ stroke: "#bf3c18", strokeWidth: 4 }),
    pointStyle: () => ({ fill: "#2435aa", r: 6 }),
    enableHover: true,
    tooltipContent: (d) =>
      createElement(
        "span",
        { "data-x": d.x, "data-y": d.y },
        String(d.data?.properties?.name ?? d.data?.name)
      )
  }
}

export function steepRouteProps(
  view: "arc" | "cartogram",
  width: number
): StreamGeoFrameProps {
  const coords = [
    { id: "west", lon: 179, lat: -75, cost: 0 },
    { id: "east", lon: -179, lat: 75, cost: 10 }
  ]
  return {
    ...seamProps("equirectangular", width),
    fitPadding: 0,
    areas: [],
    points: view === "cartogram" ? coords : [],
    pointIdAccessor: "id",
    lines: [
      {
        name: "Steep crossing",
        source: "west",
        target: "east",
        coordinates: coords
      }
    ],
    lineType: "line",
    flowStyle: view === "arc" ? "arc" : "basic",
    projectionTransform:
      view === "cartogram"
        ? {
            center: "west",
            costAccessor: "cost",
            layout: "strip",
            lineMode: "fractional"
          }
        : undefined
  }
}
