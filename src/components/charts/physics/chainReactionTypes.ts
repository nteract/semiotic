import type { Datum } from "../shared/datumTypes"
import type {
  BlockerAmplification,
  DependencyAccessor,
  DependencyTaskStatus
} from "./dependencyMachine"

export type ChainReactionMode = "snapshot" | "replay" | "mechanical"
export type ChainReactionInsight = "none" | "blocker-amplification"
export type ChainReactionControl = "play" | "pause" | "step" | "reset" | "settle"

export type ChainReactionObservation<TDatum extends Datum = Datum> =
  | { type: "task-completed"; taskID: string; datum: TDatum }
  | { type: "dependency-delivered"; sourceID: string; targetID: string }
  | { type: "task-armed"; taskID: string }
  | {
      type: "machine-stalled"
      blockerID: string
      downstreamTaskCount: number
      affectedLaneCount: number
    }
  | { type: "blocker-previewed"; blockerID: string; downstreamTaskIDs: string[] }
  | { type: "machine-settled" }

export interface ChainReactionTaskState {
  taskID: string
  completed: boolean
  armed: boolean
  blocked: boolean
  blockerReason?: string
}

export interface ChainReactionDependencyState {
  edgeID: string
  sourceID: string
  targetID: string
  state: "waiting" | "in-flight" | "delivered"
}

export interface ChainReactionMachineState {
  currentTime: number
  playing: boolean
  previewTaskID: string | null
  selectedTaskIDs: string[]
  tasks: ChainReactionTaskState[]
  dependencies: ChainReactionDependencyState[]
}

export interface ChainReactionChartHandle {
  play: () => void
  pause: () => void
  step: () => void
  reset: () => void
  settle: () => void
  previewResolve: (taskID: string) => void
  clearPreview: () => void
  completeTask: (taskID: string) => void
  blockTask: (taskID: string, reason: string) => void
  unblockTask: (taskID: string) => void
  getAmplification: (taskID: string) => BlockerAmplification
  getMachineState: () => ChainReactionMachineState
}

export interface ChainReactionChartProps<TDatum extends Datum = Datum> {
  data: readonly TDatum[]
  taskIDAccessor: DependencyAccessor<TDatum, string | number>
  labelAccessor: DependencyAccessor<TDatum, string>
  laneAccessor: DependencyAccessor<TDatum, string>
  dependencyAccessor: DependencyAccessor<TDatum, readonly (string | number)[]>
  startAccessor?: DependencyAccessor<TDatum, number | Date | undefined>
  endAccessor?: DependencyAccessor<TDatum, number | Date | undefined>
  progressAccessor?: DependencyAccessor<TDatum, number | undefined>
  statusAccessor?: DependencyAccessor<TDatum, DependencyTaskStatus | undefined>
  completionTimeAccessor?: DependencyAccessor<TDatum, number | Date | undefined>
  blockerAccessor?: DependencyAccessor<TDatum, string | undefined>
  milestoneAccessor?: DependencyAccessor<TDatum, boolean | undefined>
  mechanism?: "domino-ball"
  orientation?: "vertical"
  mode?: ChainReactionMode
  insight?: ChainReactionInsight
  currentTime?: number | Date
  controls?: boolean | readonly ChainReactionControl[]
  selectedTaskIDs?: readonly string[]
  onSelectionChange?: (ids: string[]) => void
  onObservation?: (event: ChainReactionObservation<TDatum>) => void
  reducedMotion?: "settle"
  seed?: number
  width?: number
  height?: number
  responsiveWidth?: boolean
  responsiveHeight?: boolean
  title?: string
  description?: string
  className?: string
  accessibleTable?: boolean
  enableHover?: boolean
}
