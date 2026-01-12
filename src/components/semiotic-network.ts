/**
 * NetworkFrame entry point - for network graphs, trees, sankey diagrams, etc.
 * Import this instead of the full semiotic bundle to reduce bundle size
 */

import NetworkFrame from "./NetworkFrame"
import { ResponsiveNetworkFrame } from "./ResponsiveNetworkFrame"
import { SparkNetworkFrame } from "./SparkNetworkFrame"

// Common utilities used with NetworkFrame
import Axis from "./Axis"
import Legend from "./Legend"
import Annotation from "./Annotation"
import AnnotationLayer from "./AnnotationLayer/AnnotationLayer"

// Utility functions
import { calculateDataExtent } from "./data/dataFunctions"
import { nodesEdgesFromHierarchy } from "./processing/network"

// Export components
export {
  NetworkFrame,
  ResponsiveNetworkFrame,
  SparkNetworkFrame,
  // Common utilities
  Axis,
  Legend,
  Annotation,
  AnnotationLayer,
  // Utility functions
  calculateDataExtent,
  nodesEdgesFromHierarchy
}

// Export types
export {
  NodeType,
  EdgeType,
  GraphSettingsType,
  NetworkSettingsType,
  NetworkFrameState,
  NetworkFrameProps
} from "./types/networkTypes"

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
