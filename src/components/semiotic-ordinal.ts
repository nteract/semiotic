/**
 * OrdinalFrame entry point - for bar charts, pie charts, timelines, etc.
 * Import this instead of the full semiotic bundle to reduce bundle size
 */

import OrdinalFrame from "./OrdinalFrame"
import { ResponsiveOrdinalFrame } from "./ResponsiveOrdinalFrame"
import { SparkOrdinalFrame } from "./SparkOrdinalFrame"

// Common utilities used with OrdinalFrame
import Axis from "./Axis"
import Legend from "./Legend"
import Annotation from "./Annotation"
import AnnotationLayer from "./AnnotationLayer/AnnotationLayer"
import Mark from "./Mark/Mark"

// Utility functions
import { calculateDataExtent } from "./data/dataFunctions"

// Export components
export {
  OrdinalFrame,
  ResponsiveOrdinalFrame,
  SparkOrdinalFrame,
  // Common utilities
  Axis,
  Legend,
  Annotation,
  AnnotationLayer,
  Mark,
  // Utility functions
  calculateDataExtent
}

// Export types
export {
  OExtentObject,
  PieceTypes,
  PieceTypeSettings,
  ProjectedOrdinalSummary,
  OrdinalFrameProps,
  OrdinalFrameState
} from "./types/ordinalTypes"

export {
  AnnotationType,
  CustomHoverType,
  AnnotationTypes,
  AnnotationHandling,
  AnnotationProps,
  AxisProps,
  AxisGeneratingFunction
} from "./types/annotationTypes"

export {
  GenericObject,
  MarginType,
  ProjectionTypes,
  ExtentType,
  ProjectedPoint,
  PieceLayoutType,
  RoughType,
  CanvasPostProcessTypes,
  ExtentSettingsType,
  accessorType,
  AccessorFnType,
  GenericAccessor,
  VizLayerTypes,
  RenderPipelineType,
  OrdinalSummaryTypes,
  OrdinalSummaryTypeSettings,
  AxisSummaryTypeSettings,
  GeneralFrameProps,
  GeneralFrameState
} from "./types/generalTypes"

export {
  AdvancedInteractionSettings,
  Interactivity,
  InteractionLayerProps,
  VoronoiEntryType,
  BaseColumnType,
  InteractionLayerState
} from "./types/interactionTypes"

export {
  SupportedLegendGlyphs,
  ItemType,
  LegendItem,
  LegendGroup,
  LegendProps
} from "./types/legendTypes"
