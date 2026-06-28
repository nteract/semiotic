/**
 * Recipes entry point — curated layout functions for use with `XYCustomChart`.
 *
 * Import from "semiotic/recipes" instead of the full bundle. Recipes are
 * pure CustomLayout functions that emit standard SceneNodes; they get hit
 * testing, transitions, decay, theme cascade, and SSR for free.
 */

export { waffleLayout, allocateCells } from "./recipes/waffle"
export type { WaffleConfig, CellWeight, AllocatedCells, AllocateCellsOptions } from "./recipes/waffle"

export { calendarLayout } from "./recipes/calendar"
export type { CalendarConfig } from "./recipes/calendar"

export {
  isometricLandmarkLayout,
  selectIsometricLandmarks,
  DEFAULT_ISOMETRIC_SPRITE_SIZES,
} from "./recipes/isometricLandmarks"
export type {
  IsometricLandmarkConfig,
  IsometricLandmarkTile,
  IsometricTerrainCell,
  IsometricTerrainKind,
  LandmarkKind,
} from "./recipes/isometricLandmarks"

// ── Network recipes (use with StreamNetworkFrame's customNetworkLayout) ──
export { flextreeLayout } from "./recipes/flextree"
export type { FlextreeConfig } from "./recipes/flextree"

export { dagreLayout } from "./recipes/dagre"
export type { DagreConfig } from "./recipes/dagre"

export { lineageDagLayout } from "./recipes/lineageDag"
export type { LineageDagConfig, LineageLod, LineageStoreSlot } from "./recipes/lineageDag"

export { mermaidDagLayout } from "./recipes/mermaidDag"
export type { MermaidDagConfig } from "./recipes/mermaidDag"

export { packedClusterMatrix } from "./recipes/packedClusterMatrix"
export type { PackedClusterMatrixConfig } from "./recipes/packedClusterMatrix"

// ── Ordinal recipes (use with OrdinalCustomChart's customLayout) ──
export { marimekkoLayout } from "./recipes/marimekko"
export type { MarimekkoConfig } from "./recipes/marimekko"

export { bulletLayout } from "./recipes/bullet"
export type { BulletConfig } from "./recipes/bullet"

export { parallelCoordinatesLayout } from "./recipes/parallelCoordinates"
export type { ParallelCoordinatesConfig } from "./recipes/parallelCoordinates"

export { bobaLayout } from "./recipes/boba"
export type { BobaConfig } from "./recipes/boba"

export { annotationLayout } from "./recipes/annotationLayout"
export type {
  AnnotationLayoutConfig,
  AnnotationLayoutOptions,
  AutoPlaceAnnotations,
  AutoPlaceAnnotationsConfig,
  AnnotationCohesion,
  AnnotationAudience,
} from "./recipes/annotationLayout"

export { annotationDensity, annotationBudget, DEFAULT_AREA_PER_ANNOTATION } from "./recipes/annotationDensity"
export type {
  AnnotationDensityConfig,
  AnnotationDensityOptions,
  AnnotationDensityResult,
} from "./recipes/annotationDensity"

export { intervalLanesLayout } from "./recipes/intervalLanes"
export type { IntervalLanesConfig } from "./recipes/intervalLanes"

export { axisFixedForceLayout, axisFixedForcePositions, rectCollide } from "./recipes/axisFixedForce"
export type {
  AxisFixedForceConfig,
  AxisFixedForceResult,
  PositionedNode,
  CollisionBox,
  RectCollideOptions,
} from "./recipes/axisFixedForce"

// ── Custom-chart authoring kit ───────────────────────────────────────────
// hitTarget: the invisible, interaction-bearing scene node that earns a custom
// layout keyboard nav + focus ring (accessibility), pointId anchoring
// (annotations), onObservation/selection (AI), and transition identity (chart
// modes) — for free. The flagship custom-chart primitive.
export {
  hitTargetPoint,
  hitTargetRect,
  networkHitTarget,
  DEFAULT_HIT_RADIUS,
} from "./stream/hitTarget"
export type {
  HitTargetPointProps,
  HitTargetRectProps,
  NetworkHitTargetCircleProps,
  NetworkHitTargetRectProps,
} from "./stream/hitTarget"

// Run-length encoding — collapse a per-step categorical/boolean series into
// drawable runs (condition strips, status timelines, calendar ribbons).
export { runs, runLengthEncode } from "./recipes/runs"
export type { Run, RunOptions } from "./recipes/runs"

