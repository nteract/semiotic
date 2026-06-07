"use client"

// Semiotic AI — curated HOC-only surface for AI code generation
// Import: import { LineChart, BarChart, ... } from "semiotic/ai"

// XY Charts
export { LineChart } from "./charts/xy/LineChart"
export { AreaChart } from "./charts/xy/AreaChart"
export { DifferenceChart } from "./charts/xy/DifferenceChart"
export { StackedAreaChart } from "./charts/xy/StackedAreaChart"
export { Scatterplot } from "./charts/xy/Scatterplot"
export { ConnectedScatterplot } from "./charts/xy/ConnectedScatterplot"
export { BubbleChart } from "./charts/xy/BubbleChart"
export { Heatmap } from "./charts/xy/Heatmap"
export { ScatterplotMatrix } from "./charts/xy/ScatterplotMatrix"
export { MinimapChart } from "./charts/xy/MinimapChart"
export { QuadrantChart } from "./charts/xy/QuadrantChart"
export { MultiAxisLineChart } from "./charts/xy/MultiAxisLineChart"
export { CandlestickChart } from "./charts/xy/CandlestickChart"

// Coordinated Views
export { LinkedCharts } from "./LinkedCharts"
export {
  useSelection,
  useLinkedHover,
  useBrushSelection,
  useFilteredData
} from "./LinkedCharts"

// Ordinal Charts
export { BarChart } from "./charts/ordinal/BarChart"
export { StackedBarChart } from "./charts/ordinal/StackedBarChart"
export { GroupedBarChart } from "./charts/ordinal/GroupedBarChart"
export { SwarmPlot } from "./charts/ordinal/SwarmPlot"
export { BoxPlot } from "./charts/ordinal/BoxPlot"
export { Histogram } from "./charts/ordinal/Histogram"
export { ViolinPlot } from "./charts/ordinal/ViolinPlot"
export { DotPlot } from "./charts/ordinal/DotPlot"
export { RidgelinePlot } from "./charts/ordinal/RidgelinePlot"
export { PieChart } from "./charts/ordinal/PieChart"
export { DonutChart } from "./charts/ordinal/DonutChart"
export { GaugeChart } from "./charts/ordinal/GaugeChart"
export { FunnelChart } from "./charts/ordinal/FunnelChart"
export { LikertChart } from "./charts/ordinal/LikertChart"
export { SwimlaneChart } from "./charts/ordinal/SwimlaneChart"

// Network Charts
export { ForceDirectedGraph } from "./charts/network/ForceDirectedGraph"
export { ChordDiagram } from "./charts/network/ChordDiagram"
export { SankeyDiagram } from "./charts/network/SankeyDiagram"
export { ProcessSankey } from "./charts/network/ProcessSankey"
export { TreeDiagram } from "./charts/network/TreeDiagram"
export { Treemap } from "./charts/network/Treemap"
export { CirclePack } from "./charts/network/CirclePack"
export { OrbitDiagram } from "./charts/network/OrbitDiagram"

// Realtime Charts
export { RealtimeLineChart } from "./charts/realtime/RealtimeLineChart"
export {
  RealtimeHistogram,
  TemporalHistogram
} from "./charts/realtime/RealtimeHistogram"
export { RealtimeSwarmChart } from "./charts/realtime/RealtimeSwarmChart"
export { RealtimeWaterfallChart } from "./charts/realtime/RealtimeWaterfallChart"
export { RealtimeHeatmap } from "./charts/realtime/RealtimeHeatmap"

// Value Charts
export { BigNumber } from "./charts/value/BigNumber"

// Essential utilities
export { TooltipProvider } from "./store/TooltipStore"
export { MultiLineTooltip } from "./Tooltip/Tooltip"

// Theme
export { ThemeProvider, useTheme } from "./ThemeProvider"

// Export utility
export { exportChart } from "./export/exportChart"

// Chart container
export { ChartContainer } from "./ChartContainer"
export type {
  ChartContainerProps,
  ChartContainerHandle
} from "./ChartContainer"

// Layout
export { ChartGrid } from "./ChartGrid"
export type { ChartGridProps } from "./ChartGrid"

// Context layout
export { ContextLayout } from "./ContextLayout"
export type { ContextLayoutProps } from "./ContextLayout"

// Shared categorical styles
export { CategoryColorProvider, useCategoryColors } from "./CategoryColors"
export type {
  CategoryColorMap,
  CategoryColorProviderProps
} from "./CategoryColors"

// Details panel
export { DetailsPanel } from "./DetailsPanel"
export type { DetailsPanelProps } from "./DetailsPanel"

