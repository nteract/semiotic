/**
 * Optional Matter.js physics migration helpers.
 *
 * Import from "semiotic/physics/matter" so Matter.js stays out of the default
 * "semiotic/physics" bundle.
 */

export {
  MATTER_PHYSICS_CAPABILITIES,
  MATTER_PHYSICS_IMPORT_PATH,
  MATTER_PHYSICS_INSTALL,
  MATTER_PHYSICS_PACKAGE,
  loadMatterPhysicsPeer,
  matterBodiesToPhysicsColliders,
  matterBodiesToPhysicsSpawns,
  matterBodyToPhysicsBodySpec,
  matterBodyToPhysicsColliderSpec,
  matterPhysicsDependencyError
} from "./stream/physics/MatterPhysicsEngineAdapter"

export {
  PhysicsOptionalEngineDependencyError,
  loadOptionalPhysicsPeer,
  optionalEngineDependencyError
} from "./stream/physics/PhysicsOptionalEngineAdapters"

export type {
  MatterBodyLike,
  MatterBoundsLike,
  MatterMigrationOptions,
  MatterVectorLike
} from "./stream/physics/MatterPhysicsEngineAdapter"

export type {
  PhysicsOptionalEngineInstallDetails
} from "./stream/physics/PhysicsOptionalEngineAdapters"
