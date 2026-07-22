// ── Stream Frames (canvas-first, primary APIs) ─────────────────────────
import StreamXYFrame from "./stream/StreamXYFrame"
import StreamOrdinalFrame from "./stream/StreamOrdinalFrame"
import StreamNetworkFrame from "./stream/StreamNetworkFrame"

// ── Chart HOCs ─────────────────────────────────────────────────────────
// Physics HOCs live on `semiotic/physics` (and `semiotic/ai`) so the root
// package entry does not ship the physics frame + kernel into every
// `import { LineChart } from "semiotic"` consumer. Prefer:
//   import { GaltonBoardChart } from "semiotic/physics"
import { Scatterplot, ConnectedScatterplot, LineChart, AreaChart, DifferenceChart, StackedAreaChart, Heatmap, BubbleChart, BarChart, StackedBarChart, LikertChart, SwarmPlot, BoxPlot, Histogram, ViolinPlot, RidgelinePlot, DotPlot, PieChart, DonutChart, GaugeChart, GroupedBarChart, FunnelChart, SwimlaneChart, ForceDirectedGraph, ChordDiagram, SankeyDiagram, ProcessSankey, TreeDiagram, Treemap, CirclePack, OrbitDiagram, ScatterplotMatrix, MinimapChart, QuadrantChart, MultiAxisLineChart, CandlestickChart, XYCustomChart, NetworkCustomChart, OrdinalCustomChart, responsiveRuleMatches, resolveResponsiveRules } from "./charts"

// ── Coordinated views ──────────────────────────────────────────────────
import { LinkedCharts } from "./LinkedCharts"

// ── Theme ──────────────────────────────────────────────────────────────
import { ThemeProvider, useTheme } from "./ThemeProvider"

// ── Export utility ─────────────────────────────────────────────────────
import { exportChart } from "./export/exportChart"

// ── Pattern fills ─────────────────────────────────────────────────────
import { createHatchPattern } from "./charts/shared/hatchPattern"

// ── Chart state serialization ─────────────────────────────────────────
import { toConfig, fromConfig, toURL, fromURL, copyConfig, configToJSX } from "./export/chartConfig"
import { serializeSelections, deserializeSelections } from "./export/selectionSerializer"
import { fromVegaLite } from "./data/fromVegaLite"

// ── Error boundary ─────────────────────────────────────────────────────
import { ChartErrorBoundary } from "./ChartErrorBoundary"

// ── Chart container ───────────────────────────────────────────────────
import { ChartContainer } from "./ChartContainer"
import { MobileChartContainer } from "./MobileChartContainer"
import { SmallMultipleChart } from "./SmallMultipleChart"
import {
  MobileStandardControls,
  clampMobileRange,
  useMobileRangeControls,
  zoomMobileRange,
} from "./MobileStandardControls"
import { ChartGrid } from "./ChartGrid"
import { CategoryColorProvider, useCategoryColors } from "./CategoryColors"
import { ContextLayout } from "./ContextLayout"
import { CircularBrush } from "./CircularBrush"
import { DirectManipulationControl, VISUALIZATION_CONTROL_TYPES } from "./DirectManipulationControl"

// ── Details panel ────────────────────────────────────────────────────
import { DetailsPanel } from "./DetailsPanel"

// ── Tooltip utilities ──────────────────────────────────────────────────
import { Tooltip, MultiLineTooltip, normalizeTooltip } from "./Tooltip/Tooltip"

// ── Data structures ────────────────────────────────────────────────────
import { RingBuffer } from "./realtime/RingBuffer"
import { IncrementalExtent } from "./realtime/IncrementalExtent"

// ── Realtime chart HOCs ────────────────────────────────────────────────
import { RealtimeLineChart } from "./charts/realtime/RealtimeLineChart"
import { RealtimeTemporalHistogram, RealtimeHistogram, TemporalHistogram } from "./charts/realtime/RealtimeHistogram"
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
  DifferenceChart,
  StackedAreaChart,
  Heatmap,
  BubbleChart,
  BarChart,
  StackedBarChart,
  LikertChart,
  SwarmPlot,
  BoxPlot,
  Histogram,
  ViolinPlot,
  RidgelinePlot,
  DotPlot,
  ForceDirectedGraph,
  ChordDiagram,
  SankeyDiagram,
  ProcessSankey,
  TreeDiagram,
  PieChart,
  DonutChart,
  GaugeChart,
  FunnelChart,
  GroupedBarChart,
  SwimlaneChart,
  Treemap,
  CirclePack,
  OrbitDiagram,
  ScatterplotMatrix,
  MinimapChart,
  QuadrantChart,
  MultiAxisLineChart,
  CandlestickChart,
  XYCustomChart,
  NetworkCustomChart,
  OrdinalCustomChart,
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
  MobileChartContainer,
  SmallMultipleChart,
  MobileStandardControls,
  clampMobileRange,
  useMobileRangeControls,
  zoomMobileRange,
  ChartGrid,
  CategoryColorProvider,
  useCategoryColors,
  ContextLayout,
  // Cyclical range brush control
  CircularBrush,
  // Direct chart-overlay control
  DirectManipulationControl,
  VISUALIZATION_CONTROL_TYPES,
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
  TemporalHistogram,
  RealtimeSwarmChart,
  RealtimeWaterfallChart,
  RealtimeHeatmap,
  // Pattern fills
  createHatchPattern,
  // Responsive visualization rules
  responsiveRuleMatches,
  resolveResponsiveRules
}

