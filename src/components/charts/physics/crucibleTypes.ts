/**
 * Pure domain contracts for CrucibleChart.
 *
 * A Crucible run is a bounded, controlled event tape. Source components are
 * assigned to at most one product, while products may remain `forming` across
 * several events before being completed and poured to an outlet.
 */
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type {
  PhysicsPipelineConfig,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import type { PhysicsColliderSpec } from "../../stream/physics/PhysicsKernel"

export type CrucibleComponentStatus =
  | "queued"
  | "active"
  | "transformed"
  | "consumed"
  | "retained"
  | "ejected"
  | "failed"
  | "recovered"

export type CrucibleProductStatus = "forming" | "complete"

export type CrucibleMotion =
  "charge" | "mix" | "hold" | "press" | "bind" | "separate" | "pour" | "quench"

export type CrucibleMetricMap = Record<string, number>

export interface CruciblePhase {
  id: string
  duration: number
  label?: string
  description?: string
  intensity?: number
  motion?: CrucibleMotion
  color?: string
  metrics?: Record<string, string | number>
}

export interface CrucibleOutlet {
  id: string
  label?: string
  description?: string
  side?: "left" | "right" | "bottom"
  color?: string
  order?: number
}

/**
 * Source-component selector. Supplied fields intersect; ids are resolved in
 * lexical order before `count` is applied so fresh arrays replay identically.
 */
export interface CrucibleSelector {
  ids?: readonly string[]
  categories?: readonly string[]
  statuses?: readonly CrucibleComponentStatus[]
  outletIds?: readonly string[]
  count?: number
}

/** A declared mold. State is created only when an effect forms the product. */
export interface CrucibleProductDefinition {
  id: string
  label?: string
  description?: string
  category?: string
  /** Optional declared final amount, applied when the product completes. */
  amount?: number
  color?: string
  metrics?: CrucibleMetricMap
  outletId?: string
  order?: number
}

export interface CrucibleLoss {
  amount?: number
  metrics?: CrucibleMetricMap
  label?: string
}

export interface CrucibleRelationDefinition {
  id: string
  sourceIds: readonly string[]
  label?: string
  category?: string
  strength?: number
  metrics?: CrucibleMetricMap
}

export type CrucibleRelationResolution = "combined" | "rejected" | "expired"

export interface CrucibleRelationState extends CrucibleRelationDefinition {
  status: "active" | "resolved"
  createdByEventId: string
  createdAt: number
  resolution?: CrucibleRelationResolution
  resolvedByEventId?: string
  resolvedAt?: number
  reason?: string
}

export interface CrucibleSetStateEffect {
  type: "set-state"
  select: CrucibleSelector
  state: Exclude<CrucibleComponentStatus, "consumed">
  outletId?: string
  reason?: string
  metricsDelta?: CrucibleMetricMap
}

export interface CrucibleSetRelationEffect {
  type: "set-relation"
  relation: CrucibleRelationDefinition
}

export interface CrucibleResolveRelationEffect {
  type: "resolve-relation"
  relationIds: readonly string[]
  resolution: CrucibleRelationResolution
  reason?: string
}

export interface CrucibleCombineEffect {
  type: "combine"
  sourceIds: readonly string[]
  productId: string
  basisRelationIds?: readonly string[]
  loss?: CrucibleLoss
  /** Defaults to true. Set false to admit later `contribute` effects. */
  complete?: boolean
}

export interface CrucibleContributeEffect {
  type: "contribute"
  sourceIds: readonly string[]
  productId: string
  basisRelationIds?: readonly string[]
  loss?: CrucibleLoss
}

export interface CrucibleCompleteProductEffect {
  type: "complete-product"
  productId: string
  outletId?: string
  reason?: string
}

export interface CrucibleProductAllocation {
  productId: string
  amount?: number
  metrics?: CrucibleMetricMap
}

export interface CrucibleSplitEffect {
  type: "split"
  sourceId: string
  products: readonly CrucibleProductAllocation[]
  loss?: CrucibleLoss
}

export interface CrucibleEjectEffect {
  type: "eject"
  select: CrucibleSelector
  outletId: string
  state?: "ejected" | "failed" | "retained" | "recovered"
  reason?: string
}

export type CrucibleMetricTarget =
  "run" | { components: CrucibleSelector } | { productIds: readonly string[] }

export interface CrucibleSetMetricEffect {
  type: "set-metric"
  target: CrucibleMetricTarget
  metricsDelta: CrucibleMetricMap
}

export interface CrucibleSetOutcomeEffect {
  type: "set-outcome"
  outcome: string
  summary?: string
}

export type CrucibleEffect =
  | CrucibleSetStateEffect
  | CrucibleSetRelationEffect
  | CrucibleResolveRelationEffect
  | CrucibleCombineEffect
  | CrucibleContributeEffect
  | CrucibleCompleteProductEffect
  | CrucibleSplitEffect
  | CrucibleEjectEffect
  | CrucibleSetMetricEffect
  | CrucibleSetOutcomeEffect

export type CrucibleEventAt =
  | { time: number; phaseId?: never; progress?: never }
  | { time?: never; phaseId: string; progress?: number }

export interface CrucibleEvent {
  id: string
  at: CrucibleEventAt
  effects: readonly CrucibleEffect[]
  label?: string
  description?: string
  summary?: string
}

export interface CrucibleHistoryItem {
  eventId: string
  effectType: CrucibleEffect["type"]
  phaseId: string
  authoredAt: number
  appliedAt: number
  label?: string
  summary?: string
  sourceIds?: string[]
  productIds?: string[]
  relationIds?: string[]
  outletIds?: string[]
}

export interface CrucibleComponentState<TDatum extends Datum = Datum> {
  id: string
  label: string
  category: string
  datum: TDatum
  status: CrucibleComponentStatus
  initialAmount: number
  amount: number
  initialMetrics: CrucibleMetricMap
  metrics: CrucibleMetricMap
  productIds: string[]
  outletId?: string
  reason?: string
  history: CrucibleHistoryItem[]
}

export interface CrucibleProductState {
  id: string
  label: string
  description?: string
  category: string
  color?: string
  order?: number
  declaredAmount?: number
  amount: number
  metrics: CrucibleMetricMap
  status: CrucibleProductStatus
  sourceIds: string[]
  outletId?: string
  createdByEventId: string
  createdAt: number
  completedByEventId?: string
  completedAt?: number
  reason?: string
  history: CrucibleHistoryItem[]
}

export interface CrucibleRunState<TDatum extends Datum = Datum> {
  elapsed: number
  phaseElapsed: number
  phaseId: string
  phaseIndex: number
  playing: boolean
  complete: boolean
  outcome?: string
  summary?: string
  eventsApplied: string[]
  components: Record<string, CrucibleComponentState<TDatum>>
  products: Record<string, CrucibleProductState>
  relations: Record<string, CrucibleRelationState>
  input: {
    amount: number
    metrics: CrucibleMetricMap
  }
  metrics: CrucibleMetricMap
  loss: {
    amount: number
    metrics: CrucibleMetricMap
  }
  history: CrucibleHistoryItem[]
}

export type CrucibleMaterializationType =
  | "activate-relation"
  | "resolve-relation"
  | "form-product"
  | "update-product"
  | "complete-product"
  | "split-source"
  | "retarget-component"
  | "retarget-product"

export interface CrucibleMaterialization {
  type: CrucibleMaterializationType
  eventId: string
  sourceIds?: string[]
  productIds?: string[]
  relationIds?: string[]
  outletIds?: string[]
}

export interface CrucibleObservation {
  type: "crucible-event" | CrucibleMaterializationType | "crucible-outcome"
  eventId: string
  phaseId: string
  authoredAt: number
  appliedAt: number
  sourceIds?: string[]
  productIds?: string[]
  relationIds?: string[]
  outletIds?: string[]
  outcome?: string
}

export interface CrucibleDiagnostic {
  severity: "warning" | "error"
  code: string
  message: string
  path?: string
  ids?: string[]
}

export interface CrucibleApplyResult<TDatum extends Datum = Datum> {
  applied: boolean
  state: CrucibleRunState<TDatum>
  materializations: CrucibleMaterialization[]
  observations: CrucibleObservation[]
  diagnostics: CrucibleDiagnostic[]
}

export interface CrucibleApplyContext {
  phaseId: string
  authoredAt: number
  appliedAt: number
  products: readonly CrucibleProductDefinition[]
  outlets: readonly CrucibleOutlet[]
}

export interface CrucibleCompiledPhase extends CruciblePhase {
  index: number
  start: number
  end: number
}

/** `boundaryRank` encodes phase-end (0), then next phase-start (1). */
export interface CrucibleCompiledEvent extends CrucibleEvent {
  index: number
  authoredAt: number
  phaseId: string
  phaseIndex: number
  boundaryRank: 0 | 1
}

export interface CrucibleAccessors<TDatum extends Datum = Datum> {
  idAccessor?: ChartAccessor<TDatum, string>
  labelAccessor?: ChartAccessor<TDatum, string>
  categoryAccessor?: ChartAccessor<TDatum, string>
  amountAccessor?: ChartAccessor<TDatum, number>
  metricsAccessor?: ChartAccessor<TDatum, CrucibleMetricMap>
  initialStateAccessor?: ChartAccessor<TDatum, CrucibleComponentStatus>
}

export interface CrucibleCompileOptions<
  TDatum extends Datum = Datum
> extends CrucibleAccessors<TDatum> {
  data: readonly TDatum[]
  phases: readonly CruciblePhase[]
  products?: readonly CrucibleProductDefinition[]
  outlets?: readonly CrucibleOutlet[]
  events?: readonly CrucibleEvent[]
  size?: [number, number]
  seed?: number | string
  bodyRadius?: number
  radiusRange?: [number, number]
  metrics?: CrucibleMetricMap
}

export interface CrucibleLayoutOutlet extends CrucibleOutlet {
  x: number
  y: number
  width: number
  height: number
}

export interface CrucibleLayout {
  width: number
  height: number
  phaseRail: { x: number; y: number; width: number; height: number }
  chamber: { x: number; y: number; width: number; height: number }
  mouth: { x: number; y: number; width: number; height: number }
  projection: { x: number; y: number; width: number; height: number }
  outlets: CrucibleLayoutOutlet[]
}

export interface CrucibleBodyDatum<TDatum extends Datum = Datum> {
  __crucible: true
  kind: "component" | "product"
  semanticId: string
  sourceDatum?: TDatum
  product?: CrucibleProductState
}

export interface CrucibleCompiledPlan<TDatum extends Datum = Datum> {
  phases: CrucibleCompiledPhase[]
  events: CrucibleCompiledEvent[]
  products: CrucibleProductDefinition[]
  outlets: CrucibleOutlet[]
  duration: number
  initialState: CrucibleRunState<TDatum>
  terminalState: CrucibleRunState<TDatum>
  layout: CrucibleLayout
  colliders: PhysicsColliderSpec[]
  config: PhysicsPipelineConfig
  initialSpawns: PhysicsQueuedSpawn[]
  terminalSpawns: PhysicsQueuedSpawn[]
  semanticKey: string
  diagnostics: CrucibleDiagnostic[]
}

export interface CrucibleReplayResult<TDatum extends Datum = Datum> {
  state: CrucibleRunState<TDatum>
  materializations: CrucibleMaterialization[]
  observations: CrucibleObservation[]
  diagnostics: CrucibleDiagnostic[]
}

export type CrucibleProjectionGroupBy =
  "status" | "outlet" | "category" | "product"

export interface CrucibleProjectionSpec {
  groupBy?: CrucibleProjectionGroupBy
  measure?: "count" | "amount" | string
  order?: readonly string[]
  showInputBaseline?: boolean
  showDelta?: boolean
}

export interface CrucibleProjectionRow {
  key: string
  label: string
  count: number
  amount: number
  metrics: CrucibleMetricMap
  status?: CrucibleComponentStatus | CrucibleProductStatus
  outletId?: string
  category?: string
  productId?: string
}

export interface CrucibleConservationSpec {
  field?: "amount" | string
  tolerance?: number
}

export interface CrucibleConservationResult {
  field: string
  input: number
  products: number
  unassigned: number
  loss: number
  output: number
  delta: number
  conserved: boolean
}
