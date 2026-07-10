/**
 * Experimental entry point for temporary adapters and unstable previews.
 *
 * Anything imported from "semiotic/experimental" is intentionally outside
 * Semiotic's stable public API. Exports may be renamed, moved, or removed
 * without a deprecation window and are excluded from stable API-surface and
 * bundle-size gates.
 */

// PR-preview surface for the GoFish collaboration. The adapter is intentionally
// named `unstable-gofish-displaylist-adapter`; it is available here so GoFish
// can test against Semiotic's custom chart pipeline without promoting the API
// to the normal recipe catalog. It consumes GoFish's *DisplayList* render IR —
// the baked, viewport-locked output of `toDisplayList({ w, h })`.
export {
  EXPERIMENTAL_GOFISH_ADAPTER_NAME,
  unstable_fromGofishIR
} from "./recipes/gofishIR"
export type {
  GofishDisplayListDocument as UnstableGofishDisplayListDocument,
  GofishDisplayItem as UnstableGofishDisplayItem,
  GofishChartConfig as UnstableGofishChartConfig,
  FromGofishIROptions as UnstableFromGofishIROptions
} from "./recipes/gofishIR"
export {
  gofishIRExamples as unstable_gofishIRExamples,
  flowerIR as unstable_gofishFlowerIR,
  treemapIR as unstable_gofishTreemapIR,
  bottleIR as unstable_gofishBottleIR,
  bobaIR as unstable_gofishBobaIR,
  pythonIR as unstable_gofishPythonIR
} from "./recipes/gofishIRExamples"
export type { GofishIRExample as UnstableGofishIRExample } from "./recipes/gofishIRExamples"

// DataPitfalls bridge (§8.x). This packages Semiotic config, JSX, reader
// grounding, diagnostics, accessibility audit output, and optional render
// evidence into the chain input consumed by the external `datapitfalls`
// package, and maps returned pitfall reports into chart-level notifications or
// Semiotic v3-native annotation specs. Kept experimental while that package's
// bridge contracts settle.
export {
  DEFAULT_DATA_PITFALLS_ANNOTATION_PALETTE as unstable_DEFAULT_DATA_PITFALLS_ANNOTATION_PALETTE,
  buildDataPitfallsAnnotationBridge as unstable_buildDataPitfallsAnnotationBridge,
  buildDataPitfallsBridge as unstable_buildDataPitfallsBridge,
  buildDataPitfallsNotificationBridge as unstable_buildDataPitfallsNotificationBridge,
  dataPitfallsFindingToAnnotation as unstable_dataPitfallsFindingToAnnotation,
  dataPitfallsFindingToNotification as unstable_dataPitfallsFindingToNotification,
  toDataPitfallsAnnotations as unstable_toDataPitfallsAnnotations,
  toDataPitfallsChain as unstable_toDataPitfallsChain,
  toDataPitfallsNotifications as unstable_toDataPitfallsNotifications
} from "./ai/dataPitfallsBridge"
export type {
  DataPitfallsAnnotationBridge as UnstableDataPitfallsAnnotationBridge,
  DataPitfallsAnnotationBridgeOptions as UnstableDataPitfallsAnnotationBridgeOptions,
  DataPitfallsAnnotationType as UnstableDataPitfallsAnnotationType,
  DataPitfallsBridgeOptions as UnstableDataPitfallsBridgeOptions,
  DataPitfallsBridgeResult as UnstableDataPitfallsBridgeResult,
  DataPitfallsChainInput as UnstableDataPitfallsChainInput,
  DataPitfallsChainStage as UnstableDataPitfallsChainStage,
  DataPitfallsChartNotification as UnstableDataPitfallsChartNotification,
  DataPitfallsDocumentInput as UnstableDataPitfallsDocumentInput,
  DataPitfallsFinding as UnstableDataPitfallsFinding,
  DataPitfallsImageInput as UnstableDataPitfallsImageInput,
  DataPitfallsImageMediaType as UnstableDataPitfallsImageMediaType,
  DataPitfallsImageSource as UnstableDataPitfallsImageSource,
  DataPitfallsInputKind as UnstableDataPitfallsInputKind,
  DataPitfallsNotificationBridge as UnstableDataPitfallsNotificationBridge,
  DataPitfallsNotificationBridgeOptions as UnstableDataPitfallsNotificationBridgeOptions,
  DataPitfallsNotificationLevel as UnstableDataPitfallsNotificationLevel,
  DataPitfallsNotificationMessage as UnstableDataPitfallsNotificationMessage,
  DataPitfallsRenderedChart as UnstableDataPitfallsRenderedChart,
  DataPitfallsReport as UnstableDataPitfallsReport,
  DataPitfallsSemioticAnnotation as UnstableDataPitfallsSemioticAnnotation,
  DataPitfallsSeverity as UnstableDataPitfallsSeverity,
  DataPitfallsSlideContent as UnstableDataPitfallsSlideContent,
  DataPitfallsSlidesInput as UnstableDataPitfallsSlidesInput,
  DataPitfallsSingleArtifactInput as UnstableDataPitfallsSingleArtifactInput,
  DataPitfallsTextInput as UnstableDataPitfallsTextInput
} from "./ai/dataPitfallsBridge"

