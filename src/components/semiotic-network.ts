/**
 * Network entry point — for force graphs, sankey, chord, trees, etc.
 * Import from "semiotic/network" instead of the full bundle to reduce bundle size.
 */

import StreamNetworkFrame from "./stream/StreamNetworkFrame"

// Common utilities
import Axis from "./Axis"
import Legend from "./Legend"
import Annotation from "./Annotation"
import AnnotationLayer from "./AnnotationLayer/AnnotationLayer"
import { calculateDataExtent } from "./data/dataFunctions"
import { nodesEdgesFromHierarchy } from "./processing/hierarchyUtils"

// Chart HOCs
import { ForceDirectedGraph } from "./charts/network/ForceDirectedGraph"
import { SankeyDiagram } from "./charts/network/SankeyDiagram"
import { ChordDiagram } from "./charts/network/ChordDiagram"
import { TreeDiagram } from "./charts/network/TreeDiagram"
import { Treemap } from "./charts/network/Treemap"
import { CirclePack } from "./charts/network/CirclePack"

export {
  StreamNetworkFrame,
  ForceDirectedGraph,
  SankeyDiagram,
  ChordDiagram,
  TreeDiagram,
  Treemap,
  CirclePack,
  Axis,
  Legend,
  Annotation,
  AnnotationLayer,
  calculateDataExtent,
  nodesEdgesFromHierarchy
}

// Types
export type {
  StreamNetworkFrameProps,
  StreamNetworkFrameHandle,
  NetworkChartType,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel
} from "./stream/networkTypes"

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
