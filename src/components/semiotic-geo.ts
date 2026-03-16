/**
 * Geo entry point — geographic visualization: choropleth, proportional symbol, flow maps.
 * Import from "semiotic/geo" instead of the full bundle to reduce bundle size.
 */

import StreamGeoFrame from "./stream/StreamGeoFrame"

export { StreamGeoFrame }

// Chart HOCs
export { ChoroplethMap } from "./charts/geo/ChoroplethMap"
export { ProportionalSymbolMap } from "./charts/geo/ProportionalSymbolMap"
export { FlowMap } from "./charts/geo/FlowMap"
export { DistanceCartogram } from "./charts/geo/DistanceCartogram"

// Stream Frame types
export type {
  StreamGeoFrameProps,
  StreamGeoFrameHandle,
  GeoAreaSceneNode,
  GeoSceneNode,
  GeoScales,
  ProjectionProp,
  ProjectionName,
  GraticuleConfig,
  DistanceCartogramConfig,
  GeoPipelineConfig
} from "./stream/geoTypes"

// Geo data helpers
export { mergeData } from "./geo/mergeData"
export { resolveReferenceGeography } from "./geo/referenceGeography"
export type { ReferenceGeography } from "./geo/referenceGeography"
export type { AreasProp } from "./geo/useReferenceAreas"
