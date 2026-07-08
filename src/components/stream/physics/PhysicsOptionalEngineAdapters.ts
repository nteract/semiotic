export interface PhysicsOptionalEngineInstallDetails {
  engine: string
  importPath: string
  packageName: string
  installCommand: string
}

export class PhysicsOptionalEngineDependencyError extends Error {
  readonly details: PhysicsOptionalEngineInstallDetails

  constructor(
    details: PhysicsOptionalEngineInstallDetails,
    cause?: unknown
  ) {
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

export async function loadOptionalPhysicsPeer(
  details: PhysicsOptionalEngineInstallDetails
): Promise<unknown> {
  try {
    return await import(/* @vite-ignore */ details.packageName)
  } catch (error) {
    throw optionalEngineDependencyError(details, error)
  }
}
