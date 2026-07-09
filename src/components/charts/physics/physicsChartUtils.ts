/**
 * Physics chart layout builders — barrel re-export.
 * Implementations live in per-chart modules next to this file.
 */
export type {
  PhysicsChartLayout,
  PhysicsChartArea
} from "./physicsChartShared"
export {
  projectionRowsToSemanticItems,
  physicsChartArea,
  hashStringColor,
  styleFromColorAccessor
} from "./physicsChartShared"

export type {
  GaltonBoardPhysicsOptions,
  GaltonBoardProjectionMetadata,
  GaltonMechanicalSampleOptions
} from "./galtonBoardPhysics"
export {
  generateGaltonMechanicalSamples,
  buildGaltonBoardPhysics
} from "./galtonBoardPhysics"

export type {
  EventDropWindowOptions,
  EventDropPlotRegion,
  EventDropLidSegment,
  EventDropProjectionMetadata,
  EventDropPhysicsOptions
} from "./eventDropPhysics"
export {
  buildEventDropPhysics,
  placeEventDropSpawn
} from "./eventDropPhysics"

export type {
  PhysicsPileMechanicalSampleOptions,
  PhysicsPileOptions,
  PileTubeGeometry
} from "./physicsPilePhysics"
export {
  generatePhysicsPileMechanicalSamples,
  pileTubeGeometry,
  buildPhysicsPile
} from "./physicsPilePhysics"

export type {
  CollisionSwarmPhysicsOptions,
  CollisionSwarmProjectionMetadata
} from "./collisionSwarmPhysics"
export { buildCollisionSwarmPhysics } from "./collisionSwarmPhysics"

export type {
  PhysicalFlowCoordinateMode,
  PhysicalFlowPathConstraint,
  PhysicalFlowPoint,
  PhysicalFlowRawPath,
  PhysicalFlowOptions,
  PhysicalFlowProjectionMetadata
} from "./physicalFlowPhysics"
export { buildPhysicalFlowPhysics } from "./physicalFlowPhysics"

export type {
  ProcessFlowStageDef,
  ProcessFlowPhysicsOptions,
  ProcessFlowProjectionMetadata
} from "./processFlowPhysics"
export { buildProcessFlowPhysics } from "./processFlowPhysics"
