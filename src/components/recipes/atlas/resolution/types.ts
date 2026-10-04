/**
 * Experimental Network Resolution sidecar, schema 0.1.
 * NR0–NR4 contracts, available through the opt-in experimental entry point.
 * JSON-facing fields contain no functions, class instances, Maps, or Sets.
 */
import type { AtlasOccurrence } from "../types"

export type Id = string
export type PageId = Id
export type GroupId = Id
export type EdgeId = Id
export type NodeId = Id
export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json }
export type Domain = "node" | "edge" | "occurrence" | "feature"
export type Basis = "structural" | "observed"

export interface SetRef {
  id: Id
  domain: Domain
}
export type SourceSet =
  | { ref: SetRef; codec: "sorted-string-ids/v1"; values: Id[] }
  | { ref: SetRef; codec: "set-union/v1"; refs: SetRef[] }

export interface RevisionRef {
  graphRef: string
  sourceRevision: string
  atlasAnalysisRevision: string
  evidencePolicyId: string
}
export interface Issue {
  code: string
  severity: "fatal" | "warning" | "info"
  message: string
  subjectIds: Id[]
}
export interface Coverage {
  status: "complete" | "incomplete" | "truncated" | "unknown" | "unsupported"
  reason?: string
  /** Counts are present only if actually known. */
  examined?: number
  total?: number
}
export interface Limits {
  maxPages: number
  maxCandidates: number
  maxWitnessEdges: number
  maxExploredEdges?: number
}
export interface Pin {
  nodeId: NodeId
  kind: "keep-visible" | "keep-label"
}
export type RuleSpec =
  | { kind: "fold-serial-interiors"; version: "1" }
  | { kind: "fold-pendant-fans"; version: "1"; minLeaves: number }
  | { kind: "contain-scc"; version: "1" }
  | { kind: "group-authored"; version: "1"; hierarchyRef: string }
  | {
      kind: "annotate-dag-transitivity"
      version: "1"
      semanticPolicyId: string
    }

export interface ResolutionSpec {
  schemaVersion: "0.1"
  id: Id
  relationScopeId: string
  rules: RuleSpec[]
  /** Optional consecutive rule batches, summing to rules.length. Default: one rule per page. */
  pageRuleCounts?: number[]
  pins: Pin[]
  limits: Limits
}
/** Supplied separately from the current atlas's minimal edge shape. */
export interface EdgeSemantics {
  edgeId: EdgeId
  relationClass: string
  /** Reference to a declared meaning, not a generic 'weight' field. */
  measurePolicyId?: string
  reachabilitySubduingAllowed: boolean
}
export interface AuthoredGroup {
  id: Id
  label: string
  sourceNodeIds: NodeId[]
  parentId?: Id
}
export interface ResolutionBindings {
  edgeSemantics: EdgeSemantics[]
  authoredHierarchies: { id: string; groups: AuthoredGroup[] }[]
}
export interface SourceFeature {
  id: Id
  kind: "chain" | "pendant-fan" | "scc" | "authored-group" | "motif" | "cut"
  nodes: SetRef
  edges: SetRef
  roles: { [role: string]: Id[] }
  discovery: "exact-structural" | "supplied" | "heuristic"
  coverage: Coverage
  scopeId: string
}
export interface BoundaryPort {
  id: Id
  groupId: GroupId
  direction: "in" | "out"
  /** An exact endpoint. A displayed multi-endpoint port is an alias set. */
  internalNodeId: NodeId
  incidentEdges: SetRef
}
export interface ResolutionGroup {
  id: GroupId
  label: string
  kind: "singleton" | "chain" | "pendant-fan" | "scc" | "authored-group"
  sourceNodes: SetRef
  internalEdges: SetRef
  /** Children at creation. Reusing this group on a later page adds no self-child. */
  childGroupIds: GroupId[]
  weaklyConnected: true
  portIds: Id[]
  explanationEventIds: Id[]
  internalCycleRank: number
}
export interface EndpointPair {
  sourceNodeId: NodeId
  targetNodeId: NodeId
  originalEdges: SetRef
}
export interface BoundaryBundle {
  id: Id
  sourceGroupId: GroupId
  targetGroupId: GroupId
  relationKey: string
  originalEdges: SetRef
  /** Actual observed graph endpoint pairs; never an implicit Cartesian product. */
  endpointPairs: EndpointPair[]
}
export interface CycleLedger {
  convention: "undirected-multigraph-keep-edge-ids/v1"
  sourceRank: number
  internalRank: number
  boundaryRank: number
  identityChecked: boolean
}
export interface ResolutionPage {
  id: PageId
  ordinal: number
  label: string
  groupIds: GroupId[]
  bundleIds: Id[]
  /** For the straightforward MVP. A codec-backed mapping may replace this later. */
  nodeOwner: { [originalNodeId: string]: GroupId }
  internalEdgeCount: number
  boundaryEdgeCount: number
  originalNodeCount: number
  originalEdgeCount: number
  cycles: CycleLedger
  annotationIds: Id[]
  presentation: EdgePresentation[]
  coverage: Coverage
}
export interface StructuralWitness {
  kind: "structural-path"
  nodeIds: NodeId[]
  edgeIds: EdgeId[]
  scopeId: string
}
export interface ObservedWitness {
  kind: "observed-segment"
  occurrenceId: Id
  startOffset: number
  /** Inclusive node-path offset, not an inferred wall-clock timestamp. */
  endOffset: number
  nodeIds: NodeId[]
  /** Omit if the occurrence cannot identify particular parallel edges. */
  edgeIds?: EdgeId[]
  edgeIdentity: "resolved" | "ambiguous"
}
export type Witness = StructuralWitness | ObservedWitness
export interface PreservationClaim {
  property:
    | "source-ownership"
    | "weak-connectivity"
    | "cycle-account"
    | "scoped-reachability"
    | "source-path-recovery"
  scopeId: string
  status: "checked" | "not-checked" | "failed"
  witnessIds: Id[]
  limitations: string[]
}
export interface ResolutionEvent {
  id: Id
  fromPageId: PageId
  toPageId: PageId
  action: "grouped" | "annotated" | "subdued" | "rejected"
  rule: RuleSpec
  featureIds: Id[]
  beforeGroupIds: GroupId[]
  afterGroupIds: GroupId[]
  affectedEdges: SetRef
  reason: string
  claims: PreservationClaim[]
}
export interface Transition {
  fromPageId: PageId
  toPageId: PageId
  /** Each old group maps to exactly one new group; identity is permitted. */
  groupMap: { [oldGroupId: string]: GroupId }
  eventIds: Id[]
}
export interface EdgePresentation {
  edges: SetRef
  representation: "literal" | "bundle" | "component-internal"
  protected: boolean
  subduedForReachability: boolean
  witnessIds: Id[]
  /** Visual coverage is not analysis coverage. */
  viewport: "displayed" | "not-in-current-view"
}
export interface EdgeHistory {
  originalEdgeId: EdgeId
  /** null = still boundary at configured stop; never an infinity/importance score. */
  firstInternalPage: number | null
  owners: { pageId: PageId; sourceOwner: GroupId; targetOwner: GroupId }[]
}
export interface PreparedNetworkResolution {
  schemaVersion: "0.1"
  id: Id
  revision: RevisionRef
  analysisRevision: string
  sourceFingerprint: string
  /** Admitted topology needed for source recovery; independent of layout and source mutations. */
  source: {
    nodes: { id: string; sectionId?: string }[]
    edges: { id: string; source: string; target: string }[]
    occurrences?: AtlasOccurrence[]
  }
  traceCoverage: Coverage
  edgeSemantics: EdgeSemantics[]
  sectionOrder: string[]
  spec: ResolutionSpec
  pages: ResolutionPage[]
  groups: ResolutionGroup[]
  bundles: BoundaryBundle[]
  ports: BoundaryPort[]
  features: SourceFeature[]
  events: ResolutionEvent[]
  transitions: Transition[]
  sets: SourceSet[]
  witnesses: { id: Id; value: Witness }[]
  issues: Issue[]
  stoppedBecause: "configured-end" | "fixed-point" | "resource-limit"
}
export type PrepareResult =
  | { ok: true; value: PreparedNetworkResolution; issues: Issue[] }
  | { ok: false; issues: Issue[] }
