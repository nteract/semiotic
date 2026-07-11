/**
 * Shared result vocabulary for experimental portability adapters.
 *
 * An adapter must make a supported translation, a known loss, and a refusal
 * distinguishable to callers. Warnings attached to an otherwise plausible
 * chart are not sufficient: another renderer cannot infer that it should not
 * render an approximation.
 */

/** Whether an adapter translated exactly, translated with declared loss, or refused. */
export type PortabilityStatus = "success" | "lossy" | "refused"

export type PortabilityDiagnosticSeverity = "warning" | "error"

/** A stable, machine-readable adapter diagnostic. */
export interface PortabilityDiagnostic {
  code: string
  severity: PortabilityDiagnosticSeverity
  message: string
  path?: string
}

/** A declared semantic loss for an explicitly lossy translation. */
export interface PortabilityLoss {
  code: string
  message: string
  path?: string
}

/**
 * Enough information to identify an adapter operation without coupling this
 * library-neutral result shape to a particular renderer or chart config.
 */
export interface PortabilityProvenance {
  adapter: string
  direction: "import" | "export"
  sourceFormat: string
  targetFormat: string
  specVersion?: string
  /** Metadata that travelled with the source artifact, when it is serializable. */
  metadata?: Record<string, unknown>
}

/** Base result shared by adapters that import and export different artifact types. */
export interface PortabilityResult {
  status: PortabilityStatus
  diagnostics: readonly PortabilityDiagnostic[]
  lossReport: readonly PortabilityLoss[]
  provenance: PortabilityProvenance
}

/** Result shape for adapters that produce a Semiotic configuration. */
export interface PortabilityImportResult<TConfig> extends PortabilityResult {
  config?: TConfig
}

/** Result shape for adapters that produce a foreign artifact or spec. */
export interface PortabilityExportResult<TArtifact> extends PortabilityResult {
  artifact?: TArtifact
}
