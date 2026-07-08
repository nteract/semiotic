/**
 * Optional Rapier physics adapter guard and decision metadata.
 *
 * Import from "semiotic/physics/rapier" so Rapier's WASM package stays out of
 * the default "semiotic/physics" bundle.
 */

export {
  RAPIER_PHYSICS_CAPABILITIES,
  RAPIER_PHYSICS_ENGINE_DECISION,
  RAPIER_PHYSICS_IMPORT_PATH,
  RAPIER_PHYSICS_INSTALL,
  RAPIER_PHYSICS_PACKAGE,
  loadRapierPhysicsPeer,
  rapierPhysicsDependencyError
} from "./stream/physics/RapierPhysicsEngineAdapter"

export {
  PhysicsOptionalEngineDependencyError,
  loadOptionalPhysicsPeer,
  optionalEngineDependencyError
} from "./stream/physics/PhysicsOptionalEngineAdapters"

export type {
  PhysicsOptionalEngineInstallDetails
} from "./stream/physics/PhysicsOptionalEngineAdapters"
