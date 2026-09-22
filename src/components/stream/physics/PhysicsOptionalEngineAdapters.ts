export interface PhysicsOptionalEngineInstallDetails {
  engine: string
  importPath: string
  packageName: string
  installCommand: string
}

export class PhysicsOptionalEngineDependencyError extends Error {
  readonly details: PhysicsOptionalEngineInstallDetails

  constructor(details: PhysicsOptionalEngineInstallDetails, cause?: unknown) {
    super(
      `${details.engine} is an optional Semiotic physics engine. Install ${details.packageName} to use ${details.importPath}: ${details.installCommand}`
    )
    this.name = "PhysicsOptionalEngineDependencyError"
    this.details = details
    if (cause) {
      ;(this as Error & { cause?: unknown }).cause = cause
    }
  }
}

export function optionalEngineDependencyError(
  details: PhysicsOptionalEngineInstallDetails,
  cause?: unknown
): PhysicsOptionalEngineDependencyError {
  return new PhysicsOptionalEngineDependencyError(details, cause)
}

/**
 * Load a runtime-selected specifier using the host's native import resolver.
 * Browsers require a resolvable URL or an import map for bare package names.
 * Use the named Matter/Rapier loaders for bundler-managed npm dependencies.
 */
export async function loadOptionalPhysicsPeer(
  details: PhysicsOptionalEngineInstallDetails
): Promise<unknown> {
  try {
    // This public helper accepts a runtime-selected specifier. Leave it to
    // native import resolution instead of generating a bundler context.
    return await import(
      /* webpackIgnore: true */ /* @vite-ignore */ details.packageName
    )
  } catch (error) {
    throw optionalEngineDependencyError(details, error)
  }
}
