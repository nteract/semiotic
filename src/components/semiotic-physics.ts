/**
 * Physics entry point — experimental process-driven charts backed by
 * StreamPhysicsFrame. Import from "semiotic/physics" to avoid the full bundle.
 */

import { GaltonBoardChart } from "./charts/physics/GaltonBoardChart"
import { EventDropChart } from "./charts/physics/EventDropChart"
import { PhysicsPileChart } from "./charts/physics/PhysicsPileChart"
import { PhysicsCustomChart } from "./charts/physics/PhysicsCustomChart"
import { CollisionSwarmChart } from "./charts/physics/CollisionSwarmChart"
import {
  GauntletChart,
  GuantletChart,
  planGauntletPropertyWork,
  replaceGauntletNegative
} from "./charts/physics/GauntletChart"
import { PhysicalFlowChart } from "./charts/physics/PhysicalFlowChart"
import { ProcessFlowChart } from "./charts/physics/ProcessFlowChart"
import {
  physicsProcessBoundaryColliders,
  physicsProcessGroupSemanticItems,
  physicsProcessRegionSemanticItem,
  physicsProcessStageSemanticItems
} from "./charts/physics/physicsProcessPrimitives"
import {
  buildCollisionSwarmPhysics,
  buildEventDropPhysics,
  buildGaltonBoardPhysics,
  buildPhysicalFlowPhysics,
  buildPhysicsPile,
  buildProcessFlowPhysics
} from "./charts/physics/physicsChartUtils"
import StreamPhysicsFrame, {
  StreamPhysicsFrame as NamedStreamPhysicsFrame
} from "./stream/physics/StreamPhysicsFrame"
import { PhysicsPipelineStore } from "./stream/physics/PhysicsPipelineStore"
import {
  BuiltInPhysicsEngineAdapter,
  createDefaultPhysicsEngineAdapter
} from "./stream/physics/PhysicsEngineAdapter"
import { evaluatePhysicsBodyBudget } from "./stream/physics/PhysicsBodyBudget"
import { PhysicsSedimentAccumulator, sedimentHeightfield } from "./stream/physics/PhysicsSediment"
import {
  composePhysicsControllers,
  createCapacityQueueController,
  createPortalController,
  createDependencyGateController,
  createServiceLevelController,
  createServiceResourcePoolController
} from "./stream/physics/PhysicsControllers"
import { processChrome } from "./recipes/processChrome"
import {
  absorbRegion,
  aggregateRegionCounts,
  arrivalReplay,
  bodyGroupSpec,
  capacitatedRegion,
  chargeGateRegion,
  collidersFromScales,
  createProcessJourneyLedger,
  forceFieldRegion,
  galtonPegs,
  groupCompletionRows,
  comparePhysicsTrace,
  membraneRegion,
  portalRegion,
  pressureFieldRegion,
  processLaneWalls,
  processJourneyRows,
  processStageLayout,
  processStageRegions,
  processVolumePolygons,
  physicsReferenceEnvelope,
  regionCountsToProjectionRows,
  routeSurfaceRegion,
  sedimentBake,
  spawnFromTokens,
  stageTargetInVolume,
  updateProcessJourney
} from "./recipes/physics"

export {
  BuiltInPhysicsEngineAdapter,
  CollisionSwarmChart,
  EventDropChart,
  GauntletChart,
  GaltonBoardChart,
  GuantletChart,
  PhysicalFlowChart,
  PhysicsCustomChart,
  PhysicsPileChart,
  PhysicsPipelineStore,
  PhysicsSedimentAccumulator,
  ProcessFlowChart,
  absorbRegion,
  aggregateRegionCounts,
  arrivalReplay,
  bodyGroupSpec,
  buildCollisionSwarmPhysics,
  buildEventDropPhysics,
  buildGaltonBoardPhysics,
  buildPhysicalFlowPhysics,
  buildPhysicsPile,
  buildProcessFlowPhysics,
  capacitatedRegion,
  chargeGateRegion,
  collidersFromScales,
  composePhysicsControllers,
  createCapacityQueueController,
  createDependencyGateController,
  createDefaultPhysicsEngineAdapter,
  createPortalController,
  createServiceLevelController,
  createServiceResourcePoolController,
  createProcessJourneyLedger,
  evaluatePhysicsBodyBudget,
  processChrome,
  forceFieldRegion,
  galtonPegs,
  groupCompletionRows,
  comparePhysicsTrace,
  planGauntletPropertyWork,
  membraneRegion,
  physicsProcessBoundaryColliders,
  physicsProcessGroupSemanticItems,
  physicsProcessRegionSemanticItem,
  physicsProcessStageSemanticItems,
  portalRegion,
  pressureFieldRegion,
  processLaneWalls,
  processJourneyRows,
  processStageLayout,
  processStageRegions,
  processVolumePolygons,
  physicsReferenceEnvelope,
  regionCountsToProjectionRows,
  replaceGauntletNegative,
  routeSurfaceRegion,
  sedimentBake,
  sedimentHeightfield,
  spawnFromTokens,
  stageTargetInVolume,
  updateProcessJourney,
  NamedStreamPhysicsFrame as StreamPhysicsFrame
}

