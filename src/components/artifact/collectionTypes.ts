import type {
  ActionRecord,
  ArtifactContract,
  CorrectionRecord,
  JsonObject,
  JsonValue,
  ObligationResult,
  ObligationSummary
} from "./types"

export interface MetricDefinition {
  id: string
  label: string
  definition: string
  unit?: string
  denominator?: string
  version?: string
}

export interface CollectionFilterState {
  id: string
  label?: string
  value?: JsonValue
  appliesToArtifactIds: string[]
}

export interface ArtifactViewState {
  artifactId: string
  metricIds?: string[]
  filterIds?: string[]
  selectionFingerprint?: string
  summarySelectionFingerprint?: string
  status?: "ready" | "stale" | "failed" | "unknown"
}

export interface ClaimDependency {
  claimId: string
  artifactId: string
  evidenceIds: string[]
  sourceIds?: string[]
}

/** An artifact-qualified claim reference for collection-wide records. */
export interface CollectionClaimReference {
  artifactId: string
  claimId: string
}

/** Evidence IDs are artifact-local, even when panels share a collection. */
export interface CollectionEvidenceReference {
  artifactId: string
  evidenceId: string
}

/**
 * Optional exact targets for a correction whose claim identifiers are not
 * unique across a collection. The unqualified CorrectionRecord fields remain
 * available for compatibility with existing artifact-local records.
 */
export interface CollectionCorrectionScope {
  affectedClaims?: CollectionClaimReference[]
  replacementClaims?: CollectionClaimReference[]
}

export interface CollectionCorrectionRecord extends CorrectionRecord {
  scope?: CollectionCorrectionScope
}

export interface ArtifactCollectionContract {
  collectionVersion: "0.1"
  id: string
  title?: string
  artifacts: ArtifactContract[]
  metrics?: MetricDefinition[]
  policyId?: string
  filters?: CollectionFilterState[]
  views?: ArtifactViewState[]
  sourceRegistry?: Array<{
    id: string
    label?: string
    version?: string
    fingerprint?: string
  }>
  claimDependencies?: ClaimDependency[]
  actions?: ActionRecord[]
  corrections?: CollectionCorrectionRecord[]
  extensions?: JsonObject
}

export interface ArtifactCollectionAudit {
  ok: boolean
  policy?: { id: string; version: string }
  summary: ObligationSummary
  findings: ObligationResult[]
}

export type { ArtifactCollectionAuditOptions } from "./collectionPolicy"

export interface ArtifactCollectionTransfer {
  status: "preserved" | "unsupported-version" | "invalid"
  omittedPaths: string[]
  warnings: string[]
}

export interface SerializedArtifactCollection {
  collection?: ArtifactCollectionContract | JsonObject
  transfer: ArtifactCollectionTransfer
}

export interface ArtifactCollectionValidation {
  valid: boolean
  errors: Array<{ path: string; message: string }>
  warnings: Array<{ path: string; message: string }>
}

export type ArtifactLineageNodeKind =
  | "source"
  | "schema"
  | "processing-job"
  | "quality-check"
  | "snapshot"
  | "artifact"
  | "evidence"
  | "claim"
  | "action"

export interface ArtifactLineageNode {
  id: string
  kind: ArtifactLineageNodeKind
  label?: string
  artifactId?: string
}

export interface ArtifactLineageEdge {
  source: string
  target: string
  relation: "produces" | "supports" | "contains" | "acts-on" | "supersedes"
}

export interface ArtifactCollectionLineage {
  nodes: ArtifactLineageNode[]
  edges: ArtifactLineageEdge[]
}
