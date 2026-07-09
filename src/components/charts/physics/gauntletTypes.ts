/**
 * Gauntlet domain types + body-kind constants (no heavy runtime).
 */
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type {
  PhysicsQueuedSpawn,
  PhysicsSpawnSpringSpec
} from "../../stream/physics/PhysicsPipelineStore"
import type { StreamPhysicsRegionEffect } from "../../stream/physics/StreamPhysicsTypes"

export const CORE_KIND = "gauntlet-core" as const
export const POSITIVE_KIND = "gauntlet-positive" as const
export const NEGATIVE_KIND = "gauntlet-negative" as const

export interface GauntletProjectPlacement {
  graveyardX?: number
  graveyardY?: number
  routeY?: number
  socketX?: number
  socketY?: number
  startX?: number
  startY?: number
}

export interface GauntletPropertyForceContext<TDatum extends Datum = Datum> {
  body: PhysicsBodyState
  bodies: readonly PhysicsBodyState[]
  core: PhysicsBodyState
  index: number
  layout: GauntletLayout
  placement: Required<GauntletProjectPlacement>
  project: GauntletProjectState<TDatum>
}

export interface GauntletPropertyDefinition {
  id: string
  label?: string
  short?: string
  color?: string
  value?: number
  radius?: number
  mass?: number
  buoyancy?: number
  load?: number
  pull?: { x?: number; y?: number }
  popColor?: string
  spring?: false | Partial<PhysicsSpawnSpringSpec>
  target?: (context: GauntletPropertyForceContext) => { x: number; y: number } | null | undefined
}

export interface GauntletGate {
  id: string
  label?: string
  description?: string
  color?: string
  enabled?: boolean
  regionEffect?: Partial<Omit<StreamPhysicsRegionEffect, "id" | "shape">>
  time?: number
  x?: number
  width?: number
}

/** Pop one or more attached property ids from a project. */
export type GauntletPopSpec =
  | readonly string[]
  | {
      candidates?: readonly string[]
      count?: number
      ids?: readonly string[]
    }

export interface GauntletEffect {
  addPositive?: readonly string[] | Record<string, number>
  addNegative?: readonly string[] | Record<string, number>
  popPositive?: GauntletPopSpec
  /**
   * Remove attached negative property bodies — the inverse of the common
   * "pop positives / add negatives" gate. Supports the same array / candidates
   * / ids shape as {@link popPositive}.
   */
  popNegative?: GauntletPopSpec
  delayDelta?: number
  metricsDelta?: Record<string, number>
  outcome?: string
  stage?: string
  summary?: string
  viabilityDelta?: number
  when?: (context: GauntletEventContext) => boolean
}

export interface GauntletEvent {
  id: string
  label?: string
  time: number
  gateId?: string
  effects?: readonly GauntletEffect[]
  final?: boolean
  outcome?: string
  routeX?: number
  routeY?: number
  summary?: string
}

export interface GauntletEventLogItem {
  id: string
  label: string
  summary?: string
  time?: number
}

export interface GauntletProjectState<TDatum extends Datum = Datum> {
  crashX?: number
  id: string
  activePositiveIds: string[]
  datum: TDatum
  delay: number
  eventsApplied: string[]
  killed: boolean
  lastEvent?: GauntletEventLogItem
  metrics: Record<string, number>
  missingPositiveIds: string[]
  negativeIds: string[]
  outcome: string
  poppedPositiveIds: string[]
  /** Negative property ids removed by {@link GauntletEffect.popNegative}. */
  poppedNegativeIds: string[]
  stage: string
  viability: number
}

export interface GauntletLayout {
  crashY: number
  floorY: number
  gates: Array<Required<Pick<GauntletGate, "id" | "x" | "width">> & GauntletGate>
  graveyardX: number
  graveyardY: number
  height: number
  routeY: number
  socketX: number
  startX: number
  width: number
}

export interface GauntletEventContext<TDatum extends Datum = Datum> {
  event: GauntletEvent
  gate?: GauntletLayout["gates"][number]
  negativeProperties: Map<string, GauntletPropertyDefinition>
  positiveProperties: Map<string, GauntletPropertyDefinition>
  project: GauntletProjectState<TDatum>
}


/** Placement override for a project in layout space. */
export type GauntletProjectPlacementFn<TDatum extends Datum = Datum> = (
  project: GauntletProjectState<TDatum>,
  index: number,
  layout: GauntletLayout
) => Partial<GauntletProjectPlacement>

/** Optional spawn overrides for the project core body. */
export type GauntletCoreBodyFn<TDatum extends Datum = Datum> = (
  project: GauntletProjectState<TDatum>,
  index: number,
  layout: GauntletLayout,
  placement: Required<GauntletProjectPlacement>
) => Partial<PhysicsQueuedSpawn>

/** Custom viability scorer. */
export type GauntletViabilityFn<TDatum extends Datum = Datum> = (
  project: GauntletProjectState<TDatum>,
  context: {
    negativeProperties: Map<string, GauntletPropertyDefinition>
    positiveProperties: Map<string, GauntletPropertyDefinition>
  }
) => number

/** Accessors used when seeding project state from user rows. */
export interface GauntletAccessors<TDatum extends Datum = Datum> {
  idAccessor?: ChartAccessor<TDatum, string>
  initialViability?: ChartAccessor<TDatum, number>
  metricsAccessor?: ChartAccessor<TDatum, Record<string, number>>
  negativeAccessor?: ChartAccessor<TDatum, readonly string[]>
  positiveAccessor?: ChartAccessor<TDatum, readonly string[]>
}

/** Wall colliders matching {@link GAUNTLET_WALL} / SSR builder. */
export interface GauntletBodyDatum<TDatum extends Datum = Datum> {
  __gauntlet: true
  kind: typeof CORE_KIND | typeof POSITIVE_KIND | typeof NEGATIVE_KIND
  projectId: string
  property?: GauntletPropertyDefinition
  sourceDatum: TDatum
}