export default StreamPhysicsFrame

export type { CollisionSwarmChartProps } from "./charts/physics/CollisionSwarmChart"
export type { EventDropChartProps } from "./charts/physics/EventDropChart"
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
} from "./charts/physics/GauntletChart"
export type {
  PhysicsProcessBodyGroup,
  PhysicsProcessBoundaryOptions,
  PhysicsProcessStage
} from "./charts/physics/physicsProcessPrimitives"
export type {
  GaltonBoardChartProps,
  GaltonBoardReferenceLine
} from "./charts/physics/GaltonBoardChart"
export type { PhysicalFlowChartProps } from "./charts/physics/PhysicalFlowChart"
export type {
  ProcessFlowChartProps,
  ProcessFlowProjectionMetadata,
  ProcessFlowStageDef
} from "./charts/physics/ProcessFlowChart"
export type {
  PhysicsCustomChartProps,
  PhysicsCustomLayout,
  PhysicsCustomLayoutContext,
  PhysicsCustomLayoutResult,
  PhysicsCustomSpawnDatumResult
} from "./charts/physics/PhysicsCustomChart"
export type { PhysicsPileChartProps } from "./charts/physics/PhysicsPileChart"
export type {
  PhysicsChartLayout,
  CollisionSwarmPhysicsOptions,
  CollisionSwarmProjectionMetadata,
  EventDropWindowOptions,
  EventDropPhysicsOptions,
  GaltonBoardProjectionMetadata,
  GaltonBoardPhysicsOptions,
  PhysicalFlowCoordinateMode,
  PhysicalFlowOptions,
  PhysicalFlowPathConstraint,
  PhysicalFlowPoint,
  PhysicalFlowProjectionMetadata,
  PhysicalFlowRawPath,
  PhysicsPileOptions,
  ProcessFlowPhysicsOptions
} from "./charts/physics/physicsChartUtils"
export type {
  CapacityQueueAbandonedInfo,
  CapacityQueueAgeSummary,
  CapacityQueueBlockedInfo,
  CapacityQueueControllerOptions,
  CapacityQueueProcessedInfo,
  CapacityQueueSnapshot,
  CapacityQueueVisitInfo,
  CapacityQueueWindowSnapshot,
  ComposedPhysicsControllers,
  DependencyGateController,
  DependencyGateOptions,
  DependencyGateSnapshot,
  PhysicsController,
  PhysicsControllerTickContext,
  ServiceLevelCaseInfo,
  ServiceLevelCaseState,
  ServiceLevelController,
  ServiceLevelControllerOptions,
  ServiceLevelSnapshot,
  ServiceResourceAssignment,
  ServiceResourceDefinition,
  ServiceResourcePoolController,
  ServiceResourcePoolOptions,
  ServiceResourcePoolSnapshot
} from "./stream/physics/PhysicsControllers"
export type {
  ProcessChromeGroup,
  ProcessChromeLayout,
  ProcessChromeOptions,
  ProcessChromeStage
} from "./recipes/processChrome"
export type { PhysicsBodyMark } from "./stream/physics/StreamPhysicsFrame"
export type {
  ArrivalReplayOptions,
  BandScale,
  BodyGroupSpec,
  BodyGroupSpecOptions,
  GaltonPegsOptions,
  NumericScale,
  PhysicsBandColliderOptions,
  PhysicsScaleColliderOptions,
  ProcessMembraneDef,
  ProcessJourneyEntityState,
  ProcessJourneyLedger,
  ProcessJourneyRow,
  ProcessJourneyStage,
  ProcessJourneyUpdateOptions,
  ProcessRegionBaseOptions,
  ProcessStageRegionOptions,
  ProcessStageDef,
  ProcessVolumeLayout,
  ProcessVolumeLayoutOptions,
  ProcessVolumeMembraneBand,
  ProcessVolumePoint,
  ProcessVolumePolygon,
  ProcessVolumePolygonRole,
  ProcessVolumeShape,
  ProcessVolumeStageBand,
  RegionCountBucket,
  RegionCountMap,
  PhysicsReferenceBandSelector,
  PhysicsReferenceEnvelope,
  PhysicsReferenceEnvelopeOptions,
  PhysicsReferenceEnvelopePoint,
  PhysicsReferenceSampleGrid,
  PhysicsReferenceTrace,
  PhysicsScalarTraceSample,
  PhysicsTraceAccessor,
  PhysicsTraceComparison,
  PhysicsTraceComparisonOptions,
  PhysicsTraceComparisonPoint,
  PhysicsTraceComparisonStatus,
  PhysicsTraceInterpolation,
  PhysicsTraceOutsideDomain,
  SedimentBakeOptions,
  SedimentBakeResult,
  SpawnFromTokensOptions
} from "./recipes/physics"
export type {
  StreamPhysicsFrameHandle,
  StreamPhysicsFrameProps,
  PhysicsBodySemanticItemAccessor,
  PhysicsBodySemanticItemContext,
  PhysicsBodySelection,
  PhysicsBodyStyleContext,
  StreamPhysicsBodyForce,
  StreamPhysicsBodyForceContext,
  StreamPhysicsPopOptions,
  StreamPhysicsBodyRegionState,
  StreamPhysicsRegionEffect,
  StreamPhysicsRegionEffectContext,
  StreamPhysicsRegionEvent,
  StreamPhysicsRegionKind,
  StreamPhysicsRegionVector,
  StreamPhysicsExecutionState
} from "./stream/physics/StreamPhysicsFrame"
export {
  PhysicsSVGOverlay,
  bodiesToAnnotationAnchors,
  buildPhysicsAnnotationContext,
  normalizePhysicsAnnotations
} from "./stream/physics/PhysicsSVGOverlay"
export type {
  PhysicsAnnotationAnchorNode,
  PhysicsSVGOverlayProps
} from "./stream/physics/PhysicsSVGOverlay"
export type {
  PhysicsExecution
} from "./stream/physics/PhysicsWorkerProtocol"
export type {
  PhysicsEngineAdapter,
  PhysicsEngineAdapterFactory,
  PhysicsEngineAdapterInput,
  PhysicsEngineCapabilities,
  PhysicsEngineDeterminism
} from "./stream/physics/PhysicsEngineAdapter"
export type {
  PhysicsPipelineConfig,
  PhysicsPipelineControlSurface,
  PhysicsPlotBounds,
  PhysicsPipelineSnapshot,
  PhysicsPipelineTickResult,
  PhysicsQueuedSpawn,
  PhysicsSpawnPacing,
  PhysicsSpawnPacingOptions,
  PhysicsSpawnTimeAccessor
} from "./stream/physics/PhysicsPipelineStore"
export type {
  PhysicsBodyBudgetAction,
  PhysicsBodyBudgetDecision,
  PhysicsBodyBudgetInput,
  PhysicsBodyBudgetOptions,
  PhysicsBodyBudgetState
} from "./stream/physics/PhysicsBodyBudget"
export type {
  PhysicsSedimentAccessor,
  PhysicsSedimentBinSnapshot,
  PhysicsSedimentColumn,
  PhysicsSedimentConfig,
  PhysicsSedimentHeightfieldOptions,
  PhysicsSedimentTotals,
  PhysicsSedimentValueAccessor,
  RunningStatsSnapshot
} from "./stream/physics/PhysicsSediment"
export type {
  PhysicsBodyShape,
  PhysicsBodySpec,
  PhysicsBodyState,
  PhysicsColliderBodyFilter,
  PhysicsColliderBodyFilterSpec,
  PhysicsColliderShape,
  PhysicsColliderSpec,
  PhysicsKernelOptions,
  PhysicsSpringSpec
} from "./stream/physics/PhysicsKernel"