// AI validation
export { validateProps } from "./charts/shared/validateProps"
export type { ValidationResult } from "./charts/shared/validateProps"

// Anti-pattern diagnostics
export { diagnoseConfig } from "./charts/shared/diagnoseConfig"
export type { Diagnosis, DiagnosisResult } from "./charts/shared/diagnoseConfig"

// Accessibility audit — Chartability (POUR-CAF) heuristics over a chart config
export {
  auditAccessibility,
  formatAccessibilityAudit,
  accessibilityCaveats
} from "./charts/shared/auditAccessibility"
export type {
  A11yPrinciple,
  A11yStatus,
  A11yFinding,
  AccessibilityAuditResult,
  AuditAccessibilityOptions
} from "./charts/shared/auditAccessibility"

// Statistical overlay types
export type {
  AnomalyConfig,
  ForecastConfig
} from "./charts/shared/statisticalOverlays"

// Chart state serialization
export {
  toConfig,
  fromConfig,
  toURL,
  fromURL,
  copyConfig,
  configToJSX
} from "./export/chartConfig"
export type {
  ChartConfig,
  ToConfigOptions,
  CopyFormat
} from "./export/chartConfig"
export {
  serializeSelections,
  deserializeSelections
} from "./export/selectionSerializer"
export type {
  SerializedSelections,
  SerializedSelection,
  SerializedFieldSelection
} from "./export/selectionSerializer"

// Vega-Lite translator
export { fromVegaLite } from "./data/fromVegaLite"
export type { VegaLiteSpec, VegaLiteEncoding } from "./data/fromVegaLite"

// AI interrogation — headless hook + data summary
export { useChartInterrogation } from "./store/useChartInterrogation"
export type {
  UseChartInterrogationOptions,
  UseChartInterrogationResult,
  InterrogationContext,
  InterrogationFocus,
  InterrogationResult,
  InterrogationQuery,
  InterrogationMessage
} from "./store/useChartInterrogation"
export { useChartFocus } from "./store/useChartFocus"
export type { UseChartFocusOptions } from "./store/useChartFocus"
export { summarizeData } from "./data/DataSummarizer"
export {
  describeChart,
  resolveCommunicativeAct,
  communicativeActForIntent
} from "./ai/describeChart"
export type {
  DescribeChartResult,
  DescribeChartOptions,
  DescribeLevel,
  CommunicativeAct,
  DescribeCapabilityContext
} from "./ai/describeChart"
// Agent-reader grounding payload — describeChart (L1–L3) + capability intent
// (L4) + nav-tree structure as one payload an LLM reads to interpret a chart.
export { buildReaderGrounding } from "./ai/readerGrounding"
export type {
  ChartReaderGrounding,
  ChartReaderGroundingOptions,
  ChartReaderGroundingIntent
} from "./ai/readerGrounding"
export {
  buildNavigationTree,
  flattenVisible,
  countNodes
} from "./ai/navigationTree"
export type {
  NavTreeNode,
  NavTreeRole,
  BuildNavigationTreeOptions
} from "./ai/navigationTree"
export { AccessibleNavTree } from "./AccessibleNavTree"
export type { AccessibleNavTreeProps } from "./AccessibleNavTree"
export { useNavigationSync } from "./ai/useNavigationSync"
export type {
  UseNavigationSyncOptions,
  UseNavigationSyncResult
} from "./ai/useNavigationSync"
export type {
  DataSummary,
  FieldSummary,
  FieldType,
  NumericFieldSummary,
  DateFieldSummary,
  CategoricalFieldSummary,
  UnknownFieldSummary,
  SummarizeOptions
} from "./data/DataSummarizer"

// Chart capability layer — heuristic recommendations + intent taxonomy
export { profileData } from "./ai/profileData"
export type { ProfileDataOptions } from "./ai/profileData"
export {
  suggestCharts,
  suggestChartsGrouped,
  scoreChart,
  explainCapabilityFit
} from "./ai/suggestCharts"
export type {
  SuggestChartsOptions,
  RejectedCapability,
  ExplainCapabilityFitResult
} from "./ai/suggestCharts"

