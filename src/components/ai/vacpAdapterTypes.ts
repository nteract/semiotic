import type { Datum } from "../charts/shared/datumTypes"
import type { SerializedSelections } from "../export/selectionSerializer"
import type { ChartObservation } from "../store/ObservationStore"
import type { AudienceProfile } from "./audienceProfile"
import type { NavTreeNode } from "./navigationTree"
import type {
  ChartReaderGrounding,
  ChartReaderGroundingOptions,
} from "./readerGrounding"
import type {
  VacpActionDescriptor,
  VacpCapabilitiesRequest,
  VacpCapabilitiesSnapshot,
  VacpEdge,
  VacpNode,
  VacpRef,
  VacpStateRequest,
  VacpStateSnapshot,
  VacpStateUpdate,
  VacpWindowBridge,
} from "./vacpTypes"

export const SEMIOTIC_VACP_SET_POINT_SELECTION_ACTION =
  "semiotic.set_point_selection" as const
export const SEMIOTIC_VACP_SET_INTERVAL_SELECTION_ACTION =
  "semiotic.set_interval_selection" as const
export const SEMIOTIC_VACP_CLEAR_SELECTION_ACTION =
  "semiotic.clear_selection" as const
export const SEMIOTIC_VACP_ACTIVATE_NAVIGATION_ACTION =
  "semiotic.activate_navigation_node" as const
export const SEMIOTIC_VACP_INSPECT_DATA_ACTION =
  "semiotic.inspect_data" as const

export type SemioticVACPSelectionMode = "point" | "interval" | "both"

export interface SemioticVACPSelectionBinding {
  /** Named LinkedCharts selection exposed as one stable VACP Selection node. */
  name: string
  /** Fields an agent may set. Values outside this allowlist are rejected. */
  fields: string[]
  /** Which semantic mutations are valid. Default "both". */
  mode?: SemioticVACPSelectionMode
  /** Stable clause owner used for agent-written selection state. */
  clientId?: string
}

export interface SemioticVACPNavigationBinding {
  tree: NavTreeNode
  /**
   * Durable datum fields used to identify leaves. Procedural NavTreeNode ids
   * are never used as VACP identity.
   */
  matchFields: string[]
  /** Current procedural tree id, when the tree is controlled. */
  activeId?: string
  /** Enables the validated semantic navigation action. */
  onActiveChange?: (node: NavTreeNode) => void
}

export interface SemioticVACPChart {
  /** Durable identity within this bridge; independent of render order. */
  chartId: string
  component: string
  props: Datum
  title?: string
  description?: string
  audience?: AudienceProfile
  grounding?: Omit<ChartReaderGroundingOptions, "audience">
  selections?: SemioticVACPSelectionBinding[]
  navigation?: SemioticVACPNavigationBinding
}

export interface SemioticVACPSelectionActions {
  setPointSelection?: (
    selectionName: string,
    clientId: string,
    fields: Record<string, unknown[]>
  ) => void | Promise<void>
  setIntervalSelection?: (
    selectionName: string,
    clientId: string,
    fields: Record<string, [number, number]>
  ) => void | Promise<void>
  clearSelection?: (selectionName: string) => void | Promise<void>
}

export interface SemioticVACPCustomAction {
  descriptor: VacpActionDescriptor
  available?: () => boolean
  validate?: (params: unknown) => void | string
  execute: (params: unknown) => unknown | Promise<unknown>
}

export interface SemioticVACPDataAccess {
  /** Include bounded `semiotic.inspect_data`. Raw rows are off by default. */
  sample?: boolean
  /** Maximum rows returned from one inspect call. Default 50. */
  maxSampleRows?: number
  /** Maximum rows scanned for schema summaries. Default 5000. */
  maxSchemaRows?: number
}

export interface CreateSemioticVACPBridgeOptions {
  appId: string
  viewId?: string
  title?: string
  /** Static charts or a live getter used on every protocol read/action. */
  charts:
    | readonly SemioticVACPChart[]
    | (() => readonly SemioticVACPChart[])
  /** JSON-safe snapshot of named LinkedCharts selections. */
  getSelections?: () => SerializedSelections
  /** Live observation buffer; the latest event per chart becomes VACP state. */
  getObservations?: () => readonly ChartObservation[]
  selectionActions?: SemioticVACPSelectionActions
  dataAccess?: SemioticVACPDataAccess
  actions?:
    | readonly SemioticVACPCustomAction[]
    | (() => readonly SemioticVACPCustomAction[])
  /** Test/instrumentation clock. */
  now?: () => Date | number | string
  /** Retained full snapshots available as delta baselines. Default 64. */
  stateCacheSize?: number
}

export interface SemioticVACPRefs {
  app: VacpRef
  view: VacpRef
  visualization: (chartId: string) => VacpRef
  config: (chartId: string) => VacpRef
  data: (chartId: string, collection?: string) => VacpRef
  selection: (name: string) => VacpRef
  navigation: (chartId: string) => VacpRef
  observation: (chartId: string) => VacpRef
}

export interface SemioticVACPBridge extends VacpWindowBridge {
  readonly refs: SemioticVACPRefs
  getCapabilities(request?: VacpCapabilitiesRequest): VacpCapabilitiesSnapshot
  getState(): Promise<VacpStateSnapshot>
  getState(request: VacpStateRequest): Promise<VacpStateUpdate>
}

export interface InstallSemioticVACPBridgeOptions {
  /** Default browser `window`; inject a record for tests or non-window hosts. */
  target?: Record<string, unknown>
  /** Default `__vacp`. */
  globalKey?: string
}

export interface SemioticVACPBridgeInstallation {
  installed: boolean
  globalKey: string
  bridge: SemioticVACPBridge
  reason?: string
  /** Delete the global only while this exact bridge still owns it. */
  cleanup: () => boolean
}

export interface DataHandleModel {
  ref: VacpRef
  chartId: string
  collection: string
  rows: readonly unknown[]
}

export interface SelectionModel {
  ref: VacpRef
  name: string
  fields: string[]
  modes: Set<"point" | "interval">
  clientId: string
  chartRefs: VacpRef[]
}

export interface NavigationIndex {
  valid: boolean
  diagnostic?: string
  byKey: Map<string, NavTreeNode>
  matchFields: string[]
  targetRef: (match: Record<string, unknown>) => VacpRef
}

export interface NavigationModel {
  ref: VacpRef
  chartRef: VacpRef
  chartId: string
  binding: SemioticVACPNavigationBinding
  index: NavigationIndex
}

export interface ChartModel {
  chart: SemioticVACPChart
  ref: VacpRef
  configRef: VacpRef
  grounding: ChartReaderGrounding
  config: Record<string, unknown>
  dataHandles: DataHandleModel[]
  navigation?: NavigationModel
}

export interface RuntimeAction {
  descriptor: VacpActionDescriptor
  execute: (params: unknown) => unknown | Promise<unknown>
}

export interface RuntimeModelBase {
  charts: ChartModel[]
  selections: SelectionModel[]
  dataHandles: DataHandleModel[]
  nodes: VacpNode[]
  edges: VacpEdge[]
}

export interface RuntimeModel extends RuntimeModelBase {
  actions: RuntimeAction[]
}