// ── IDID portability spec (v0.1) ────────────────────────────────────────────
// The library-neutral schema surface that carries the IDID primitives —
// chart capability, audience profile, annotation provenance/lifecycle — into
// other ecosystems. Canonical schemas live in /spec/v0.1. Staged behind
// `unstable_` while the runtime surface is proven against real consumers; the
// JSON Schemas themselves are the stable artifact. `toVegaLite` graduates to
// `semiotic/data` alongside `fromVegaLite` once it clears the bundle-size gate.
export {
  IDID_SPEC_VERSION,
  BUILTIN_INTENT_IDS as unstable_BUILTIN_INTENT_IDS,
  validatePortableCapability as unstable_validatePortableCapability,
  validatePortableAudienceProfile as unstable_validatePortableAudienceProfile,
  validatePortableAnnotation as unstable_validatePortableAnnotation,
  toVegaLite as unstable_toVegaLite,
  attachIDID as unstable_attachIDID,
  readIDID as unstable_readIDID,
  attachIDIDAnnotations as unstable_attachIDIDAnnotations,
  readIDIDAnnotations as unstable_readIDIDAnnotations
} from "./data/portability"
// Observable Plot → ChartConfig adapter (§5.1). A sibling to the stable
// `fromVegaLite`, staged behind `unstable_` while the imperative-JS → declarative
// translation is proven against real Plot specs (D5). Promotes to `semiotic/data`
// once it clears a fixture suite + a real consumer.
export { fromObservablePlot as unstable_fromObservablePlot } from "./data/fromObservablePlot"
// Mermaid → layered graph adapter (§5.4). Parses graph/flowchart text and
// computes a longest-path layering (a flowchart is a DAG, not a force graph —
// D7), ready for the lineageDagLayout recipe. Staged behind `unstable_` (D5);
// the parser is a small dedicated one, never a Mermaid runtime dependency (D2).
export { fromMermaid as unstable_fromMermaid } from "./data/fromMermaid"
export type {
  MermaidResult as UnstableMermaidResult,
  MermaidNode as UnstableMermaidNode,
  MermaidEdge as UnstableMermaidEdge,
  MermaidDirection as UnstableMermaidDirection,
  MermaidNodeShape as UnstableMermaidNodeShape
} from "./data/fromMermaid"
export type {
  ObservablePlotSpec as UnstableObservablePlotSpec,
  ObservablePlotMark as UnstableObservablePlotMark,
  ObservablePlotMarkOptions as UnstableObservablePlotMarkOptions,
  ObservablePlotScale as UnstableObservablePlotScale,
  ObservablePlotChannel as UnstableObservablePlotChannel
} from "./data/fromObservablePlot"

