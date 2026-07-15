/**
 * Higher-order chart components
 *
 * These components provide simplified, opinionated wrappers around
 * XYFrame, OrdinalFrame, and NetworkFrame for common chart types.
 *
 * @module charts
 */

// ============================================================================
// XY Charts (based on XYFrame)
// ============================================================================

export { Scatterplot } from "./xy/Scatterplot"
export type { ScatterplotProps } from "./xy/Scatterplot"
export { ConnectedScatterplot } from "./xy/ConnectedScatterplot"
export type { ConnectedScatterplotProps } from "./xy/ConnectedScatterplot"

export { LineChart } from "./xy/LineChart"
export type { LineChartProps } from "./xy/LineChart"

export { AreaChart } from "./xy/AreaChart"
export type { AreaChartProps, SemanticGradientStop } from "./xy/AreaChart"

export { DifferenceChart } from "./xy/DifferenceChart"
export type { DifferenceChartProps } from "./xy/DifferenceChart"

export { StackedAreaChart } from "./xy/StackedAreaChart"
export type { StackedAreaChartProps } from "./xy/StackedAreaChart"

export { Heatmap } from "./xy/Heatmap"
export type { HeatmapProps } from "./xy/Heatmap"

export { BubbleChart } from "./xy/BubbleChart"
export type { BubbleChartProps } from "./xy/BubbleChart"

export { ScatterplotMatrix } from "./xy/ScatterplotMatrix"
export type { ScatterplotMatrixProps } from "./xy/ScatterplotMatrix"

export { MinimapChart } from "./xy/MinimapChart"
export type { MinimapChartProps, MinimapConfig } from "./xy/MinimapChart"

export { QuadrantChart } from "./xy/QuadrantChart"
export type { QuadrantChartProps, QuadrantsConfig, QuadrantsConfigOverride, QuadrantConfig, CenterlineStyle } from "./xy/QuadrantChart"

export { MultiAxisLineChart } from "./xy/MultiAxisLineChart"
export type { MultiAxisLineChartProps, MultiAxisSeriesConfig } from "./xy/MultiAxisLineChart"

export { CandlestickChart } from "./xy/CandlestickChart"
export type { CandlestickChartProps } from "./xy/CandlestickChart"

// ============================================================================
// Custom Chart (escape hatch for bespoke layouts)
// ============================================================================

export { XYCustomChart } from "./custom/XYCustomChart"
export type { XYCustomChartProps } from "./custom/XYCustomChart"

export { NetworkCustomChart } from "./custom/NetworkCustomChart"
export type { NetworkCustomChartProps } from "./custom/NetworkCustomChart"

export { OrdinalCustomChart } from "./custom/OrdinalCustomChart"
export type { OrdinalCustomChartProps } from "./custom/OrdinalCustomChart"

// ============================================================================
// Ordinal Charts (based on OrdinalFrame)
// ============================================================================

export { BarChart } from "./ordinal/BarChart"
export type { BarChartProps } from "./ordinal/BarChart"

export { StackedBarChart } from "./ordinal/StackedBarChart"
export type { StackedBarChartProps } from "./ordinal/StackedBarChart"

export { LikertChart } from "./ordinal/LikertChart"
export type { LikertChartProps, LikertChartHandle } from "./ordinal/LikertChart"

export { SwarmPlot } from "./ordinal/SwarmPlot"
export type { SwarmPlotProps } from "./ordinal/SwarmPlot"

export { BoxPlot } from "./ordinal/BoxPlot"
export type { BoxPlotProps } from "./ordinal/BoxPlot"

export { Histogram } from "./ordinal/Histogram"
export type { HistogramProps } from "./ordinal/Histogram"

export { ViolinPlot } from "./ordinal/ViolinPlot"
export type { ViolinPlotProps } from "./ordinal/ViolinPlot"

export { RidgelinePlot } from "./ordinal/RidgelinePlot"
export type { RidgelinePlotProps } from "./ordinal/RidgelinePlot"

export { FunnelChart } from "./ordinal/FunnelChart"
export type { FunnelChartProps } from "./ordinal/FunnelChart"

export { DotPlot } from "./ordinal/DotPlot"
export type { DotPlotProps } from "./ordinal/DotPlot"

export { PieChart } from "./ordinal/PieChart"
export type { PieChartProps } from "./ordinal/PieChart"

export { DonutChart } from "./ordinal/DonutChart"
export type { DonutChartProps } from "./ordinal/DonutChart"

export { GaugeChart } from "./ordinal/GaugeChart"
export type { GaugeChartProps, GaugeThreshold } from "./ordinal/GaugeChart"

export { GroupedBarChart } from "./ordinal/GroupedBarChart"
export type { GroupedBarChartProps } from "./ordinal/GroupedBarChart"

export { SwimlaneChart } from "./ordinal/SwimlaneChart"
export type { SwimlaneChartProps } from "./ordinal/SwimlaneChart"

// ============================================================================
// Network Charts (based on NetworkFrame)
// ============================================================================

