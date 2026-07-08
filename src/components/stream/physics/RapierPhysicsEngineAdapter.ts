import type {
  PhysicsEngineCapabilities
} from "./PhysicsEngineAdapter"
import {
  loadOptionalPhysicsPeer,
  optionalEngineDependencyError
} from "./PhysicsOptionalEngineAdapters"

export const RAPIER_PHYSICS_PACKAGE = "@dimforge/rapier2d-compat"
export const RAPIER_PHYSICS_IMPORT_PATH = "semiotic/physics/rapier"

export const RAPIER_PHYSICS_ENGINE_DECISION = {
  selectedPackage: RAPIER_PHYSICS_PACKAGE,
  rejectedPackage: "@dimforge/rapier2d-deterministic",
  determinism: "tolerance",
  reason:
    "Use @dimforge/rapier2d-compat for the optional browser adapter path because it is the maintained npm/WASM package with standard bundler behavior. Treat Rapier visual/position conformance as tolerance-classed; keep the built-in kernel as the strict deterministic default."
} as const

export const RAPIER_PHYSICS_CAPABILITIES: PhysicsEngineCapabilities = {
  engine: "rapier2d-compat",
  determinism: "tolerance",
  sensors: true,
  joints: true,
  ccd: true,
  maxBodiesHint: 20000,
  worker: true
}

export const RAPIER_PHYSICS_INSTALL = {
  engine: "Rapier 2D",
  importPath: RAPIER_PHYSICS_IMPORT_PATH,
  packageName: RAPIER_PHYSICS_PACKAGE,
  installCommand: `npm install ${RAPIER_PHYSICS_PACKAGE}`
} as const

export async function loadRapierPhysicsPeer(): Promise<unknown> {
  const module = await loadOptionalPhysicsPeer(RAPIER_PHYSICS_INSTALL)
  const candidate = module as { default?: unknown; init?: () => Promise<void> | void }
  const rapier = (candidate.default ?? candidate) as {
    init?: () => Promise<void> | void
  }
  await rapier.init?.()
  return rapier
}

export function rapierPhysicsDependencyError(
  cause?: unknown
): Error {
  return optionalEngineDependencyError(RAPIER_PHYSICS_INSTALL, cause)
}
