"use client"

// Semiotic AI — curated chart and portable-recipe surface for AI code generation
// Import: import { LineChart, BarChart, ... } from "semiotic/ai"

export { LineChart } from "./charts/xy/LineChart"
export { BumpChart, rankBumpData } from "./charts/xy/BumpChart"
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
export { WaterfallChart } from "./charts/xy/WaterfallChart"

export { LinkedCharts } from "./LinkedCharts"
export {
  useSelection,
  useSelectionActions,
  useLinkedHover,
  useBrushSelection,
  useFilteredData,
  useLinkedChartsActive
} from "./LinkedCharts"
export type { LinkedChartsProps, LegendInteractionMode } from "./LinkedCharts"

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
export { RadarChart } from "./charts/ordinal/RadarChart"
export { LikertChart } from "./charts/ordinal/LikertChart"
export { SwimlaneChart } from "./charts/ordinal/SwimlaneChart"

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

// Physics Charts
export { GaltonBoardChart } from "./charts/physics/GaltonBoardChart"
export { EventDropChart } from "./charts/physics/EventDropChart"
export { PhysicsCustomChart } from "./charts/physics/PhysicsCustomChart"
export { UnitPileChart } from "./charts/physics/UnitPileChart"
export { CollisionSwarmChart } from "./charts/physics/CollisionSwarmChart"
export { PacketFlowChart } from "./charts/physics/PacketFlowChart"
export { ProcessFlowChart } from "./charts/physics/ProcessFlowChart"
export { GauntletChart } from "./charts/physics/GauntletChart"
export { CrucibleChart } from "./charts/physics/CrucibleChart"
export { ChainReactionChart } from "./charts/physics/ChainReactionChart"

// Value Charts
export { BigNumber } from "./charts/value/BigNumber"

// Essential utilities
export { TooltipProvider } from "./store/TooltipStore"
export { MultiLineTooltip } from "./Tooltip/Tooltip"

// Theme
export { ThemeProvider, useTheme } from "./ThemeProvider"

// Export utility
export { exportChart } from "./export/exportChart"

export { ChartContainer } from "./ChartContainer"
export { MobileChartContainer } from "./MobileChartContainer"
export { SmallMultipleChart } from "./SmallMultipleChart"
export { MobileStandardControls } from "./MobileStandardControls"
export {
  clampMobileRange,
  useMobileRangeControls,
  zoomMobileRange
} from "./MobileStandardControls"
export type {
  ChartContainerProps,
  ChartContainerHandle,
  ChartContainerMobileOptions,
  ChartNotification,
  ChartNotificationLevel
} from "./ChartContainer"
export type {
  MobileChartChip,
  MobileChartContainerProps,
  MobileChartDetailMode
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
  UseMobileRangeControlsResult
} from "./MobileStandardControls"
export type {
  SmallMultipleChartProps,
  SmallMultipleExtent,
  SmallMultipleItem,
  SmallMultipleRenderContext,
  SmallMultipleSharedExtent
} from "./SmallMultipleChart"

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
export { ObservationReadout, observedDatum } from "./ObservationReadout"
export type { ObservationReadoutProps } from "./ObservationReadout"

// AI validation, diagnostics, and accessibility audits live in a focused
// facade so this chart catalog remains a navigable public-entry module.
export * from "./semiotic-ai-audits"

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
  ChartReaderGroundingIntent,
  PhysicsReaderGrounding,
  PhysicsReaderGroundingAggregate,
  PhysicsReaderGroundingAggregates,
  PhysicsReaderGroundingGeometry,
  PhysicsReaderGroundingInput,
  PhysicsReaderGroundingSediment,
  PhysicsReaderGroundingSimulation
} from "./ai/readerGrounding"
export {
  dataQualityToAnnotations,
  fromDbtArtifacts,
  fromGreatExpectations
} from "./ai/dataQualityBridge"
export type {
  DataQualityStatus,
  DataQualityCheckKind,
  DataQualityResult,
  DataQualityAnnotationOptions,
  DataQualityAnnotationsResult,
  UnplacedDataQualityResult,
  DbtArtifacts,
  GEValidationResult
} from "./ai/dataQualityBridge"
export {
  prepareChart,
  refreshChartDiagnostics,
  createRenderEvidenceMemo,
  chartGenerationTool,
  toAnthropicTool,
  toOpenAITool,
  toOpenAIResponsesTool,
  createChartToolHandler
} from "./ai/generativeChart"
export type {
  RenderFn,
  RenderEvidenceMemo,
  PrepareChartInput,
  PrepareChartOptions,
  PrepareChartResult,
  ChartToolDefinition,
  ChartToolOptions,
  OpenAIResponsesTool,
  OpenAIResponsesToolOptions
} from "./ai/generativeChart"
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
export * from "./semiotic-ai-data-audit"