export { ForceDirectedGraph } from "./network/ForceDirectedGraph"
export type { ForceDirectedGraphProps } from "./network/ForceDirectedGraph"

export { ChordDiagram } from "./network/ChordDiagram"
export type { ChordDiagramProps } from "./network/ChordDiagram"

export { SankeyDiagram } from "./network/SankeyDiagram"
export type { SankeyDiagramProps } from "./network/SankeyDiagram"

export { ProcessSankey } from "./network/ProcessSankey"
export type { ProcessSankeyProps, ProcessSankeyTick } from "./network/ProcessSankey"

// ProcessSankey temporal-validation primitives. Surfaced so external
// code (data pipelines, AI agents constructing graphs, server-side
// validators) can pre-check node/edge sets against the same rules
// the chart enforces — value conservation per node, edge endpoints
// resolve, etc.
export {
  validateProcessSankey,
  formatProcessSankeyIssue,
} from "./network/processSankey/algorithm"
export type {
  ProcessSankeyNode as ProcessSankeyValidatorNode,
  ProcessSankeyEdge as ProcessSankeyValidatorEdge,
  ProcessSankeyIssue,
} from "./network/processSankey/algorithm"

export { TreeDiagram } from "./network/TreeDiagram"
export type { TreeDiagramProps } from "./network/TreeDiagram"

export { Treemap } from "./network/Treemap"
export type { TreemapProps } from "./network/Treemap"

export { CirclePack } from "./network/CirclePack"
export type { CirclePackProps } from "./network/CirclePack"
export { OrbitDiagram } from "./network/OrbitDiagram"
export type { OrbitDiagramProps, OrbitNode } from "./network/OrbitDiagram"

// ============================================================================
// Realtime Charts
// ============================================================================

export { RealtimeLineChart } from "./realtime/RealtimeLineChart"
export type { RealtimeLineChartProps } from "./realtime/RealtimeLineChart"

export { RealtimeTemporalHistogram, RealtimeHistogram, TemporalHistogram } from "./realtime/RealtimeHistogram"
export type { RealtimeTemporalHistogramProps, RealtimeHistogramProps, TemporalHistogramProps } from "./realtime/RealtimeHistogram"

export { RealtimeSwarmChart } from "./realtime/RealtimeSwarmChart"
export type { RealtimeSwarmChartProps } from "./realtime/RealtimeSwarmChart"

export { RealtimeWaterfallChart } from "./realtime/RealtimeWaterfallChart"
export type { RealtimeWaterfallChartProps } from "./realtime/RealtimeWaterfallChart"

export { RealtimeHeatmap } from "./realtime/RealtimeHeatmap"
export type { RealtimeHeatmapProps } from "./realtime/RealtimeHeatmap"

// ============================================================================
// Physics Charts
// ============================================================================

export { GaltonBoardChart } from "./physics/GaltonBoardChart"
export type {
  GaltonBoardChartProps,
  GaltonBoardReferenceLine
} from "./physics/GaltonBoardChart"

export { EventDropChart } from "./physics/EventDropChart"
export type { EventDropChartProps } from "./physics/EventDropChart"

export { PhysicsPileChart } from "./physics/PhysicsPileChart"
export type { PhysicsPileChartProps } from "./physics/PhysicsPileChart"

export { CollisionSwarmChart } from "./physics/CollisionSwarmChart"
export type { CollisionSwarmChartProps } from "./physics/CollisionSwarmChart"

export {
  GauntletChart,
  GuantletChart,
  planGauntletPropertyWork,
  replaceGauntletNegative
} from "./physics/GauntletChart"
export type {
  GauntletChartProps,
  GauntletEffect,
  GauntletEvent,
  GauntletEventContext,
  GauntletEventLogItem,
  GauntletGate,
  GauntletLayout,
  GauntletNegativeReplacementOptions,
  GauntletPopSpec,
  GauntletProjectPlacement,
  GauntletProjectState,
  GauntletPropertyForceContext,
  GauntletPropertyDefinition,
  GauntletPropertyWorkPlan,
  GauntletPropertyWorkPlanOptions
} from "./physics/GauntletChart"
export {
  physicsProcessBoundaryColliders,
  physicsProcessGroupSemanticItems,
  physicsProcessRegionSemanticItem,
  physicsProcessStageSemanticItems
} from "./physics/physicsProcessPrimitives"
export type {
  PhysicsProcessBodyGroup,
  PhysicsProcessBoundaryOptions,
  PhysicsProcessStage
} from "./physics/physicsProcessPrimitives"
export {
  absorbRegion,
  bodyGroupSpec,
  capacitatedRegion,
  chargeGateRegion,
  forceFieldRegion,
  membraneRegion,
  portalRegion,
  pressureFieldRegion,
  processLaneWalls,
  processStageLayout,
  processStageRegions,
  routeSurfaceRegion,
  stageTargetInVolume
} from "../recipes/processPhysics"
export {
  aggregateRegionCounts,
  groupCompletionRows,
  regionCountsToProjectionRows
} from "../recipes/processAggregates"
export { processVolumePolygons } from "../recipes/processVolumeGeometry"
export {
  createProcessJourneyLedger,
  processJourneyRows,
  updateProcessJourney
} from "../recipes/processJourney"
export type {
  BodyGroupSpec,
  BodyGroupSpecOptions,
  ProcessMembraneDef,
  ProcessRegionBaseOptions,
  ProcessStageRegionOptions,
  ProcessStageDef,
  ProcessVolumeLayout,
  ProcessVolumeLayoutOptions,
  ProcessVolumeMembraneBand,
  ProcessVolumeShape,
  ProcessVolumeStageBand
} from "../recipes/processPhysics"
export type {
  RegionCountBucket,
  RegionCountMap
} from "../recipes/processAggregates"
export type {
  ProcessVolumePoint,
  ProcessVolumePolygon,
  ProcessVolumePolygonRole
} from "../recipes/processVolumeGeometry"
export type {
  ProcessJourneyEntityState,
  ProcessJourneyLedger,
  ProcessJourneyRow,
  ProcessJourneyStage,
  ProcessJourneyUpdateOptions
} from "../recipes/processJourney"

