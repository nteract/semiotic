/**
 * Physics entry point — experimental process-driven charts backed by
 * StreamPhysicsFrame. Import from "semiotic/physics" to avoid the full bundle.
 */

import { GaltonBoardChart } from "./charts/physics/GaltonBoardChart"
import { EventDropChart } from "./charts/physics/EventDropChart"
import { PhysicsPileChart } from "./charts/physics/PhysicsPileChart"
import { PhysicsCustomChart } from "./charts/physics/PhysicsCustomChart"
import { CollisionSwarmChart } from "./charts/physics/CollisionSwarmChart"
import { NetworkHOPsChart } from "./charts/physics/NetworkHOPsChart"
import { PhysicalFlowChart } from "./charts/physics/PhysicalFlowChart"
import { buildNetworkHOPsModel } from "./charts/physics/networkHopsUtils"
import {
  buildCollisionSwarmPhysics,
  buildEventDropPhysics,
  buildGaltonBoardPhysics,
  buildPhysicalFlowPhysics,
  buildPhysicsPile
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
  arrivalReplay,
  collidersFromScales,
  galtonPegs,
  sedimentBake,
  spawnFromTokens
} from "./recipes/physics"

export {
  BuiltInPhysicsEngineAdapter,
  CollisionSwarmChart,
  EventDropChart,
  GaltonBoardChart,
  NetworkHOPsChart,
  PhysicalFlowChart,
  PhysicsCustomChart,
  PhysicsPileChart,
  PhysicsPipelineStore,
  PhysicsSedimentAccumulator,
  arrivalReplay,
  buildCollisionSwarmPhysics,
  buildEventDropPhysics,
  buildGaltonBoardPhysics,
  buildNetworkHOPsModel,
  buildPhysicalFlowPhysics,
  buildPhysicsPile,
  collidersFromScales,
  createDefaultPhysicsEngineAdapter,
  evaluatePhysicsBodyBudget,
  galtonPegs,
  sedimentBake,
  sedimentHeightfield,
  spawnFromTokens,
  NamedStreamPhysicsFrame as StreamPhysicsFrame
}

export default StreamPhysicsFrame

export type { CollisionSwarmChartProps } from "./charts/physics/CollisionSwarmChart"
export type { EventDropChartProps } from "./charts/physics/EventDropChart"
export type {
  GaltonBoardChartProps,
  GaltonBoardReferenceLine
} from "./charts/physics/GaltonBoardChart"
export type {
  NetworkHOPsChartProps,
  NetworkHOPsModel,
  NetworkHOPsSample
} from "./charts/physics/NetworkHOPsChart"
export type { PhysicalFlowChartProps } from "./charts/physics/PhysicalFlowChart"
export type { NetworkHOPsModelOptions } from "./charts/physics/networkHopsUtils"
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
  PhysicsPileOptions
} from "./charts/physics/physicsChartUtils"
export type {
  ArrivalReplayOptions,
  BandScale,
  GaltonPegsOptions,
  NumericScale,
  PhysicsBandColliderOptions,
  PhysicsScaleColliderOptions,
  SedimentBakeOptions,
  SedimentBakeResult,
  SpawnFromTokensOptions
} from "./recipes/physics"
export type {
  StreamPhysicsFrameHandle,
  StreamPhysicsFrameProps,
  PhysicsBodySelection,
  PhysicsBodyStyleContext,
  StreamPhysicsExecutionState
} from "./stream/physics/StreamPhysicsFrame"
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
  PhysicsColliderShape,
  PhysicsColliderSpec,
  PhysicsKernelOptions,
  PhysicsSpringSpec
} from "./stream/physics/PhysicsKernel"
