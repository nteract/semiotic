export const NETWORK_ATLAS_SCHEMA_VERSION = "0.2" as const

export type CompletenessStatus =
  | "known"
  | "unknown"
  | "incomplete"
  | "truncated"
  | "unsupported-template"

export type EvidenceStatus = "exact" | "estimated" | "unknown" | "incomplete"

export type UnitKind = "stock" | "rate" | "capacity"

export type AtlasCountUnit = "entity" | "occurrence" | "embedding" | "work-item"

export type MotifTemplate =
  | "serial-chain"
  | "repeated-state-episode"
  | "fan-out"
  | "fan-in"
  | "split-rejoin-diamond"
  | "shared-upstream-source"
  | "connector-bypass"

export const MOTIF_CATALOG_TEMPLATES: readonly MotifTemplate[] = [
  "serial-chain",
  "repeated-state-episode",
  "fan-out",
  "fan-in",
  "split-rejoin-diamond",
  "shared-upstream-source",
  "connector-bypass"
]

export const PHASE1_MOTIF_MATCHERS: readonly MotifTemplate[] = [
  "serial-chain",
  "fan-out",
  "fan-in"
]

export const PHASE2_MOTIF_MATCHERS: readonly MotifTemplate[] = [
  ...PHASE1_MOTIF_MATCHERS,
  "repeated-state-episode"
]

export type MeasureSpec = {
  unitKind: UnitKind
  countUnit: AtlasCountUnit
  timeDenominator?: string
  description?: string
}

export type CoordinateSpec =
  | { kind: "ordinal"; sectionIds: string[] }
  | { kind: "numeric"; field: string; unit: string }

export type RelationPolicy = {
  directed: true
  edgeIdRequired: true
  parallelEdges: "keep-by-id"
  selfLoops: "keep-by-id"
}

export type MotifSpec = {
  catalogId: string
  catalogVersion: string
  countUnit: AtlasCountUnit
  denominatorRef?: string
  timeWindowMs?: number
  anchor: "completion"
  matchBudget?: number
}

export type DisplayForestSpec =
  | { kind: "rooted-backbone"; roots: string[]; rankingPolicyId: string }
  | {
      kind: "observed-prefix"
      roots?: string[]
      rankingPolicyId?: string
      referencePartition?: string
    }

export type SharedPartitionComparison = {
  partitions: string[]
  denominatorMeasureId: string
  referencePartition?: string
}

export type TemporalContract =
  | { kind: "snapshot" }
  | { kind: "window"; start: number; end: number }

export type NetworkAtlasSpec = {
  schemaVersion: typeof NETWORK_ATLAS_SCHEMA_VERSION
  coordinate: CoordinateSpec
  relations: RelationPolicy
  evidencePolicyId: string
  measures: Record<string, MeasureSpec>
  motifs: MotifSpec
  forest: { display: DisplayForestSpec }
  comparison?: SharedPartitionComparison
  dataRevision: string
  temporal: TemporalContract
}

export type AtlasNode = {
  id: string
  sectionId?: string
  completeness?: CompletenessStatus
}

export type AtlasEdge = {
  id: string
  source: string
  target: string
}

export type AtlasOccurrence = {
  id: string
  entityId: string
  entityCount?: number
  nodePath: string[]
  complete: boolean
  missingPrehistory?: boolean
  partition?: string
  groupKeys?: Record<string, string>
}

export type AtlasMeasureValue = {
  measureId: string
  subjectId: string
  value: number
  status: EvidenceStatus
}

export type NetworkAtlasSource = {
  graphRef: string
  revision: string
  nodes: AtlasNode[]
  edges: AtlasEdge[]
  occurrences?: AtlasOccurrence[]
  measureValues: AtlasMeasureValue[]
}

export type AtlasIssueSeverity = "fatal" | "warn"

export type AtlasIssue = {
  kind: string
  severity: AtlasIssueSeverity
  message: string
  id?: string
}

