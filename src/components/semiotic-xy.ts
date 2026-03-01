/**
 * XYFrame entry point - for line, area, and scatter plots
 * Import this instead of the full semiotic bundle to reduce bundle size
 */

import XYFrame from "./XYFrame"
import MinimapXYFrame from "./MinimapXYFrame"
import { ResponsiveXYFrame } from "./ResponsiveXYFrame"
import { SparkXYFrame } from "./SparkXYFrame"

// Common utilities used with XYFrame
import Axis from "./Axis"
import Legend from "./Legend"
import Annotation from "./Annotation"
import AnnotationLayer from "./AnnotationLayer/AnnotationLayer"
import Brush from "./Brush"
import MiniMap from "./MiniMap"
import DividedLine from "./DividedLine"

// Utility functions
import { funnelize } from "./svg/lineDrawing"
import { calculateDataExtent } from "./data/dataFunctions"
import { hexbinning, heatmapping } from "./svg/areaDrawing"

// Export components
export {
  XYFrame,
  MinimapXYFrame,
  ResponsiveXYFrame,
  SparkXYFrame,
  // Common utilities
  Axis,
  Legend,
  Annotation,
  AnnotationLayer,
  Brush,
  MiniMap,
  DividedLine,
  // Utility functions
  funnelize,
  calculateDataExtent,
  hexbinning,
  heatmapping
}

// Export types
export {
  XYFrameProps,
  AnnotatedSettingsProps,
  XYFrameState,
  SummaryLayoutType
} from "./types/xyTypes"

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
  ProjectedLine,
  ProjectedSummary,
  RoughType,
  CanvasPostProcessTypes,
  ExtentSettingsType,
  accessorType,
  DataAccessor,
  AccessorFnType,
  BasicLineTypes,
  LineTypeSettings,
  BasicSummaryTypes,
  SummaryTypeSettings,
  RawLine,
  RawSummary,
  RawPoint,
  CustomAreaMarkProps,
  ProjectedBin,
  GenericAccessor,
  VizLayerTypes,
  RenderPipelineType,
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