// Scale-aware suggestion overlay — declarative dataset-scale and quality
// schemas that bias recommendations and emit per-band groupings.
export {
  DEFAULT_SCALE_THRESHOLDS,
  applyScaleBias,
  classifyRowBand,
  classifyCardinalityBand,
  classifyFieldBand,
  compareBands,
  computeEffectiveScale,
  resolveRowsToNumber,
  resolveCardinalityToNumber,
  scaleHints
} from "./ai/dataScaleProfile"
export type {
  DataScaleProfile,
  DataQualityProfile,
  ScaleBand,
  CardinalityBand,
  FieldBand,
  ScaleThresholds,
  ChartScalePreference,
  EffectiveScale,
  ScaleBiasResult,
  ScaleFitFn,
  ScaleFitResult,
  QualityFitFn,
  ScaleHintInput
} from "./ai/dataScaleProfile"
export { inferIntent } from "./ai/inferIntent"
export type { InferIntentResult } from "./ai/inferIntent"
export { suggestDashboard } from "./ai/suggestDashboard"
export type {
  DashboardPanel,
  DashboardSuggestion,
  SuggestDashboardOptions
} from "./ai/suggestDashboard"

// Audience-aware suggestion + literacy-growth surface
export {
  applyAudienceBias,
  effectiveFamiliarity,
  stretchFamiliarityCeiling,
  receivabilityBias
} from "./ai/audienceProfile"
export type {
  AudienceProfile,
  AudienceTarget,
  AudienceBiasResult,
  ReceptionModality,
  ReceivabilitySignal
} from "./ai/audienceProfile"
export {
  executivePersona,
  analystPersona,
  dataScientistPersona,
  BUILT_IN_AUDIENCES
} from "./ai/audiences"
export { suggestStretchCharts } from "./ai/suggestStretchCharts"
export type {
  StretchSuggestion,
  SuggestStretchChartsOptions
} from "./ai/suggestStretchCharts"

// Streaming intent — parallel API for live charts (schema-based, not row-based)
export {
  suggestStreamCharts,
  registerStreamChartCapability,
  unregisterStreamChartCapability,
  getStreamCapabilities
} from "./ai/suggestStreamCharts"
export type { SuggestStreamChartsOptions } from "./ai/suggestStreamCharts"
export type {
  StreamSchema,
  StreamFieldSchema,
  StreamFieldKind,
  StreamChartCapability,
  StreamIntentScorer,
  StreamSuggestion
} from "./ai/streamingTypes"
export { diffProfile } from "./ai/diffProfile"
export type {
  ProfileDiff,
  FieldTypeChange,
  PrimaryRoleChange,
  PrimaryRole
} from "./ai/diffProfile"
export { repairChartConfig } from "./ai/repairChartConfig"
export type {
  RepairResult,
  RepairOkResult,
  RepairAlternativeResult,
  RepairUnknownResult,
  RepairOptions
} from "./ai/repairChartConfig"
export { runQualityScorecard } from "./ai/qualityScorecard"
export type {
  ScorecardFixture,
  ScorecardReport,
  PerCapabilityScore,
  PerFixtureScore
} from "./ai/qualityScorecard"
export { CANONICAL_FIXTURES } from "./ai/qualityFixtures"
export { useChartSuggestions } from "./ai/useChartSuggestions"
export type {
  UseChartSuggestionsOptions,
  UseChartSuggestionsResult
} from "./ai/useChartSuggestions"
export {
  getCapabilities,
  getCapability,
  registerChartCapability,
  unregisterChartCapability,
  // XY
  LineChartCapability,
  AreaChartCapability,
  StackedAreaChartCapability,
  ScatterplotCapability,
  ConnectedScatterplotCapability,
  BubbleChartCapability,
  QuadrantChartCapability,
  MultiAxisLineChartCapability,
  MinimapChartCapability,
  DifferenceChartCapability,
  CandlestickChartCapability,
  HeatmapCapability,
  // Ordinal
  BarChartCapability,
  GroupedBarChartCapability,
  StackedBarChartCapability,
  DotPlotCapability,
  PieChartCapability,
  DonutChartCapability,
  FunnelChartCapability,
  GaugeChartCapability,
  LikertChartCapability,
  SwimlaneChartCapability,
  // Distribution
  HistogramCapability,
  BoxPlotCapability,
  SwarmPlotCapability,
  ViolinPlotCapability,
  RidgelinePlotCapability,
  // Network
  ForceDirectedGraphCapability,
  SankeyDiagramCapability,
  ChordDiagramCapability,
  ProcessSankeyCapability,
  // Hierarchy
  TreeDiagramCapability,
  TreemapCapability,
  CirclePackCapability,
  OrbitDiagramCapability,
  // Geo
  ChoroplethMapCapability,
  ProportionalSymbolMapCapability,
  FlowMapCapability,
  DistanceCartogramCapability
} from "./ai/chartCapabilities"
export type {
  ChartCapability,
  ChartDataProfile,
  ChartFamily,
  ChartImportPath,
  ChartRubric,
  ChartVariant,
  FieldCandidate,
  FieldKind,
  FitResult,
  IntentScorer,
  ScaledSuggestionGroups,
  Suggestion,
  SuggestionScaleRange
} from "./ai/chartCapabilityTypes"
export {
  listIntents,
  getIntent,
  registerIntent,
  BUILT_IN_INTENT_IDS
} from "./ai/intents"
export type { BuiltInIntentId, IntentId, IntentDescriptor } from "./ai/intents"