export type SectionIndex = {
  kind: "ordinal"
  sectionIds: string[]
  nodeIdsBySection: Record<string, string[]>
}

export type MotifFlags = {
  occurrence: boolean
  temporal: boolean
  trajectorySupported: boolean
  enriched: boolean
}

export type MotifMatch = {
  id: string
  template: MotifTemplate
  roles: Record<string, string | string[]>
  nodePath: string[]
  edgeIds: string[]
  startSectionId?: string
  completionSectionId?: string
  intersectSectionIds: string[]
  entityIds: string[]
  entityWeights: Record<string, number>
  entityCount: number
  flags: MotifFlags
  truncation?: { disclosed: true; omitted: number; fullCount: number }
}

export type MotifMatchIndex = {
  catalogId: string
  catalogVersion: string
  matches: MotifMatch[]
  incompleteCandidates: Array<{
    template: MotifTemplate
    occurrenceId: string
    reason: "missing-prehistory"
  }>
  unsupportedTemplates: MotifTemplate[]
}

export type DisplayForest = {
  kind: "rooted-backbone"
  roots: string[]
  rankingPolicyId: string
  backboneEdgeIds: string[]
  primaryParentEdgeIdByNode: Record<string, string>
}

export type PrefixForestNode = {
  id: string
  stateId: string
  prefix: string[]
  parentId: string | null
  childIds: string[]
  entityCount: number
  occurrenceIds: string[]
  partitionCounts: Record<string, number>
}

export type PrefixForest = {
  kind: "observed-prefix"
  rootIds: string[]
  nodes: PrefixForestNode[]
  order: string[]
  referencePartition?: string
}

export type PreparedComparison = {
  partitions: string[]
  denominatorMeasureId: string
  referencePartition?: string
  rows: Array<{
    partition: string
    assigned: number
    motifUsers: Record<string, number>
    outcomes: Record<string, number>
  }>
}

export type OriginalEdgeIndex = {
  residualEdgeIds: string[]
  originalEdgeIds: string[]
}

export type SupportedHop = {
  from: string
  to: string
  via?: string
  occurrenceIds: string[]
}

export type RouteSupportIndex = {
  hops: SupportedHop[]
  graphAdjacency: Array<{ source: string; target: string; edgeId: string }>
}

export type LedgerEntry = {
  measureId: string
  subjectId: string
  subjectKind: "node" | "section" | "global"
  value: number
  status: EvidenceStatus
  unitKind: UnitKind
  countUnit: AtlasCountUnit
  timeDenominator?: string
}

export type MeasureLedger = {
  entries: LedgerEntry[]
}

export type CompletenessReport = {
  nodes: Record<string, CompletenessStatus>
  motifs: Record<string, CompletenessStatus>
  traces: CompletenessStatus
  truncation?: { disclosed: true; template: MotifTemplate; omitted: number }
}

export type AtlasProvenance = {
  sourceRevision: string
  analysisRevision: string
  generation: number
  relationScope: string
  motifCatalogVersion: string
  coordinatePolicy: string
  forestRoots: string[]
  rankingPolicyId: string
  population: AtlasCountUnit
  temporalHorizon: string
  evidencePolicyId: string
}

export type PreparedNetworkAtlas = {
  sourceGraphRef: string
  analysisRevision: string
  spec: NetworkAtlasSpec
  source: NetworkAtlasSource
  sections: SectionIndex
  motifs: MotifMatchIndex
  forest: DisplayForest
  residualEdges: OriginalEdgeIndex
  ports: RouteSupportIndex
  ledger: MeasureLedger
  completeness: CompletenessReport
  provenance: AtlasProvenance
  prefixForest?: PrefixForest
  comparison?: PreparedComparison
}

export type QueryResult<T> = {
  status: EvidenceStatus | "truncated"
  value?: T
  units?: string
  countUnit?: AtlasCountUnit
  unitKind?: UnitKind
  scope: string
  sourceRevision: string
  analysisRevision: string
  evidenceRefs: string[]
  limitations: string[]
}