export interface PortPathQuery {
  pageId: PageId
  groupId: GroupId
  ingressId: Id
  egressId: Id
  basis: Basis
  /** Internal connectivity alone never certifies an observed continuation. */
  continuation: "inside-only" | "boundary-context"
  /** Domain must be edge; restrict to selected incoming/outgoing source records.
   * Omit to query all incidence admitted at that port, with existential semantics.
   * boundary-context includes the exterior predecessor/successor in one segment.
   */
  ingressEdges?: SetRef
  egressEdges?: SetRef
  scopeId: string
}
export interface PortPathEnvelope {
  revision: RevisionRef
  analysisRevision: string
  query: PortPathQuery
  coverage: Coverage
  limitations: string[]
}
/** Positive claims carry a witness; negative claims name an exhausted scope. */
export type PortPathResult = PortPathEnvelope &
  (
    | { verdict: "yes"; witness: Witness; exhaustedScopeRef?: never }
    | { verdict: "no"; witness?: never; exhaustedScopeRef: string }
    | { verdict: "unknown"; witness?: never; exhaustedScopeRef?: never }
  )
export interface CanonicalSelection {
  revision: RevisionRef
  analysisRevision: string
  target:
    | { kind: "source-set"; set: SetRef }
    | { kind: "port-path"; query: PortPathQuery }
    | { kind: "witness"; witnessId: Id }
}
export type SemanticTarget =
  | { kind: "original-node"; nodeId: NodeId }
  | { kind: "group"; pageId: PageId; groupId: GroupId }
  | { kind: "original-edge"; edgeId: EdgeId }
  | { kind: "bundle"; pageId: PageId; bundleId: Id }
  | { kind: "port"; portId: Id }
  | { kind: "support-cell"; query: PortPathQuery }
  | { kind: "membership"; transitionEventId: Id }
  | { kind: "annotation"; featureId: Id }
export interface ViewBudget {
  maxGroups: number
  maxLiteralEdges: number
  maxRails: number
  maxColumns: number
}
export interface ResolutionViewSpec {
  mode: "resolution-atlas" | "boundary-loom" | "component-cutaway"
  pageIds: PageId[]
  selectedGroupId?: GroupId
  referenceOrderId: Id
  budget: ViewBudget
  edgeOffset?: number
  railOffset?: number
  collapseGroups?: boolean
}

export interface QueryEnvelope<T> {
  revision: RevisionRef
  analysisRevision: string
  scopeId: string
  coverage: Coverage
  limitations: string[]
  value: T
}

export interface EdgeAlternative {
  verdict: "yes" | "no" | "unknown"
  originalEdgeId: string
  witness?: StructuralWitness
}
