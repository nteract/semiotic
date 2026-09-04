import type { Datum } from "../charts/shared/datumTypes"

/** Current wire version for the portable interpretation sidecar. */
export const ARTIFACT_CONTRACT_VERSION = "0.1" as const

export type ArtifactContractVersion = typeof ARTIFACT_CONTRACT_VERSION

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
export interface JsonObject {
  [key: string]: JsonValue
}

export type ArtifactKind =
  "chart" | "dashboard" | "story" | "alert" | "agent-answer"

export type ArtifactStakes =
  "exploratory" | "informational" | "operational" | "high"

export type FieldKnowledgeStatus =
  "known" | "unknown" | "manual" | "not-applicable"

export type ObligationStatus =
  "pass" | "fail" | "warn" | "manual" | "unknown" | "not-applicable"

export type ArtifactRelation =
  | "claim-support"
  | "representation-fit"
  | "reception"
  | "time"
  | "challenge-and-correction"
  | "accountability"
  | "abstention"
  | "preservation"

export interface ArtifactFieldState {
  status: FieldKnowledgeStatus
  reason?: string
  suppliedBy?: "author" | "system" | "model-proposal" | "import"
  derived?: boolean
  reviewedBy?: string
}

export interface ArtifactIdentity {
  id: string
  kind: ArtifactKind
  component?: string
  title?: string
  createdAt?: string
  configFingerprint?: string
  dataFingerprint?: string
  revision?: string
}

export interface PurposeIntent {
  id: string
  strength?: "primary" | "secondary"
  source?: "author" | "derived" | "model-proposal" | "import"
  rationale?: string
}

export interface PurposeContract {
  intents: PurposeIntent[]
  communicativeAct?: string
  decisionContext?: string
  stakes?: ArtifactStakes
  allowedUses?: string[]
  prohibitedUses?: string[]
}

export type ClaimKind =
  | "description"
  | "observation"
  | "aggregation"
  | "inference"
  | "forecast"
  | "simulation"
  | "alert"
  | "recommendation"
  | "normative"

export type ClaimStatus =
  | "supported"
  | "provisional"
  | "disputed"
  | "superseded"
  | "retracted"
  | "unsupported"
  | "unknown"

export interface ActorRef {
  id?: string
  name?: string
  kind: "human" | "agent" | "watcher" | "system" | (string & {})
}

export interface ClaimReview {
  status: "proposed" | "reviewed" | "approved" | "rejected"
  reviewer?: ActorRef
  reviewedAt?: string
  rationale?: string
}

export interface ClaimUncertainty {
  kind: "interval" | "distribution" | "qualitative" | "unknown"
  lower?: number
  upper?: number
  confidence?: number
  unit?: string
  description?: string
}

export interface Claim {
  id: string
  text?: string
  kind: ClaimKind
  status: ClaimStatus
  evidenceIds: string[]
  scope?: JsonObject
  uncertainty?: ClaimUncertainty
  asOf?: string
  supersedes?: string[]
  authoredBy?: ActorRef
  review?: ClaimReview
  tags?: string[]
}

export type EvidenceRole =
  | "source-data"
  | "external-source"
  | "transformation"
  | "statistical-test"
  | "model-output"
  | "human-observation"
  | "policy-rule"
  | "quality-check"

export interface EvidenceSource {
  name?: string
  uri?: string
  version?: string
  retrievedAt?: string
  publisher?: string
}

export type TransformationKind =
  | "aggregation"
  | "filter"
  | "normalization"
  | "binning"
  | "join"
  | "smoothing"
  | "forecasting"
  | "simulation"
  | "other"

export interface TransformationRecord {
  id: string
  kind: TransformationKind
  description?: string
  inputEvidenceIds: string[]
  parameters?: JsonObject
  assumptions?: string[]
  implementation?: string
  performedAt?: string
  performedBy?: ActorRef
}

export interface BoundedEvidenceSample {
  rowCount?: number
  fields?: string[]
  values?: JsonValue[]
  truncated?: boolean
}

export interface EvidenceRef {
  id: string
  role: EvidenceRole
  label?: string
  source?: EvidenceSource
  fingerprint?: string
  dataVersion?: string
  observedAt?: string
  scope?: JsonObject
  sample?: BoundedEvidenceSample
  transformation?: TransformationRecord
  generatedClaimId?: string
  relationship?: "descriptive" | "correlational" | "causal" | "unknown"
}

export interface TimeField {
  field?: string
  value?: string
  timezone?: string
  granularity?: string
}

export type WindowStatus =
  "open" | "provisional" | "settled" | "reopened" | "corrected"

export interface TemporalSourceState {
  id: string
  kind:
    "stream" | "processing-job" | "quality-check" | "snapshot" | "publication"
  label?: string
  observedAt?: string
  version?: string
  timezone?: string
  granularity?: string
  freshness?: "fresh" | "stale" | "unknown"
  completeness?: "partial" | "provisional" | "settled" | "unknown"
}

