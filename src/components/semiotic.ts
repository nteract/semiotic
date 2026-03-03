import AnnotationLayer from "./AnnotationLayer/AnnotationLayer"
import DividedLine from "./DividedLine"
import XYFrame from "./XYFrame"
import OrdinalFrame from "./OrdinalFrame"
import MinimapXYFrame from "./MinimapXYFrame"
import MiniMap from "./MiniMap"
import Axis from "./Axis"
import Legend from "./Legend"
import Annotation from "./Annotation"
import Brush from "./Brush"
import InteractionLayer from "./InteractionLayer"
import VisualizationLayer from "./VisualizationLayer"
import NetworkFrame from "./NetworkFrame"
import { funnelize } from "./svg/lineDrawing"
import { calculateDataExtent } from "./data/dataFunctions"
import { ResponsiveNetworkFrame } from "./ResponsiveNetworkFrame"
import { ResponsiveMinimapXYFrame } from "./ResponsiveMinimapXYFrame"
import { ResponsiveXYFrame } from "./ResponsiveXYFrame"
import { ResponsiveOrdinalFrame } from "./ResponsiveOrdinalFrame"

import { SparkXYFrame } from "./SparkXYFrame"
import { SparkOrdinalFrame } from "./SparkOrdinalFrame"
import { SparkNetworkFrame } from "./SparkNetworkFrame"

import { hexbinning, heatmapping } from "./svg/areaDrawing"

import { nodesEdgesFromHierarchy } from "./processing/network"

// Higher-order chart components
import { Scatterplot, LineChart, AreaChart, StackedAreaChart, Heatmap, BubbleChart, BarChart, StackedBarChart, SwarmPlot, BoxPlot, Histogram, ViolinPlot, DotPlot, PieChart, DonutChart, GroupedBarChart, ForceDirectedGraph, ChordDiagram, SankeyDiagram, TreeDiagram, Treemap, CirclePack, ScatterplotMatrix } from "./charts"

// Coordinated views
import { LinkedCharts } from "./LinkedCharts"

// Theme
import { ThemeProvider, useTheme } from "./ThemeProvider"

// Export utility
import { exportChart } from "./export/exportChart"

// Error boundary
import { ChartErrorBoundary } from "./ChartErrorBoundary"

// Tooltip utilities
import { Tooltip, MultiLineTooltip, normalizeTooltip } from "./Tooltip/Tooltip"

// StreamXYFrame (unified canvas-first XY frame)
import StreamXYFrame from "./stream/StreamXYFrame"

// Realtime
import RealtimeFrame from "./realtime/RealtimeFrame"
import { RingBuffer } from "./realtime/RingBuffer"
import { IncrementalExtent } from "./realtime/IncrementalExtent"

// Realtime chart components
import { RealtimeLineChart } from "./charts/realtime/RealtimeLineChart"
import { RealtimeBarChart } from "./charts/realtime/RealtimeBarChart"
import { RealtimeSwarmChart } from "./charts/realtime/RealtimeSwarmChart"
import { RealtimeWaterfallChart } from "./charts/realtime/RealtimeWaterfallChart"
import { RealtimeSankey } from "./charts/realtime/RealtimeSankey"
import RealtimeNetworkFrame from "./realtime-network/RealtimeNetworkFrame"

export {
  AnnotationLayer,
  DividedLine,
  XYFrame,
  MinimapXYFrame,
  MiniMap,
  Brush,
  Axis,
  InteractionLayer,
  VisualizationLayer,
  OrdinalFrame,
  Annotation,
  NetworkFrame,
  ResponsiveMinimapXYFrame,
  ResponsiveOrdinalFrame,
  ResponsiveNetworkFrame,
  ResponsiveXYFrame,
  SparkOrdinalFrame,
  SparkNetworkFrame,
  SparkXYFrame,
  Legend,
  funnelize,
  calculateDataExtent,
  hexbinning,
  heatmapping,
  nodesEdgesFromHierarchy,
  // Higher-order chart components
  Scatterplot,
  LineChart,
  AreaChart,
  StackedAreaChart,
  Heatmap,
  BubbleChart,
  BarChart,
  StackedBarChart,
  SwarmPlot,
  BoxPlot,
  Histogram,
  ViolinPlot,
  DotPlot,
  ForceDirectedGraph,
  ChordDiagram,
  SankeyDiagram,
  TreeDiagram,
  PieChart,
  DonutChart,
  GroupedBarChart,
  Treemap,
  CirclePack,
  ScatterplotMatrix,
  // Coordinated views
  LinkedCharts,
  // Theme
  ThemeProvider,
  useTheme,
  // Export utility
  exportChart,
  // Error boundary
  ChartErrorBoundary,
  // Tooltip utilities
  Tooltip,
  MultiLineTooltip,
  normalizeTooltip,
  // StreamXYFrame
  StreamXYFrame,
  // Realtime
  RealtimeFrame,
  RingBuffer,
  IncrementalExtent,
  // Realtime chart components
  RealtimeLineChart,
  RealtimeBarChart,
  RealtimeSwarmChart,
  RealtimeWaterfallChart,
  RealtimeSankey,
  RealtimeNetworkFrame
}

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