export { PhysicalFlowChart } from "./physics/PhysicalFlowChart"
export type { PhysicalFlowChartProps } from "./physics/PhysicalFlowChart"

export { ProcessFlowChart } from "./physics/ProcessFlowChart"
export type {
  ProcessFlowChartProps,
  ProcessFlowProjectionMetadata,
  ProcessFlowStageDef
} from "./physics/ProcessFlowChart"

export { PhysicsCustomChart } from "./physics/PhysicsCustomChart"
export type {
  PhysicsCustomChartProps,
  PhysicsCustomLayout,
  PhysicsCustomLayoutContext,
  PhysicsCustomLayoutResult,
  PhysicsCustomSpawnDatumResult
} from "./physics/PhysicsCustomChart"

// ============================================================================
// Shared Utilities
// ============================================================================

// Re-export shared types for convenience
export type {
  BaseChartProps,
  AxisConfig,
  Accessor,
  ChartAccessor,
  ChartMode,
  MobileClearSelectionBehavior,
  MobileSnapBehavior,
  MobileInteractionConfig,
  MobileInteractionProp,
  MobileStandardControlsMode,
  ResolvedMobileInteractionConfig,
} from "./shared/types"
export { responsiveRuleMatches, resolveResponsiveRules } from "./shared/responsiveRules"
export type {
  ResponsiveOrientation,
  ResponsiveRuleCondition,
  ResponsiveRuleContext,
  ResponsiveRule,
  ResponsiveRuleMatch,
  ResponsiveRuleResult,
} from "./shared/responsiveRules"

// Shared hooks for building custom chart wrappers
export { useColorScale, useSortedData, DEFAULT_COLOR } from "./shared/hooks"

// Color utilities (if users want to use them directly)
export {
  COLOR_SCHEMES,
  DEFAULT_COLORS,
  getColor,
  createColorScale,
  getSize
} from "./shared/colorUtils"

// Format utilities (if users want to use them directly)
export {
  formatNumber,
  formatDate,
  formatAxis,
  createTooltip,
  formatLargeNumber,
  truncateText,
  adaptiveTimeTicks
} from "./shared/formatUtils"

// Color manipulation utilities for anomaly/forecast styling
export { darkenColor, lightenColor } from "./shared/colorManipulation"

// Tooltip utilities
export {
  Tooltip,
  MultiLineTooltip,
  normalizeTooltip
} from "../Tooltip/Tooltip"

export type {
  TooltipProp,
  TooltipConfig,
  TooltipField,
  MultiLineTooltipConfig
} from "../Tooltip/Tooltip"

// Pattern fills for canvas charts
export { createHatchPattern } from "./shared/hatchPattern"
export type { HatchPatternOptions } from "./shared/hatchPattern"

// Declarative hatch-fill descriptor — resolves to a CanvasPattern (canvas) or
// an SVG <pattern> (SSR/overlay). Usable anywhere a `style.fill` is accepted.
export { isHatchFill, hatchPatternDef, resolveSvgFill, hatchFillId } from "./shared/hatchFill"
export type { HatchFill } from "./shared/hatchFill"

// Declarative, threshold-aware style rules (all chart families' `styleRules`).
export {
  resolveStyleRules, matchesThreshold, ruleMatches, makeRuleValueResolver,
  makeXYRuleContext, makeNodeRuleContext, composeStyleRules, makeStyleRuleStyleFn,
} from "./shared/styleRules"
export type {
  StyleRule,
  StyleRuleStyle,
  StyleRuleThreshold,
  StyleRuleContext,
  StyleRulePredicate,
} from "./shared/styleRules"

// Shared annotation-label renderer (halo / semitransparent box backdrops).
export { AnnotationLabel, estimateLabelWidth } from "./shared/AnnotationLabel"
export type { AnnotationLabelBackground, AnnotationLabelBackgroundConfig, AnnotationLabelProps } from "./shared/AnnotationLabel"
