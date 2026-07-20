/**
 * GauntletChart public props (HOC surface).
 */
import type { StreamPhysicsFrameProps } from "../../stream/physics/StreamPhysicsFrame"
import type {
  CapacityQueueSnapshot
} from "../../stream/physics/PhysicsControllers"
import type {
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import type { PhysicsProcessBodyGroup } from "./physicsProcessPrimitives"
import type {
  PhysicsHocFrameProps,
  PhysicsRerunMS,
  PhysicsSharedChartProps,
  TooltipProp
} from "./physicsHocUtils"
import type {
  GauntletEvent,
  GauntletGate,
  GauntletLayout,
  GauntletProjectPlacement,
  GauntletProjectState,
  GauntletPropertyDefinition
} from "./gauntletTypes"

export interface GauntletChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "margin">,
    PhysicsSharedChartProps {
  data?: TDatum[]
  size?: [number, number]
  idAccessor?: ChartAccessor<TDatum, string>
  labelAccessor?: ChartAccessor<TDatum, string>
  positiveAccessor?: ChartAccessor<TDatum, readonly string[]>
  negativeAccessor?: ChartAccessor<TDatum, readonly string[]>
  /** Simulation second when each project's local gate timeline begins. */
  startTimeAccessor?: ChartAccessor<TDatum, number>
  metricsAccessor?: ChartAccessor<TDatum, Record<string, number>>
  initialViability?: ChartAccessor<TDatum, number>
  positiveProperties?: readonly GauntletPropertyDefinition[]
  negativeProperties: readonly GauntletPropertyDefinition[]
  bodyGroups?:
    | readonly PhysicsProcessBodyGroup<TDatum>[]
    | ((
        projects: readonly GauntletProjectState<TDatum>[],
        layout: GauntletLayout
      ) => readonly PhysicsProcessBodyGroup<TDatum>[])
  coreBody?: (
    project: GauntletProjectState<TDatum>,
    index: number,
    layout: GauntletLayout,
    placement: Required<GauntletProjectPlacement>
  ) => Partial<PhysicsQueuedSpawn>
  gates?: readonly GauntletGate[]
  events?:
    | readonly GauntletEvent[]
    | ((
        project: GauntletProjectState<TDatum>,
        layout: GauntletLayout
      ) => readonly GauntletEvent[])
  crashOffset?: number
  /** Draw the crash line but optionally disable live crash-line termination. */
  crashDetection?: boolean
  emptyContent?: BaseChartProps["emptyContent"]
  frameProps?: PhysicsHocFrameProps<"bodyForces">
  initialSpawnPacing?: StreamPhysicsFrameProps["initialSpawnPacing"]
  loading?: BaseChartProps["loading"]
  loadingContent?: BaseChartProps["loadingContent"]
  onStateChange?: (states: GauntletProjectState<TDatum>[]) => void
  /** Live snapshots for gates declaring shared FIFO capacity. */
  onCapacityChange?: (snapshots: CapacityQueueSnapshot[]) => void
  outcome?: (
    project: GauntletProjectState<TDatum>,
    context: {
      layout: GauntletLayout
      negativeProperties: Map<string, GauntletPropertyDefinition>
      positiveProperties: Map<string, GauntletPropertyDefinition>
    }
  ) => string
  paused?: boolean
  /**
   * Replay the full compound simulation this many milliseconds after it
   * settles. Omit or pass `null` for a single run; `0` replays on the next
   * timer turn.
   */
  rerunMS?: PhysicsRerunMS
  projectPlacement?: (
    project: GauntletProjectState<TDatum>,
    index: number,
    layout: GauntletLayout
  ) => Partial<GauntletProjectPlacement>
  showChrome?: boolean
  /**
   * Settled-projection strip: project viability bars and outcome labels so the
   * chart remains readable without tracking body motion.
   */
  showProjection?: boolean
  showTethers?: boolean
  /**
   * Core-body vertical force model.
   * - "route": default authored route plus lift/drag burden.
   * - "net": vertical drift follows summed positive vs negative property
   *   weight, leaving the crash line to decide physical failure.
   */
  coreForceMode?: "route" | "net"
  terminalBehavior?: "outcome" | "hold-last"
  tooltip?: TooltipProp
  viability?: (
    project: GauntletProjectState<TDatum>,
    context: {
      negativeProperties: Map<string, GauntletPropertyDefinition>
      positiveProperties: Map<string, GauntletPropertyDefinition>
    }
  ) => number
}
