// ── Stream Frames (canvas-first, primary APIs) ─────────────────────────
import StreamXYFrame from "./stream/StreamXYFrame"
import StreamOrdinalFrame from "./stream/StreamOrdinalFrame"
import StreamNetworkFrame from "./stream/StreamNetworkFrame"

// ── Utilities ──────────────────────────────────────────────────────────
import AnnotationLayer from "./AnnotationLayer/AnnotationLayer"
import DividedLine from "./DividedLine"
import Axis from "./Axis"
import Legend from "./Legend"
import Annotation from "./Annotation"
import Brush from "./Brush"
import { funnelize } from "./svg/lineDrawing"
import { calculateDataExtent } from "./data/dataFunctions"
import { hexbinning, heatmapping } from "./svg/areaDrawing"
import { nodesEdgesFromHierarchy } from "./processing/hierarchyUtils"

// ── Chart HOCs ─────────────────────────────────────────────────────────
import { Scatterplot, LineChart, AreaChart, StackedAreaChart, Heatmap, BubbleChart, BarChart, StackedBarChart, SwarmPlot, BoxPlot, Histogram, ViolinPlot, RidgelinePlot, DotPlot, PieChart, DonutChart, GroupedBarChart, ForceDirectedGraph, ChordDiagram, SankeyDiagram, TreeDiagram, Treemap, CirclePack, ScatterplotMatrix, MinimapChart } from "./charts"

// ── Coordinated views ──────────────────────────────────────────────────
import { LinkedCharts } from "./LinkedCharts"

// ── Theme ──────────────────────────────────────────────────────────────
import { ThemeProvider, useTheme } from "./ThemeProvider"

// ── Export utility ─────────────────────────────────────────────────────
import { exportChart } from "./export/exportChart"

// ── Error boundary ─────────────────────────────────────────────────────
import { ChartErrorBoundary } from "./ChartErrorBoundary"

// ── Tooltip utilities ──────────────────────────────────────────────────
import { Tooltip, MultiLineTooltip, normalizeTooltip } from "./Tooltip/Tooltip"

// ── Data structures ────────────────────────────────────────────────────
import { RingBuffer } from "./realtime/RingBuffer"
import { IncrementalExtent } from "./realtime/IncrementalExtent"

// ── Realtime chart HOCs ────────────────────────────────────────────────
import { RealtimeLineChart } from "./charts/realtime/RealtimeLineChart"
import { RealtimeTemporalHistogram, RealtimeHistogram } from "./charts/realtime/RealtimeHistogram"
import { RealtimeSwarmChart } from "./charts/realtime/RealtimeSwarmChart"
import { RealtimeWaterfallChart } from "./charts/realtime/RealtimeWaterfallChart"
import { RealtimeHeatmap } from "./charts/realtime/RealtimeHeatmap"

export {
  // Stream Frames
  StreamXYFrame,
  StreamOrdinalFrame,
  StreamNetworkFrame,
  // Utilities
  AnnotationLayer,
  DividedLine,
  Brush,
  Axis,
  Annotation,
  Legend,
  funnelize,
  calculateDataExtent,
  hexbinning,
  heatmapping,
  nodesEdgesFromHierarchy,
  // Chart HOCs
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
  RidgelinePlot,
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
  MinimapChart,
  // Coordinated views
  LinkedCharts,
  // Theme
  ThemeProvider,
  useTheme,
  // Export utility
  exportChart,
  // Error boundary
  ChartErrorBoundary,
  // Tooltip
  Tooltip,
  MultiLineTooltip,
  normalizeTooltip,
  // Data structures
  RingBuffer,
  IncrementalExtent,
  // Realtime chart HOCs
  RealtimeLineChart,
  RealtimeTemporalHistogram,
  RealtimeHistogram,
  RealtimeSwarmChart,
  RealtimeWaterfallChart,
  RealtimeHeatmap
}

// ── Chart HOC prop types ───────────────────────────────────────────────

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
  MinimapChartProps,
  MinimapConfig,
  BaseChartProps,
  AxisConfig,
  Accessor,
  ChartAccessor
} from "./charts"

// ── StreamXYFrame types ────────────────────────────────────────────────

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

// ── StreamOrdinalFrame types ───────────────────────────────────────────

export type {
  StreamOrdinalFrameProps,
  StreamOrdinalFrameHandle,
  OrdinalChartType,
  OrdinalScales,
  OrdinalSceneNode
} from "./stream/ordinalTypes"

// ── StreamNetworkFrame types ───────────────────────────────────────────

export type {
  StreamNetworkFrameProps,
  StreamNetworkFrameHandle,
  NetworkChartType,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel
} from "./stream/networkTypes"

// ── Coordinated views types ────────────────────────────────────────────

export type {
  SelectionConfig,
  LinkedHoverProp,
  LinkedBrushProp
} from "./charts/shared/types"

export type { LinkedChartsProps } from "./LinkedCharts"

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

// ── Theme types ────────────────────────────────────────────────────────

export type { SemioticTheme } from "./ThemeProvider"
export { LIGHT_THEME, DARK_THEME } from "./ThemeProvider"

// ── Error boundary types ───────────────────────────────────────────────

export type { ChartErrorBoundaryProps } from "./ChartErrorBoundary"

// ── Format utilities ───────────────────────────────────────────────────

export { smartTickFormat } from "./charts/shared/formatUtils"

// ── Tooltip types ──────────────────────────────────────────────────────

export type {
  TooltipProp,
  TooltipConfig,
  TooltipField,
  MultiLineTooltipConfig
} from "./Tooltip/Tooltip"

// ── Streaming types ────────────────────────────────────────────────────

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
  HoverData
} from "./realtime/types"

// ── Realtime chart HOC types ───────────────────────────────────────────

export type { RealtimeLineChartProps } from "./charts/realtime/RealtimeLineChart"
export type { RealtimeTemporalHistogramProps, RealtimeHistogramProps } from "./charts/realtime/RealtimeHistogram"
export type { RealtimeSwarmChartProps } from "./charts/realtime/RealtimeSwarmChart"
export type { RealtimeWaterfallChartProps } from "./charts/realtime/RealtimeWaterfallChart"
export type { RealtimeHeatmapProps } from "./charts/realtime/RealtimeHeatmap"
