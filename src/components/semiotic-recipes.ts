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
} from "./stream/networkCustomLayout"
export type {
  OrdinalCustomLayout,
  OrdinalLayoutContext,
  OrdinalLayoutResult,
} from "./stream/ordinalCustomLayout"