// Chart capability layer — heuristic recommendations + intent taxonomy
export { profileData } from "./ai/profileData"
export type { ProfileDataOptions } from "./ai/profileData"
export { deriveProfileFields, rederiveProfile } from "./ai/deriveProfileFields"
export type { DerivedProfileFields, ProfilePrimaryFields, ReprofileFieldsOptions } from "./ai/deriveProfileFields"
export type { ProfileFieldRole, ProfileFieldRoleHint, ProfileFieldRoleHints, NormalizedProfileFieldRoles } from "./ai/fieldRoles"
export type { SuggestionPropContract } from "./ai/suggestionPropContracts"
export {
  suggestCharts,
  suggestChartsGrouped,
  scoreChart,
  explainCapabilityFit
} from "./ai/suggestCharts"
export type {
  SuggestChartsOptions,
  ScoreChartOptions,
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
export type { InferIntentField, InferIntentOptions, InferIntentResult } from "./ai/inferIntent"
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
  BumpChartCapability,
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
  WaterfallChartCapability,
  // Ordinal
  BarChartCapability,
  GroupedBarChartCapability,
  StackedBarChartCapability,
  DotPlotCapability,
  PieChartCapability,
  DonutChartCapability,
  FunnelChartCapability,
  RadarChartCapability,
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
  ChartCandidateKind,
  ChartDataProfile,
  ChartFamily,
  ChartImportPath,
  ChartRubric,
  ChartVariant,
  FieldCandidate,
  FieldKind,
  FitResult,
  IntentScorer,
  ScoreChartRejected,
  ScoreChartResult,
  ScoreChartSuggestion,
  ScaledSuggestionGroups,
  Suggestion,
  SuggestionScaleRange,
  WhyCustomExplanation
} from "./ai/chartCapabilityTypes"
export type { ChartFieldPolicy, SemanticRenderEvidence, SemanticViabilityCallback, SemanticViabilityCheck, SemanticViabilityDiagnostic, SemanticViabilityRule } from "./ai/chartCapabilityTypes"
export {
  defineChartRecipe,
  validateChartRecipe,
  isJsonSafe,
  isRegisteredRecipeLayout
} from "./ai/chartRecipes"
export type {
  AccessibilityTableField,
  AccessibilityExpectations,
  AudienceFitDefinition,
  ChartRecipe as ChartRecipeDefinition,
  ChartRecipeFrameFamily,
  ChartRecipePortability,
  CustomLayoutFunction,
  DataRoleDefinition,
  DataSemanticType,
  DescriptionStrategy,
  DesignContractDefinition,
  EncodingChannel,
  EncodingDefinition,
  IntentDefinition,
  LiteracyTargetDefinition,
  NavigationStrategy,
  PortableNavigationStrategy,
  RecipeAudienceDefinition,
  RecipeAuditExpectations,
  RecipeDescription,
  RecipeExample,
  RecipeStrategyContext,
  RecipePortabilityConfig,
  ReceptionDefinition,
  RegisteredRecipeLayout,
  SerializableSchema
} from "./ai/chartRecipes"
export {
  registerChartRecipe,
  unregisterChartRecipe,
  getChartRecipe,
  listChartRecipes,
  resolveChartRecipe,
  registerRecipeLayout,
  unregisterRecipeLayout,
  getRecipeLayout
} from "./ai/chartRecipeRegistry"
export * from "./ai/builtInChartRecipePublic"
export {
  recipeToChartCapability,
  resolveRecipeRoleField
} from "./ai/recipeCapability"
export { describeRecipeChart } from "./ai/describeRecipeChart"
export type { DescribeRecipeChartOptions } from "./ai/describeRecipeChart"
export { buildRecipeNavigationTree } from "./ai/recipeNavigation"
export type { RecipeNavigationOptions } from "./ai/recipeNavigation"
export { auditObservedScene } from "./ai/observedSceneAudit"
export type {
  AuditObservedSceneInput,
  DeclaredRecipeSemantics,
  ObservedAuditFinding,
  ObservedAuditStatus,
  ObservedSceneAuditResult
} from "./ai/observedSceneAudit"
export { auditVisualizationControls } from "./controls/controlAudit"
export type {
  AuditVisualizationControlsOptions,
  ControlAuditFinding,
  ControlAuditResult,
  ControlAuditStatus
} from "./controls/controlAudit"
export type { VisualizationControlDefinition } from "./controls/controlContract"
export { IntentMark } from "./ai/IntentMark"
export type { IntentMarkProps } from "./ai/IntentMark"
export {
  summarizeIntentManifest,
  intentManifestFromRecipe
} from "./ai/intentManifest"
export type {
  IntentManifest,
  IntentManifestFromRecipeOptions
} from "./ai/intentManifest"
export {
  listIntents,
  getIntent,
  registerIntent,
  BUILT_IN_INTENT_IDS
} from "./ai/intents"
export type { BuiltInIntentId, IntentDescriptor, IntentFieldKind, IntentId, IntentSignals } from "./ai/intents"

// Variant discovery — heuristic proposal + evaluation surface. The built-in
// proposer emits registered capability variants, adds conservative heuristic
// transforms, and lets external discovery functions register model/agent picks.
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
  EvaluateVariantProposalOptions,
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
  AnnotationStatusChangedEvent, ProposalRefusedEvent, RenderEvidenceEvent
} from "./ai/conversationArc"

// AI Observation hooks
export { useChartObserver } from "./semiotic-ai-observations"
export type * from "./semiotic-ai-observations"

export { annotationStableId } from "./charts/shared/annotationActivation"
export type {
  ChartAnnotation,
  AnnotationActivationEvent,
  OnAnnotationActivateCallback
} from "./charts/shared/annotationActivation"

export { MobileAnnotationCalloutList } from "./MobileAnnotationCalloutList"
export type { MobileAnnotationCalloutListProps } from "./MobileAnnotationCalloutList"