// Variant discovery — interface design (M1).
// Heuristic implementation lands in M2; MCP `proposeChartVariants`
// wraps this surface in M3; the external-model plug point is M4.
// `proposeVariant` already dispatches through any functions registered
// via `registerVariantDiscovery`, so consumers can wire end-to-end now.
export {
  proposeVariant,
  evaluateVariantProposal,
  registerVariantDiscovery,
  getRegisteredVariantDiscovery,
  clearVariantDiscovery
} from "./ai/variantDiscovery"
export type {
  VariantProposal,
  VariantProposalSource,
  VariantScore,
  VariantRejectionReason,
  VariantDiscoveryContext,
  ProposeVariantFn,
  EvaluateVariantProposalFn
} from "./ai/variantDiscovery"

// Annotation provenance + lifecycle.
// M1: type surface + withProvenance builder.
// M2: computeAnnotationFreshness + applyAnnotationLifecycle (default
// visual treatment, overridable per band; expired hidden by default).
// M3: stable-id anchor resolution after data refresh.
export {
  withProvenance,
  withCurrentProvenance,
  currentTimestamp,
  computeAnnotationFreshness,
  applyAnnotationLifecycle,
  applyAnnotationStatus,
  filterAnnotationsByStatus,
  annotationFreshnessFor,
  bandFromAge,
  DEFAULT_LIFECYCLE_THRESHOLDS
} from "./ai/annotationProvenance"
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
  ComputeAnnotationFreshnessOptions,
  AnnotationLifecycleTreatment,
  ApplyAnnotationLifecycleOptions,
  AnnotationStatusTreatment,
  AnnotationStatusVisibility,
  LifecycleBand,
  LifecycleBandThresholds
} from "./ai/annotationProvenance"

// Conversation-arc — React hook + summarize helper.
// Hook handles subscription teardown and snapshot stability for
// `useSyncExternalStore` consumers. `summarizeArc` is the pure
// reducer (server-safe, replay-safe).
export { useConversationArc, summarizeArc } from "./ai/useConversationArc"
export type {
  UseConversationArcOptions,
  UseConversationArcResult,
  ConversationArcSummary
} from "./ai/useConversationArc"

// Conversation-arc telemetry — opt-in event vocabulary + ring-buffer store +
// persistence / replay helpers.
// Default surface is a no-op; call `enableConversationArc()` to start
// recording. Durable sinks are explicitly registered, so disabled
// telemetry stays zero-overhead.
export {
  enableConversationArc,
  disableConversationArc,
  getConversationArcStore,
  subscribeToConversationArcChange,
  registerConversationArcSink,
  createLocalStorageConversationArcSink,
  createIndexedDBConversationArcSink,
  createWebhookConversationArcSink,
  loadConversationArc,
  replayConversationArc,
  recordAudienceChange,
  recordAnnotationStatusChange
} from "./ai/conversationArc"
export type {
  ConversationArcEvent,
  ConversationArcEventType,
  ConversationArcEventInput,
  ConversationArcStore,
  ConversationArcListener,
  ConversationArcSink,
  ConversationArcStorageLike,
  EnableConversationArcOptions,
  LoadConversationArcOptions,
  LocalStorageConversationArcSinkOptions,
  IndexedDBConversationArcSinkOptions,
  ConversationArcWebhookFetch,
  WebhookConversationArcSinkOptions,
  SuggestionShownEvent,
  SuggestionChosenEvent,
  AudienceSetEvent,
  ChartRenderedEvent,
  ChartEditedEvent,
  ChartReplacedEvent,
  ChartExportedEvent,
  ChartAbandonedEvent,
  InterrogationAskedEvent,
  InterrogationAnsweredEvent,
  NavNodeFocusedEvent,
  NavBranchExpandedEvent,
  AnnotationStatusChangedEvent
} from "./ai/conversationArc"

// AI Observation hooks
export { useChartObserver } from "./store/useObservation"
export type {
  UseChartObserverOptions,
  UseChartObserverResult
} from "./store/useObservation"
export type {
  ChartObservation,
  OnObservationCallback,
  HoverObservation,
  HoverEndObservation,
  BrushObservation,
  BrushEndObservation,
  SelectionObservation,
  SelectionEndObservation,
  ClickObservation,
  ClickEndObservation
} from "./store/ObservationStore"