// ── Chart HOC prop types ───────────────────────────────────────────────

export type { LegendLayout } from "./types/legendTypes"
export type { DirectManipulationControlProps, VisualizationControlType } from "./DirectManipulationControl"
export {
  createControlObservationAdapter,
} from "./controls/controlContract"
export { auditVisualizationControls } from "./controls/controlAudit"
export type {
  ControlInputSource,
  ControlObservation,
  ControlObservationAdapterOptions,
  ControlObservationCallback,
  ControlObservationPhase,
  VisualizationControlDefinition,
  VisualizationControlValue,
} from "./controls/controlContract"
export type {
  AuditVisualizationControlsOptions,
  ControlAuditFinding,
  ControlAuditResult,
  ControlAuditStatus,
} from "./controls/controlAudit"

export type {
  ScatterplotProps,
  ConnectedScatterplotProps,
  LineChartProps,
  AreaChartProps,
  SemanticGradientStop,
  DifferenceChartProps,
  StackedAreaChartProps,
  HeatmapProps,
  BubbleChartProps,
  BarChartProps,
  StackedBarChartProps,
  LikertChartProps,
  SwarmPlotProps,
  BoxPlotProps,
  HistogramProps,
  ViolinPlotProps,
  DotPlotProps,
  PieChartProps,
  DonutChartProps,
  GaugeChartProps,
  GaugeThreshold,
  FunnelChartProps,
  GroupedBarChartProps,
  SwimlaneChartProps,
  RidgelinePlotProps,
  OrbitDiagramProps,
  OrbitNode,
  ForceDirectedGraphProps,
  ChordDiagramProps,
  SankeyDiagramProps,
  ProcessSankeyProps,
  ProcessSankeyTick,
  TreeDiagramProps,
  TreemapProps,
  CirclePackProps,
  ScatterplotMatrixProps,
  MinimapChartProps,
  MinimapConfig,
  QuadrantChartProps,
  MultiAxisLineChartProps,
  MultiAxisSeriesConfig,
  CandlestickChartProps,
  // Physics chart prop types: import from "semiotic/physics"
  QuadrantsConfig,
  QuadrantsConfigOverride,
  QuadrantConfig,
  CenterlineStyle,
  BaseChartProps,
  AxisConfig,
  Accessor,
  ChartAccessor,
  ChartMode,
  MobileClearSelectionBehavior,
  MobileSnapBehavior,
  MobileInteractionConfig,
  MobileInteractionProp,
  ResolvedMobileInteractionConfig,
  ResponsiveOrientation,
  ResponsiveRuleCondition,
  ResponsiveRuleContext,
  ResponsiveRule,
  ResponsiveRuleMatch,
  ResponsiveRuleResult
} from "./charts"

// ── StreamXYFrame types ────────────────────────────────────────────────

