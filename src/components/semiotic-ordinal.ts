/**
 * Ordinal entry point — for bar charts, pie charts, timelines, etc.
 * Import from "semiotic/ordinal" instead of the full bundle to reduce bundle size.
 */

import StreamOrdinalFrame from "./stream/StreamOrdinalFrame"

// Common utilities
import Axis from "./Axis"
import Legend from "./Legend"
import Annotation from "./Annotation"
import AnnotationLayer from "./AnnotationLayer/AnnotationLayer"
import { calculateDataExtent } from "./data/dataFunctions"

// Chart HOCs
import { Histogram } from "./charts/ordinal/Histogram"
import { ViolinPlot } from "./charts/ordinal/ViolinPlot"

export {
  StreamOrdinalFrame,
  Axis,
  Legend,
  Annotation,
  AnnotationLayer,
  calculateDataExtent,
  Histogram,
  ViolinPlot
}

// Types
export type {
  StreamOrdinalFrameProps,
  StreamOrdinalFrameHandle,
  OrdinalChartType,
  OrdinalScales,
  OrdinalSceneNode
} from "./stream/ordinalTypes"

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
  DataAccessor,
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