export { ContextType } from "./types/canvasTypes"

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
  OrdinalSummaryTypes,
  OrdinalSummaryTypeSettings,
  AxisSummaryTypeSettings,
  GeneralFrameProps,
  GeneralFrameState,
  TransitionConfig
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

export {
  OExtentObject,
  PieceTypes,
  PieceTypeSettings,
  ProjectedOrdinalSummary,
  OrdinalFrameProps,
  OrdinalFrameState
} from "./types/ordinalTypes"

export {
  XYFrameProps,
  AnnotatedSettingsProps,
  XYFrameState,
  SummaryLayoutType
} from "./types/xyTypes"

export {
  ScatterplotProps,
  LineChartProps,
  AreaChartProps,
  StackedAreaChartProps,
  HeatmapProps,
  BubbleChartProps,
  BarChartProps,
  StackedBarChartProps,
  SwarmPlotProps,
  BoxPlotProps,
  HistogramProps,
  ViolinPlotProps,
  DotPlotProps,
  PieChartProps,
  DonutChartProps,
  GroupedBarChartProps,
  ForceDirectedGraphProps,
  ChordDiagramProps,
  SankeyDiagramProps,
  TreeDiagramProps,
  TreemapProps,
  CirclePackProps,
  ScatterplotMatrixProps,
  BaseChartProps,
  AxisConfig,
  Accessor,
  ChartAccessor
} from "./charts"

// Coordinated views types
export type {
  SelectionConfig,
  LinkedHoverProp,
  LinkedBrushProp
} from "./charts/shared/types"

export type { LinkedChartsProps } from "./LinkedCharts"

// Selection hooks (for building custom coordinated views)
export {
  useSelection,
  useLinkedHover,
  useBrushSelection,
  useFilteredData
} from "./LinkedCharts"

export type {
  UseSelectionOptions,
  UseSelectionResult,
  UseLinkedHoverOptions,
  UseLinkedHoverResult,
  UseBrushSelectionOptions,
  UseBrushSelectionResult
} from "./LinkedCharts"

export type {
  ResolutionMode,
  SelectionClause,
  Selection
} from "./store/SelectionStore"

// Theme types
export type { SemioticTheme } from "./ThemeProvider"
export { LIGHT_THEME, DARK_THEME } from "./ThemeProvider"

// Error boundary types
export type { ChartErrorBoundaryProps } from "./ChartErrorBoundary"

// Format utilities
export { smartTickFormat } from "./charts/shared/formatUtils"

// Tooltip types
export type {
  TooltipProp,
  TooltipConfig,
  TooltipField,
  MultiLineTooltipConfig
} from "./Tooltip/Tooltip"

// Realtime types
export type {
  ArrowOfTime,
  WindowMode,
  ThresholdType,
  LineStyle,
  BarStyle,
  WaterfallStyle,
  SwarmStyle,
  AnnotationContext,
  CrosshairStyle,
  HoverAnnotationConfig,
  HoverData,
  RealtimeFrameProps,
  RealtimeFrameHandle,
  RealtimeScales,
  RealtimeLayout,
  RealtimeAccessors
} from "./realtime/types"

export type { RendererFn, RendererOptions } from "./realtime/renderers/types"

// StreamXYFrame types
export type {
  StreamXYFrameProps,
  StreamXYFrameHandle,
  StreamChartType,
  RuntimeMode,
  SceneNode,
  Changeset,
  StreamScales,
  StreamLayout,
  CurveType,
  CanvasRendererFn
} from "./stream/types"

export type { StreamRendererFn } from "./stream/renderers/types"

// Realtime chart component types
export type { RealtimeLineChartProps } from "./charts/realtime/RealtimeLineChart"
export type { RealtimeBarChartProps } from "./charts/realtime/RealtimeBarChart"
export type { RealtimeSwarmChartProps } from "./charts/realtime/RealtimeSwarmChart"
export type { RealtimeWaterfallChartProps } from "./charts/realtime/RealtimeWaterfallChart"
export type { RealtimeSankeyProps, RealtimeNetworkFrameProps, RealtimeNetworkFrameHandle } from "./realtime-network/types"