// Cyclical (wrap-around) interval math for any periodic axis (day-of-year,
// hour-of-day, compass bearing) — the math a radial/circular brush re-derives.
export { wrapValue, shortestArcDelta, cyclicRangeContains, selectCyclicRange } from "./recipes/cyclical"

// Interval (Gantt/timeline) packing + temporal density.
export { packIntervals, activeCountOverDomain } from "./recipes/intervals"
export type {
  PackedInterval,
  PackIntervalsResult,
  PackIntervalsOptions,
  ActiveCount,
  ActiveCountOptions,
} from "./recipes/intervals"

// Radial coordinate kit — angle ⟂ radius primitives for bespoke radial charts.
export { polarToXY, xyToAngle, angleScale, radiusScale, ringArcPath, TAU } from "./recipes/radialCoords"
export type { Point, PolarOptions, AngleScaleOptions, RingArcOptions } from "./recipes/radialCoords"

// Edge-router kit — SVG-path builders for custom-network edges, plus cubic
// Bézier evaluation (sample a point/tangent along a curve to place marks).
export {
  curvedEdgePath,
  orthogonalEdgePath,
  boxEdgeAnchors,
  fanOutBend,
  cubicPoint,
  cubicTangent,
  cubicPath,
} from "./recipes/edgeRouter"
export type {
  CenteredBox,
  EdgeOrientation,
  CurvedEdgeOptions,
  BoxEdgeAnchorOptions,
  FanOutBendOptions,
  CubicCurve,
} from "./recipes/edgeRouter"

// 2D vector kit — point add/subtract/scale/magnitude/normalize for any custom
// layout positioning marks in Cartesian space (composes with the radial + edge kits).
export {
  addPoints,
  subtractPoints,
  scalePoint,
  pointMagnitude,
  normalizePoint,
} from "./recipes/vector"

// Unwrap the raw user datum from a frame node / observation wrapper.
export { unwrapDatum } from "./recipes/recipeUtils"

// Re-export the layout types so recipe authors don't need a second import.
export type {
  CustomLayout,
  LayoutContext,
  LayoutResult,
} from "./stream/customLayout"
export type {
  NetworkCustomLayout,
  NetworkLayoutContext,
  NetworkLayoutResult,
  NetworkHtmlMark,
} from "./stream/networkCustomLayout"
export type {
  OrdinalCustomLayout,
  OrdinalLayoutContext,
  OrdinalLayoutResult,
} from "./stream/ordinalCustomLayout"

// Glyph + color helpers for multi-channel custom layouts (and matching legends).
export { shade, makeShade, readField, groupBy } from "./recipes/recipeUtils"
// Interaction + caching helpers shared by custom-layout recipes.
export { dimFor, matchesHighlight, signatureKey, LayoutCache } from "./recipes/recipeUtils"
// Small numeric/color utilities every hand-built layout re-declares.
export { clamp, mean, withAlpha } from "./recipes/recipeUtils"
export type { DimOptions, HighlightMatch } from "./recipes/recipeUtils"
export { symbolPathString, symbolRadius, symbolExtent, SYMBOL_SEQUENCE } from "./stream/symbolPath"
export type { NetworkSymbolName } from "./stream/symbolPath"

// Recipe chrome kit — group enclosures, band labels, and mark callouts that
// custom-layout recipes draw in their `overlays` layer.
export { roundedEnclosure, boundsOf, bandLabel, markCallout, linearAxis, hatchFill } from "./recipes/recipeChrome"
export type {
  RoundedEnclosureProps,
  BandLabelProps,
  MarkCalloutProps,
  CalloutConnector,
  LinearAxisProps,
  AxisOrient,
  HatchFillOptions,
} from "./recipes/recipeChrome"

// Legend builder — the LegendGroup[] a custom layout passes through frameProps.legend.
export { legendGroupsFrom, legendSwatches } from "./recipes/recipeLegend"
export type { LegendGroupsInput, LegendSwatch, LegendSwatchesProps } from "./recipes/recipeLegend"

// Selection channel — read the chart's resolved selection from inside a custom
// layout's `overlays` to restyle on hover/selection WITHOUT a relayout. Pair
// with the layout result's `restyle` callback for canvas marks.
export { useCustomLayoutSelection } from "./stream/customLayoutSelection"
export type { CustomLayoutSelection } from "./stream/customLayoutSelection"

export {
  buildTooltipEntries,
  extractTooltipDatum,
  formatTooltipValue,
} from "./recipes/customTooltip"
export type {
  CustomTooltipEntry,
  CustomTooltipEntryOptions,
} from "./recipes/customTooltip"
