/**
 * Structural VACP 0.1.0 types.
 *
 * VACP's protocol packages are not currently published, so the experimental
 * Semiotic bridge depends only on the documented JSON contract. Keep this file
 * structural and dependency-free so a consumer can replace these types with
 * the canonical package once it becomes public.
 *
 * @see https://github.com/ETH-IVIA-Lab/VACP/blob/main/docs/reference/tool-contract.md
 */

export const VACP_SCHEMA_VERSION = "0.1.0" as const

export type VacpSchemaVersion = typeof VACP_SCHEMA_VERSION
export type VacpRef = `vacp://${string}`

export type VacpLayer =
  | "ConfigLayer"
  | "ViewLayer"
  | "VisualizationLayer"
  | "DataLayer"
  | "InteractionFeedbackLayer"

export type VacpNodeKind =
  | "App"
  | "View"
  | "Visualization"
  | "Mark"
  | "EncodingChannel"
  | "EncodedField"
  | "Legend"
  | "Axis"
  | "Selection"
  | "Param"
  | "Widget"
  | "DataHandle"
  | "InteractionTarget"

export type VacpEdgeKind =
  | "contains"
  | "controls"
  | "derivedFrom"
  | "targets"

export interface VacpNode {
  ref: VacpRef
  kind: VacpNodeKind
  layer: VacpLayer
  title?: string
  description?: string
  data?: Record<string, unknown>
}

export interface VacpEdge {
  from: VacpRef
  to: VacpRef
  kind: VacpEdgeKind
}

export interface VacpActionDescriptor {
  name: string
  title?: string
  description: string
  parameters?: Record<string, unknown>
  targetRef?: VacpRef
}

export interface VacpGraph {
  version: VacpSchemaVersion
  nodes: VacpNode[]
  edges: VacpEdge[]
  actions: VacpActionDescriptor[]
}

export interface VacpCapabilitiesSnapshot {
  version: VacpSchemaVersion
  createdAt: string
  graph: VacpGraph
}

export interface VacpCapabilitiesRequest {
  refs?: VacpRef[]
  prefixes?: VacpRef[]
  kinds?: VacpNodeKind[]
  layers?: VacpLayer[]
  includeActions?: boolean
  includeEdges?: boolean
  includeNodeData?: boolean
}

export interface VacpStateSnapshot {
  version: VacpSchemaVersion
  createdAt: string
  state: Record<VacpRef, unknown>
  summary?: Record<VacpRef, unknown>
}

export type VacpStateRequestMode = "auto" | "full" | "delta"

export interface VacpStateRequest {
  mode?: VacpStateRequestMode
  since?: string
  refs?: VacpRef[]
  includeSummary?: boolean
}

export interface VacpStateDeltaPayload {
  changed: Record<VacpRef, unknown>
  removed: VacpRef[]
  summaryChanged?: Record<VacpRef, unknown>
  summaryRemoved?: VacpRef[]
}

export type VacpStateUpdate =
  | {
      version: VacpSchemaVersion
      createdAt: string
      mode: "full"
      token: string
      scope?: { refs?: VacpRef[] }
      snapshot: VacpStateSnapshot
    }
  | {
      version: VacpSchemaVersion
      createdAt: string
      mode: "delta"
      token: string
      baseToken: string
      scope?: { refs?: VacpRef[] }
      delta: VacpStateDeltaPayload
    }

export interface VacpActionCall {
  callId: string
  name: string
  params?: unknown
}

export type VacpActionResult =
  | { callId: string; ok: true; result?: unknown }
  | {
      callId: string
      ok: false
      error: { message: string; details?: unknown }
    }

export interface VacpWindowBridge {
  version: VacpSchemaVersion
  getCapabilities(
    request?: VacpCapabilitiesRequest
  ): Promise<VacpCapabilitiesSnapshot> | VacpCapabilitiesSnapshot
  getState(): Promise<VacpStateSnapshot>
  getState(request: VacpStateRequest): Promise<VacpStateUpdate>
  execute(call: VacpActionCall): Promise<VacpActionResult>
}

export const VACP_DATA_SCHEMA_ACTION = "vacp.data_schema" as const

export type VacpDataSchemaDetail = "columns" | "full"

export interface VacpDataSchemaParams {
  handleRef: VacpRef
  detail?: VacpDataSchemaDetail
  sampleRows?: number
}

export interface VacpDataSchemaColumn {
  name: string
  type: string
  notNull?: boolean
  primaryKey?: boolean
}

export interface VacpDataSchemaNumericSummary {
  min: number | null
  max: number | null
  avg: number | null
  unitHint?: "epoch_ms" | "epoch_s" | null
  minIso?: string | null
  maxIso?: string | null
}

export interface VacpDataSchemaTemporalSummary {
  minIso: string | null
  maxIso: string | null
  minEpochMs: number | null
  maxEpochMs: number | null
}

export interface VacpDataSchemaResult {
  handleRef: VacpRef
  detail: VacpDataSchemaDetail
  table: string | null
  rowCount: number | null
  columns: VacpDataSchemaColumn[]
  numeric?: Record<string, VacpDataSchemaNumericSummary>
  temporal?: Record<string, VacpDataSchemaTemporalSummary>
  categoricalTopValues?: Record<
    string,
    Array<{ value: string; n: number }>
  >
  sampledRows?: number | null
}
