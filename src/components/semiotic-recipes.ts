/**
 * Recipes entry point — curated layout functions for use with `XYCustomChart`.
 *
 * Import from "semiotic/recipes" instead of the full bundle. Recipes are
 * pure CustomLayout functions that emit standard SceneNodes; they get hit
 * testing, transitions, decay, theme cascade, and SSR for free.
 */

export { waffleLayout } from "./recipes/waffle"
export type { WaffleConfig } from "./recipes/waffle"

export { calendarLayout } from "./recipes/calendar"
export type { CalendarConfig } from "./recipes/calendar"

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
export type { DimOptions, HighlightMatch } from "./recipes/recipeUtils"
export { symbolPathString, symbolRadius, symbolExtent, SYMBOL_SEQUENCE } from "./stream/symbolPath"
export type { NetworkSymbolName } from "./stream/symbolPath"

// Recipe chrome kit — group enclosures, band labels, and mark callouts that
// custom-layout recipes draw in their `overlays` layer.
export { roundedEnclosure, boundsOf, bandLabel, markCallout } from "./recipes/recipeChrome"
export type {
  RoundedEnclosureProps,
  BandLabelProps,
  MarkCalloutProps,
  CalloutConnector,
} from "./recipes/recipeChrome"

// Legend builder — the LegendGroup[] a custom layout passes through frameProps.legend.
export { legendGroupsFrom } from "./recipes/recipeLegend"
export type { LegendGroupsInput } from "./recipes/recipeLegend"

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
