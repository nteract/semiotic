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
export { GeoCustomChart } from "./charts/custom/GeoCustomChart"
export { responsiveRuleMatches, resolveResponsiveRules } from "./charts/shared/responsiveRules"
export type {
  ResponsiveOrientation,
  ResponsiveRuleCondition,
  ResponsiveRuleContext,
  ResponsiveRule,
  ResponsiveRuleMatch,
  ResponsiveRuleResult,
} from "./charts/shared/responsiveRules"

// Custom-layout hit target — make overlay-drawn geographic marks navigable.
export { geoHitTarget, hitTargetPoint, DEFAULT_HIT_RADIUS } from "./stream/hitTarget"
export type { HitTargetPointProps } from "./stream/hitTarget"
// glyph — projected composite pictograms standing on the map.
export { glyphPlacement, glyphExtent } from "./stream/glyphDef"
export type { GlyphDef, GlyphPart } from "./stream/glyphDef"
export type { GlyphSceneNode, SceneAccessibilityMetadata } from "./stream/types"

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
export type {
  GeoCustomLayout,
  GeoLayoutContext,
  GeoLayoutResult
} from "./stream/geoCustomLayout"

// Particle types
export type { GeoParticleStyle } from "./stream/GeoParticlePool"

// Geo data helpers
export { mergeData } from "./geo/mergeData"
export { resolveReferenceGeography } from "./geo/referenceGeography"
export type { ReferenceGeography } from "./geo/referenceGeography"
export type { AreasProp } from "./geo/useReferenceAreas"

// Chart prop types
export type { ChoroplethMapProps } from "./charts/geo/ChoroplethMap"
export type { ProportionalSymbolMapProps } from "./charts/geo/ProportionalSymbolMap"
export type { FlowMapProps } from "./charts/geo/FlowMap"
export type { DistanceCartogramProps } from "./charts/geo/DistanceCartogram"
export type { GeoCustomChartProps } from "./charts/custom/GeoCustomChart"
