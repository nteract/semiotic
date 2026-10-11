import { geoPath } from "d3-geo"
import type { GeoProjection } from "d3-geo"
import type { GeoScales } from "./geoTypes"

/** One projection bundle for initial fitting, zoom, and rotation. */
export function buildGeoScales(projection: GeoProjection): GeoScales {
  return {
    projection,
    geoPath: geoPath(projection),
    projectedPoint: (lon, lat) => projection([lon, lat]),
    invertedPoint: (x, y) => projection.invert?.([x, y]) ?? null
  }
}