export interface TemporalContext {
  eventTime?: TimeField
  observedAt?: string
  ingestedAt?: string
  processedAt?: string
  publishedAt?: string
  snapshotAt?: string
  presentation?: {
    state?: "live" | "historical" | "mixed"
    label?: string
  }
  freshness?: {
    status: "fresh" | "stale" | "unknown"
    checkedAt?: string
    heartbeatAt?: string
    expiresAt?: string
    basis?: string
  }
  watermark?: {
    value: string
    policy?: string
    allowedLateness?: string
  }
  window?: {
    start: string
    end: string
    status: WindowStatus
  }
  completeness?: {
    status: "partial" | "provisional" | "settled" | "unknown"
    basis?: string
  }
  revision?: {
    status: "original" | "backfilled" | "corrected" | "superseded"
    previousArtifactId?: string
    correctionId?: string
    reason?: string
  }
  snapshot?: {
    id?: string
    format?: "iceberg" | "delta" | "other"
    schemaVersion?: string
    catalogRef?: string
  }
  sources?: TemporalSourceState[]
}

export type ReceptionChannel =
  "visual" | "screen-reader" | "sonified" | "agent" | "print" | "low-bandwidth"

export interface ReceptionChannelContract {
  channel: ReceptionChannel
  disclosure?: "summary" | "standard" | "detailed"
  navigation?: boolean
  interactionInstructions?: boolean
  rawData?: "deny" | "bounded" | "allow"
  tokenBudget?: number
  privacyNotes?: string[]
}

export interface ReceptionContract {
  channels: ReceptionChannelContract[]
  audience?: string
  strengths?: string[]
  risks?: string[]
  scaffolds?: string[]
  description?: string
  dataFallback?: boolean
  manualChecks?: string[]
}

export interface DesignContract {
  chartFamily?: string
  whyThisForm?: string
  rejectedAlternatives?: Array<{
    representation: string
    reason: string
  }>
  risks?: string[]
  misuse?: string[]
}

export interface ClaimChallenge {
  id: string
  claimId: string
  status: "open" | "accepted" | "declined" | "resolved"
  reason: string
  raisedBy?: ActorRef
  raisedAt?: string
  counterclaimId?: string
  resolution?: string
}

export interface CorrectionRecord {
  id: string
  affectedClaimIds: string[]
  replacementClaimIds?: string[]
  reason: string
  createdAt?: string
  createdBy?: ActorRef
}

export interface ContestabilityContract {
  sourceRequestsAllowed?: boolean
  alternativeViews?: Array<{
    id: string
    label: string
    rationale?: string
  }>
  challenges?: ClaimChallenge[]
  corrections?: CorrectionRecord[]
  editorialExceptions?: Array<{
    ruleId: string
    rationale: string
    owner?: string
    reviewAt?: string
  }>
}

export interface ReviewRecord {
  id: string
  status: "pending" | "approved" | "changes-requested" | "rejected"
  reviewer?: ActorRef
  reviewedAt?: string
  rationale?: string
  policyId?: string
}

export interface ActionRecord {
  id: string
  action: string
  actor?: ActorRef
  actedAt?: string
  claimIds: string[]
  artifactId?: string
  artifactRevision?: string
  policyId?: string
  status?: "proposed" | "taken" | "reversed" | "invalidated"
  invalidatedByClaimId?: string
}

export interface AccountabilityContract {
  authors?: ActorRef[]
  generatedBy?: string
  dataSources?: string[]
  codeRef?: string
  reviews?: ReviewRecord[]
  actions?: ActionRecord[]
}

export type PreservationClass =
  | "full-fidelity"
  | "claim-evidence-preserved"
  | "visual-only"
  | "lossy"
  | "unknown"

export interface InheritanceContract {
  requiredPaths?: string[]
  prohibitedExports?: string[]
  privacy?: "public" | "restricted" | "confidential" | "unknown"
  rawDataDefault?: "exclude" | "bounded" | "include"
  preservation?: PreservationClass
  sourceArtifactIds?: string[]
}

export interface ArtifactContract {
  contractVersion: ArtifactContractVersion
  artifact: ArtifactIdentity
  purpose: PurposeContract
  claims: Claim[]
  evidence: EvidenceRef[]
  time?: TemporalContext
  reception?: ReceptionContract
  form?: DesignContract
  contestability?: ContestabilityContract
  accountability?: AccountabilityContract
  inheritance?: InheritanceContract
  fieldStatus?: Record<string, ArtifactFieldState>
  extensions?: JsonObject
}

export interface ObligationResult {
  id: string
  relation: ArtifactRelation
  status: ObligationStatus
  message: string
  path?: string
  repair?: string
  evidenceIds?: string[]
}

export interface ObligationSummary {
  pass: number
  fail: number
  warn: number
  manual: number
  unknown: number
  notApplicable: number
}

export interface ArtifactContractInput {
  id?: string
  kind?: ArtifactKind
  title?: string
  createdAt?: string
  revision?: string
  purpose?: Partial<PurposeContract>
  intents?: string | string[] | PurposeIntent[]
  claims?: Claim[]
  evidence?: EvidenceRef[]
  time?: TemporalContext
  reception?: ReceptionContract
  form?: DesignContract
  contestability?: ContestabilityContract
  accountability?: AccountabilityContract
  inheritance?: InheritanceContract
  fieldStatus?: Record<string, ArtifactFieldState>
  extensions?: JsonObject
}

export interface ArtifactBuildInput {
  component: string
  props?: Datum
  contract?: ArtifactContractInput
}
