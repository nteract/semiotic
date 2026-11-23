import { geoPath } from "d3-geo"
import type { GeoProjection } from "d3-geo"
import type { StreamLayout } from "./types"

/** A singleton or coincident points have zero extent; keep a finite local view. */
export function repairDegenerateGeoFit(
  projection: GeoProjection,
  data: GeoJSON.GeometryCollection | GeoJSON.FeatureCollection,
  layout: StreamLayout
): void {
  if (
    Number.isFinite(projection.scale()) &&
    projection.translate().every(Number.isFinite)
  )
    return
  projection.scale(
    Math.max(1, Math.min(layout.width, layout.height) / (2 * Math.PI))
  )
  projection.translate([layout.width / 2, layout.height / 2])
  const bounds = geoPath(projection).bounds(data)
  if (!bounds.flat().every(Number.isFinite)) return
  projection.translate([
    layout.width - (bounds[0][0] + bounds[1][0]) / 2,
    layout.height - (bounds[0][1] + bounds[1][1]) / 2
  ])
}