export type {
  StreamXYFrameProps,
  StreamXYFrameHandle,
  StreamChartType,
  RuntimeMode,
  SceneNode,
  SceneAccessibilityMetadata,
  Changeset,
  StreamScales,
  StreamLayout,
  CurveType,
  CanvasRendererFn,
  XYFrameAxisConfig,
  BandConfig
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

export type { LinkedChartsProps, LegendInteractionMode } from "./LinkedCharts"
export type { CircularBrushProps, CircularBrushValue } from "./CircularBrush"

export {
  useSelection,
  useSelectionActions,
  useLinkedHover,
  useBrushSelection,
  useFilteredData,
  useLinkedChartsActive
} from "./LinkedCharts"

// Read the resolved selection inside a custom layout's overlays (restyle
// without a relayout). Pairs with the layout result's `restyle` callback.
export { useCustomLayoutSelection } from "./stream/customLayoutSelection"
export { useForceLayout } from "./charts/network/useForceLayout"
export type {
  ForceLayoutStatus,
  UseForceLayoutResult
} from "./charts/network/useForceLayout"
export type { CustomLayoutSelection } from "./stream/customLayoutSelection"
export type {
  CustomLayoutFailureDiagnostic,
  CustomLayoutFailureRecovery,
  CustomLayoutFamily
} from "./stream/customLayoutFailure"

export type {
  UseSelectionOptions,
  UseSelectionResult,
  UseSelectionActionsResult,
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
  OnObservationCallback,
  ObservationInputType,
  FocusObservation,
  ActivateObservation,
  AnnotationActivateObservation
} from "./store/ObservationStore"

export { annotationStableId } from "./charts/shared/annotationActivation"
export type {
  ChartAnnotation,
  AnnotationActivationEvent,
  OnAnnotationActivateCallback
} from "./charts/shared/annotationActivation"

export type {
  ResolutionMode,
  SelectionClause,
  Selection
} from "./store/SelectionStore"

// ── Theme types ────────────────────────────────────────────────────────

export type { SemioticTheme } from "./ThemeProvider"
export { LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME } from "./ThemeProvider"
export { COLOR_BLIND_SAFE_CATEGORICAL } from "./store/ThemeStore"
export { themeToCSS, themeToTokens, resolveThemePreset, THEME_PRESETS, CARBON_CATEGORICAL_14, CARBON_ALERT } from "./semiotic-themes"
export type { ThemePresetName } from "./semiotic-themes"

// ── Error boundary types ───────────────────────────────────────────────

export type { ChartErrorBoundaryProps } from "./ChartErrorBoundary"

// ── Accessibility: structured navigation tree ─────────────────────────

export { AccessibleNavTree } from "./AccessibleNavTree"
export type { AccessibleNavTreeProps } from "./AccessibleNavTree"
export { buildNavigationTree } from "./ai/navigationTree"
export type { NavTreeNode, NavTreeRole, BuildNavigationTreeOptions } from "./ai/navigationTree"
export { IntentMark } from "./ai/IntentMark"
export type { IntentMarkProps } from "./ai/IntentMark"
export { intentManifestFromRecipe, summarizeIntentManifest } from "./ai/intentManifest"
export type { IntentManifest, IntentManifestFromRecipeOptions } from "./ai/intentManifest"
export { useNavigationSync } from "./ai/useNavigationSync"
export type { UseNavigationSyncOptions, UseNavigationSyncResult } from "./ai/useNavigationSync"

// ── Chart container types ─────────────────────────────────────────────

export type {
  ChartContainerProps,
  ChartContainerHandle,
  ChartContainerDataAudit,
  ChartContainerDataAuditOptions,
  ChartContainerMobileOptions,
  ChartNotification,
  ChartNotificationLevel,
} from "./ChartContainer"
export type {
  MobileChartChip,
  MobileChartContainerProps,
  MobileChartDetailMode,
} from "./MobileChartContainer"
export type {
  MobileStandardBrushControls,
  MobileStandardControlKind,
  MobileStandardControlLegendItem,
  MobileStandardControlRequest,
  MobileStandardControlsMode,
  MobileStandardControlsProps,
  MobileStandardLegendControls,
  MobileStandardZoomControls,
  UseMobileRangeControlsOptions,
  UseMobileRangeControlsResult,
} from "./MobileStandardControls"
export type { MobileVisualizationContract } from "./charts/shared/auditMobileVisualization"
export type {
  SmallMultipleChartProps,
  SmallMultipleExtent,
  SmallMultipleItem,
  SmallMultipleRenderContext,
  SmallMultipleSharedExtent,
} from "./SmallMultipleChart"
export type { ChartGridProps } from "./ChartGrid"
export type { CategoryColorMap, CategoryColorProviderProps } from "./CategoryColors"
export type { ContextLayoutProps } from "./ContextLayout"
export type { DetailsPanelProps } from "./DetailsPanel"

// ── Chart state serialization types ───────────────────────────────────

export type { ChartConfig, ToConfigOptions, CopyFormat } from "./export/chartConfig"
export type { VegaLiteSpec, VegaLiteEncoding } from "./data/fromVegaLite"
export type { SerializedSelections, SerializedSelection, SerializedFieldSelection } from "./export/selectionSerializer"

// ── Pattern fill types ────────────────────────────────────────────────

export type { HatchPatternOptions } from "./charts/shared/hatchPattern"

// ── Declarative hatch fill (canvas + SVG) ──────────────────────────────
export { isHatchFill, hatchPatternDef, resolveSvgFill, hatchFillId } from "./charts/shared/hatchFill"
export type { HatchFill } from "./charts/shared/hatchFill"

// ── Threshold-aware style rules (all families' `styleRules`) ───────────
export {
  resolveStyleRules, matchesThreshold, ruleMatches, makeRuleValueResolver,
  makeXYRuleContext, makeNodeRuleContext, composeStyleRules, makeStyleRuleStyleFn,
  styleRulesToPieceStyle, styleRulesToXYStyle, styleRulesToNodeStyle,
} from "./charts/shared/styleRules"
export type {
  StyleRule,
  StyleRuleStyle,
  StyleRuleThreshold,
  StyleRuleContext,
  StyleRulePredicate,
} from "./charts/shared/styleRules"

// ── Shared annotation-label renderer (halo / box backdrops) ────────────
export { AnnotationLabel, estimateLabelWidth } from "./charts/shared/AnnotationLabel"
export type { AnnotationLabelBackground, AnnotationLabelBackgroundConfig, AnnotationLabelProps } from "./charts/shared/AnnotationLabel"

// ── Format utilities ───────────────────────────────────────────────────

export { smartTickFormat, adaptiveTimeTicks } from "./charts/shared/formatUtils"

// Color manipulation utilities
export { darkenColor, lightenColor } from "./charts/shared/colorManipulation"

// ── Tooltip types ──────────────────────────────────────────────────────

export type {
  TooltipProp,
  TooltipConfig,
  TooltipField,
  MultiLineTooltipConfig
} from "./Tooltip/Tooltip"

// Smart default-tooltip field selection — reusable by custom-chart authors
// building their own tooltip content from an arbitrary datum.
export { smartTooltipEntries } from "./charts/shared/tooltipUtils"
export type { SmartTooltipEntry, SmartTooltipResult } from "./charts/shared/tooltipUtils"

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
export type { RealtimeTemporalHistogramProps, RealtimeHistogramProps, TemporalHistogramProps } from "./charts/realtime/RealtimeHistogram"
export type { RealtimeSwarmChartProps } from "./charts/realtime/RealtimeSwarmChart"
export type { RealtimeWaterfallChartProps } from "./charts/realtime/RealtimeWaterfallChart"
export type { RealtimeHeatmapProps } from "./charts/realtime/RealtimeHeatmap"

// Mirror a controlled React array into any push-API chart's buffer. Lives in
// the realtime barrel too; re-exported here since the push HOCs it drives
// (realtime + ordinal + XY) are all importable from the root entry.
export { useSyncedPushData, syncPushBuffer } from "./charts/shared/useSyncedPushData"
export type {
  SyncedPushHandle,
  SyncedPushDataOptions,
  PushIdAccessor,
} from "./charts/shared/useSyncedPushData"

// ── Annotation provenance + lifecycle (talk-readiness M1) ──────────────
// Type surface re-exported from the main entry per the talk-readiness
// roadmap. Runtime lifecycle helpers and semantic-anchor resolution live
// under `semiotic/ai` and the shared annotation resolver.
export type {
  AnnotationProvenance,
  AnnotationSource,
  AnnotationActorKind,
  AnnotationBasis,
  AnnotationLifecycle,
  AnnotationFreshness,
  AnnotationStatus,
  AnnotationAnchor,
  Annotated,
} from "./ai/annotationProvenance"

export { MobileAnnotationCalloutList } from "./MobileAnnotationCalloutList"
export type { MobileAnnotationCalloutListProps } from "./MobileAnnotationCalloutList"

// Runtime-neutral motion encodings shared by realtime and physics adapters.
export {
  compileMotionEncoding,
  resolveMotionAccessor,
  resolveMotionAge,
  opacityFromAge,
  resolveMotionVector,
  deriveMotionVector
} from "./charts/shared/motionEncoding"
export type {
  MotionEncodingConstant,
  MotionEncodingAccessor,
  MotionTimeBasis,
  MotionTimeUnit,
  MotionCoordinateSpace,
  MotionTimeEncoding,
  MotionPlacementEncoding,
  MotionKinematicsEncoding,
  MotionProcessEncoding,
  MotionAccessibleEncoding,
  MotionEncoding,
  ResolvedMotionEncodingRow,
  MotionEncodingCompilation,
  CompileMotionEncodingOptions,
  ResolveMotionAgeOptions,
  ResolvedMotionAge,
  MotionAgeOpacityType,
  MotionAgeOpacityOptions,
  MotionPoint,
  ResolvedMotionVector
} from "./charts/shared/motionEncoding"