// StreamPhysicsFrame M1 substrate. These are intentionally low-level and
// unstable while the frame/HOC contract is proven in the internal sandbox.
export {
  DEFAULT_PHYSICS_CANVAS_THEME as unstable_DEFAULT_PHYSICS_CANVAS_THEME,
  physicsCanvasColorWithAlpha as unstable_physicsCanvasColorWithAlpha,
  resolvePhysicsCanvasTheme as unstable_resolvePhysicsCanvasTheme
} from "./stream/physics/PhysicsCanvasTheme"
export {
  buildPhysicsSettledEvidence as unstable_buildPhysicsSettledEvidence
} from "./stream/physics/PhysicsEvidence"
export {
  buildPhysicsSettledScene as unstable_buildPhysicsSettledScene,
  physicsBodiesToXYSceneNodes as unstable_physicsBodiesToXYSceneNodes,
  physicsBodyToXYSceneNode as unstable_physicsBodyToXYSceneNode
} from "./stream/physics/PhysicsSettledScene"
export {
  renderPhysicsSettledSVG as unstable_renderPhysicsSettledSVG
} from "./stream/physics/PhysicsSettledSVG"
export {
  collidersFromPhysicsAnnotations as unstable_collidersFromPhysicsAnnotations,
  resolvePhysicsBodyAnnotations as unstable_resolvePhysicsBodyAnnotations,
  summarizePhysicsAnnotations as unstable_summarizePhysicsAnnotations
} from "./stream/physics/PhysicsAnnotations"
export {
  BuiltInPhysicsEngineAdapter as unstable_BuiltInPhysicsEngineAdapter,
  createDefaultPhysicsEngineAdapter as unstable_createDefaultPhysicsEngineAdapter
} from "./stream/physics/PhysicsEngineAdapter"
export {
  PhysicsPipelineStore as unstable_PhysicsPipelineStore,
  collidersFromPlotBounds as unstable_collidersFromPlotBounds,
  collidersFromXScaleBins as unstable_collidersFromXScaleBins,
  schedulePhysicsSpawns as unstable_schedulePhysicsSpawns
} from "./stream/physics/PhysicsPipelineStore"
export {
  evaluatePhysicsBodyBudget as unstable_evaluatePhysicsBodyBudget
} from "./stream/physics/PhysicsBodyBudget"
export {
  PhysicsSedimentAccumulator as unstable_PhysicsSedimentAccumulator,
  sedimentHeightfield as unstable_sedimentHeightfield
} from "./stream/physics/PhysicsSediment"
export {
  StreamPhysicsFrame as unstable_StreamPhysicsFrame
} from "./stream/physics/StreamPhysicsFrame"
export {
  PhysicsCustomChart as unstable_PhysicsCustomChart
} from "./charts/physics/PhysicsCustomChart"
export {
  buildPhysicsNavigationTree as unstable_buildPhysicsNavigationTree,
  buildPhysicsSettledProjection as unstable_buildPhysicsSettledProjection,
  physicsObservationAnnouncement as unstable_physicsObservationAnnouncement
} from "./stream/physics/PhysicsAccessibility"
export type {
  PhysicsBoundsColliderOptions as UnstablePhysicsBoundsColliderOptions,
  PhysicsObservationEvent as UnstablePhysicsObservationEvent,
  PhysicsObservationEventType as UnstablePhysicsObservationEventType,
  PhysicsObservationRecord as UnstablePhysicsObservationRecord,
  PhysicsPipelineConfig as UnstablePhysicsPipelineConfig,
  PhysicsPipelineControlSurface as UnstablePhysicsPipelineControlSurface,
  PhysicsPipelineObservationOptions as UnstablePhysicsPipelineObservationOptions,
  PhysicsPipelineQueuedSpawnSnapshot as UnstablePhysicsPipelineQueuedSpawnSnapshot,
  PhysicsPipelineSnapshot as UnstablePhysicsPipelineSnapshot,
  PhysicsPipelineTickResult as UnstablePhysicsPipelineTickResult,
  PhysicsPlotBounds as UnstablePhysicsPlotBounds,
  PhysicsQueuedSpawn as UnstablePhysicsQueuedSpawn,
  PhysicsSensorObservationConfig as UnstablePhysicsSensorObservationConfig,
  PhysicsSimulationState as UnstablePhysicsSimulationState,
  PhysicsSpawnPacing as UnstablePhysicsSpawnPacing,
  PhysicsSpawnPacingOptions as UnstablePhysicsSpawnPacingOptions,
  PhysicsSpawnSpringSpec as UnstablePhysicsSpawnSpringSpec,
  PhysicsSpawnTimeAccessor as UnstablePhysicsSpawnTimeAccessor,
  PhysicsXBinColliderOptions as UnstablePhysicsXBinColliderOptions
} from "./stream/physics/PhysicsPipelineStore"
export type {
  PhysicsBodyBudgetAction as UnstablePhysicsBodyBudgetAction,
  PhysicsBodyBudgetDecision as UnstablePhysicsBodyBudgetDecision,
  PhysicsBodyBudgetInput as UnstablePhysicsBodyBudgetInput,
  PhysicsBodyBudgetOptions as UnstablePhysicsBodyBudgetOptions,
  PhysicsBodyBudgetState as UnstablePhysicsBodyBudgetState
} from "./stream/physics/PhysicsBodyBudget"
export type {
  PhysicsSedimentAccessor as UnstablePhysicsSedimentAccessor,
  PhysicsSedimentBinSnapshot as UnstablePhysicsSedimentBinSnapshot,
  PhysicsSedimentColumn as UnstablePhysicsSedimentColumn,
  PhysicsSedimentConfig as UnstablePhysicsSedimentConfig,
  PhysicsSedimentHeightfieldOptions as UnstablePhysicsSedimentHeightfieldOptions,
  PhysicsSedimentTotals as UnstablePhysicsSedimentTotals,
  PhysicsSedimentValueAccessor as UnstablePhysicsSedimentValueAccessor,
  RunningStatsSnapshot as UnstableRunningStatsSnapshot
} from "./stream/physics/PhysicsSediment"
export type {
  PhysicsEngineAdapter as UnstablePhysicsEngineAdapter,
  PhysicsEngineAdapterFactory as UnstablePhysicsEngineAdapterFactory,
  PhysicsEngineAdapterInput as UnstablePhysicsEngineAdapterInput,
  PhysicsEngineCapabilities as UnstablePhysicsEngineCapabilities,
  PhysicsEngineDeterminism as UnstablePhysicsEngineDeterminism
} from "./stream/physics/PhysicsEngineAdapter"
export type {
  PhysicsColliderShape as UnstablePhysicsColliderShape,
  PhysicsColliderSpec as UnstablePhysicsColliderSpec
} from "./stream/physics/PhysicsKernel"
export type {
  PhysicsCanvasTheme as UnstablePhysicsCanvasTheme
} from "./stream/physics/PhysicsCanvasTheme"
export type {
  PhysicsBodySelection as UnstablePhysicsBodySelection,
  PhysicsBodyStyleContext as UnstablePhysicsBodyStyleContext,
  StreamPhysicsExecutionState as UnstableStreamPhysicsExecutionState,
  StreamPhysicsFrameHandle as UnstableStreamPhysicsFrameHandle,
  StreamPhysicsFrameProps as UnstableStreamPhysicsFrameProps
} from "./stream/physics/StreamPhysicsFrame"
export type {
  PhysicsCustomChartProps as UnstablePhysicsCustomChartProps,
  PhysicsCustomLayout as UnstablePhysicsCustomLayout,
  PhysicsCustomLayoutContext as UnstablePhysicsCustomLayoutContext,
  PhysicsCustomLayoutResult as UnstablePhysicsCustomLayoutResult,
  PhysicsCustomSpawnDatumResult as UnstablePhysicsCustomSpawnDatumResult
} from "./charts/physics/PhysicsCustomChart"
export type {
  PhysicsExecution as UnstablePhysicsExecution
} from "./stream/physics/PhysicsWorkerProtocol"
export type {
  PhysicsAnnotationAxis as UnstablePhysicsAnnotationAxis,
  PhysicsAnnotationColliderOptions as UnstablePhysicsAnnotationColliderOptions,
  PhysicsAnnotationRole as UnstablePhysicsAnnotationRole,
  PhysicsAnnotationSummary as UnstablePhysicsAnnotationSummary,
  PhysicsBodyAnnotation as UnstablePhysicsBodyAnnotation,
  PhysicsResolvedBodyAnnotation as UnstablePhysicsResolvedBodyAnnotation,
  PhysicsStaticAnnotation as UnstablePhysicsStaticAnnotation
} from "./stream/physics/PhysicsAnnotations"
export type {
  PhysicsEvidenceBinCount as UnstablePhysicsEvidenceBinCount,
  PhysicsSettledEvidence as UnstablePhysicsSettledEvidence,
  PhysicsSettledEvidenceOptions as UnstablePhysicsSettledEvidenceOptions
} from "./stream/physics/PhysicsEvidence"
export type {
  PhysicsSettledScene as UnstablePhysicsSettledScene,
  PhysicsSettledSceneOptions as UnstablePhysicsSettledSceneOptions
} from "./stream/physics/PhysicsSettledScene"
export type {
  PhysicsSettledSVGOptions as UnstablePhysicsSettledSVGOptions,
  PhysicsSettledSVGRender as UnstablePhysicsSettledSVGRender
} from "./stream/physics/PhysicsSettledSVG"
export type {
  PhysicsNavigationTreeOptions as UnstablePhysicsNavigationTreeOptions,
  PhysicsObservationAnnouncementOptions as UnstablePhysicsObservationAnnouncementOptions,
  PhysicsProjectionBodySummary as UnstablePhysicsProjectionBodySummary,
  PhysicsProjectionContainerSpec as UnstablePhysicsProjectionContainerSpec,
  PhysicsSettledProjectionOptions as UnstablePhysicsSettledProjectionOptions,
  PhysicsSettledProjectionRow as UnstablePhysicsSettledProjectionRow
} from "./stream/physics/PhysicsAccessibility"

export type {
  BuiltInIntentId as UnstableBuiltInIntentId,
  PortableIntentId as UnstablePortableIntentId,
  PortableChartRubric as UnstablePortableChartRubric,
  PortableChartVariant as UnstablePortableChartVariant,
  PortableMobileInteractionCapability as UnstablePortableMobileInteractionCapability,
  PortableMobileLabelCapability as UnstablePortableMobileLabelCapability,
  PortableMobileCustomCapability as UnstablePortableMobileCustomCapability,
  PortableMobileCapability as UnstablePortableMobileCapability,
  PortableChartCapability as UnstablePortableChartCapability,
  PortableReceptionModality as UnstablePortableReceptionModality,
  PortableAudienceTarget as UnstablePortableAudienceTarget,
  PortableAudienceProfile as UnstablePortableAudienceProfile,
  PortableAnnotationProvenance as UnstablePortableAnnotationProvenance,
  PortableAnnotationLifecycle as UnstablePortableAnnotationLifecycle,
  PortableAnnotated as UnstablePortableAnnotated,
  ValidationResult as UnstablePortabilityValidationResult,
  IDIDVegaLiteMeta as UnstableIDIDVegaLiteMeta
} from "./data/portability"
