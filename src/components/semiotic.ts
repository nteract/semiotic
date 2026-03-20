// ── Stream Frames (canvas-first, primary APIs) ─────────────────────────
import StreamXYFrame from "./stream/StreamXYFrame"
import StreamOrdinalFrame from "./stream/StreamOrdinalFrame"
import StreamNetworkFrame from "./stream/StreamNetworkFrame"

// ── Chart HOCs ─────────────────────────────────────────────────────────
import { Scatterplot, ConnectedScatterplot, LineChart, AreaChart, StackedAreaChart, Heatmap, BubbleChart, BarChart, StackedBarChart, SwarmPlot, BoxPlot, Histogram, ViolinPlot, RidgelinePlot, DotPlot, PieChart, DonutChart, GroupedBarChart, ForceDirectedGraph, ChordDiagram, SankeyDiagram, TreeDiagram, Treemap, CirclePack, OrbitDiagram, ScatterplotMatrix, MinimapChart, QuadrantChart } from "./charts"

// ── Coordinated views ──────────────────────────────────────────────────
import { LinkedCharts } from "./LinkedCharts"

// ── Theme ──────────────────────────────────────────────────────────────
import { ThemeProvider, useTheme } from "./ThemeProvider"

// ── Export utility ─────────────────────────────────────────────────────
import { exportChart } from "./export/exportChart"

// ── Chart state serialization ─────────────────────────────────────────
import { toConfig, fromConfig, toURL, fromURL, copyConfig, configToJSX } from "./export/chartConfig"
import { serializeSelections, deserializeSelections } from "./export/selectionSerializer"
import { fromVegaLite } from "./data/fromVegaLite"

// ── Error boundary ─────────────────────────────────────────────────────
import { ChartErrorBoundary } from "./ChartErrorBoundary"

// ── Chart container ───────────────────────────────────────────────────
import { ChartContainer } from "./ChartContainer"
import { ChartGrid } from "./ChartGrid"
import { CategoryColorProvider, useCategoryColors } from "./CategoryColors"
import { ContextLayout } from "./ContextLayout"

// ── Details panel ────────────────────────────────────────────────────
import { DetailsPanel } from "./DetailsPanel"

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
  // Chart HOCs
  Scatterplot,
  ConnectedScatterplot,
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
  OrbitDiagram,
  ScatterplotMatrix,
  MinimapChart,
  QuadrantChart,
  // Coordinated views
  LinkedCharts,
  // Theme
  ThemeProvider,
  useTheme,
  // Export utility
  exportChart,
  // Chart state serialization
  toConfig,
  fromConfig,
  toURL,
  fromURL,
  copyConfig,
  configToJSX,
  serializeSelections,
  deserializeSelections,
  // Vega-Lite translator
  fromVegaLite,
  // Error boundary
  ChartErrorBoundary,
  // Chart container
  ChartContainer,
  ChartGrid,
  CategoryColorProvider,
  useCategoryColors,
  ContextLayout,
  // Details panel
  DetailsPanel,
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
  ConnectedScatterplotProps,
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
  RidgelinePlotProps,
  OrbitDiagramProps,
  OrbitNode,
  ForceDirectedGraphProps,
  ChordDiagramProps,
  SankeyDiagramProps,
  TreeDiagramProps,
  TreemapProps,
  CirclePackProps,
  ScatterplotMatrixProps,
  MinimapChartProps,
  MinimapConfig,
  QuadrantChartProps,
  QuadrantsConfig,
  QuadrantConfig,
  CenterlineStyle,
  BaseChartProps,
  AxisConfig,
  Accessor,
  ChartAccessor,
  ChartMode
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
  NetworkLabel,
  ThresholdAlertConfig
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

export {
  useChartObserver
} from "./LinkedCharts"

export type {
  UseChartObserverOptions,
  UseChartObserverResult
} from "./LinkedCharts"

export type {
  ChartObservation,
  OnObservationCallback
} from "./store/ObservationStore"

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

// ── Chart container types ─────────────────────────────────────────────

export type { ChartContainerProps, ChartContainerHandle } from "./ChartContainer"
export type { ChartGridProps } from "./ChartGrid"
export type { CategoryColorMap, CategoryColorProviderProps } from "./CategoryColors"
export type { ContextLayoutProps } from "./ContextLayout"
export type { DetailsPanelProps } from "./DetailsPanel"

// ── Chart state serialization types ───────────────────────────────────

export type { ChartConfig, ToConfigOptions, CopyFormat } from "./export/chartConfig"
export type { VegaLiteSpec, VegaLiteEncoding } from "./data/fromVegaLite"
export type { SerializedSelections, SerializedSelection, SerializedFieldSelection } from "./export/selectionSerializer"

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
  AnnotationAnchorMode,
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
