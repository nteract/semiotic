/** Public, bounded CrucibleChart prop and imperative-handle contracts. */
import type { StreamPhysicsFrameProps } from "../../stream/physics/StreamPhysicsFrame"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import type {
  PhysicsHocFrameProps,
  PhysicsRerunMS,
  PhysicsSharedChartProps,
  TooltipProp
} from "./physicsHocUtils"
import type {
  CrucibleComponentStatus,
  CrucibleConservationResult,
  CrucibleConservationSpec,
  CrucibleDiagnostic,
  CrucibleEvent,
  CrucibleMetricMap,
  CrucibleObservation,
  CrucibleOutlet,
  CruciblePhase,
  CrucibleProductDefinition,
  CrucibleProjectionSpec,
  CrucibleRunState
} from "./crucibleTypes"

export interface CrucibleChartHandle<TDatum extends Datum = Datum> {
  play(): void
  pause(): void
  reset(): void
  /**
   * Atomically restart the deterministic tape and play from its origin.
   * Snapshot and reduced-motion renderers remain static at their configured
   * snapshot instead of animating.
   */
  replay(): void
  /** Advance to and apply the next authored phase boundary. */
  stepPhase(): void
  /** Resolve the complete bounded tape without animating intermediate time. */
  settle(): void
  getCrucibleState(): CrucibleRunState<TDatum>
}

export interface CrucibleControls {
  playPause?: boolean
  reset?: boolean
  stepPhase?: boolean
  timeline?: boolean
  speed?: boolean
}

export type CrucibleSnapshotAt = number | { phaseId: string; progress?: number }

export type CrucibleColorBy<TDatum extends Datum = Datum> =
  "category" | "status" | "outlet" | "product" | ChartAccessor<TDatum, string>

export interface CrucibleChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "margin" | "onClick">, PhysicsSharedChartProps {
  /** Controlled, bounded source charge. CrucibleChart has no live push API. */
  data: TDatum[]
  /** Ordered furnace program. Every phase must have a unique id and duration. */
  phases: readonly CruciblePhase[]
  products?: readonly CrucibleProductDefinition[]
  outlets?: readonly CrucibleOutlet[]
  events?: readonly CrucibleEvent[]

  idAccessor?: ChartAccessor<TDatum, string>
  labelAccessor?: ChartAccessor<TDatum, string>
  categoryAccessor?: ChartAccessor<TDatum, string>
  amountAccessor?: ChartAccessor<TDatum, number>
  metricsAccessor?: ChartAccessor<TDatum, CrucibleMetricMap>
  initialStateAccessor?: ChartAccessor<TDatum, CrucibleComponentStatus>

  metrics?: CrucibleMetricMap
  amountLabel?: string
  conservation?: boolean | CrucibleConservationSpec
  projection?: CrucibleProjectionSpec

  /**
   * Replay animates the tape; snapshot renders one deterministic instant.
   * Reduced-motion renderers should use snapshot mode and default to the
   * terminal state when `snapshotAt` is omitted.
   */
  playback?: "replay" | "snapshot"
  snapshotAt?: CrucibleSnapshotAt
  controls?: boolean | CrucibleControls
  paused?: boolean
  /** Semantic program speed. 0.25 is quarter-speed; 2 is double-speed. */
  playbackRate?: number
  /**
   * Delay after settling before a fresh deterministic replay. `null` or an
   * omitted value runs once; `0` schedules the reset on the next timer turn.
   * Snapshot/reduced-motion rendering does not auto-rerun.
   */
  rerunMS?: PhysicsRerunMS

  size?: [number, number]
  seed?: number | string
  /** Fixed source-body radius. Per-row radius accessors are outside bounded V1. */
  bodyRadius?: number
  radiusRange?: [number, number]
  colorBy?: CrucibleColorBy<TDatum>
  showBonds?: boolean
  showChrome?: boolean
  showProjection?: boolean

  frameProps?: PhysicsHocFrameProps<"bodyForces">
  initialSpawnPacing?: StreamPhysicsFrameProps["initialSpawnPacing"]
  tooltip?: TooltipProp
  emptyContent?: BaseChartProps["emptyContent"]
  loading?: BaseChartProps["loading"]
  loadingContent?: BaseChartProps["loadingContent"]

  onStateChange?: (state: CrucibleRunState<TDatum>) => void
  onCrucibleObservation?: (observation: CrucibleObservation) => void
  onDiagnostic?: (diagnostic: CrucibleDiagnostic) => void
  onConservation?: (result: CrucibleConservationResult) => void
  onClick?: (
    item:
      | CrucibleRunState<TDatum>["components"][string]
      | CrucibleRunState<TDatum>["products"][string]
  ) => void
}
