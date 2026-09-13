import type { PreparedNetworkAtlas, MotifMatch, EvidenceStatus } from "./types"

export type CircuitUnit = "records" | "roots" | "attempts"
export type CircuitMode =
  "observed-snapshot" | "observed-replay" | "modeled-scenario"
export type CircuitModuleKind =
  | "stage"
  | "distributor"
  | "queue"
  | "retry"
  | "join-all"
  | "selector"
  | "dependency"
  | "junction"

export interface CircuitNodeSemantics {
  nodeId: string
  label: string
  unit: CircuitUnit
  routing?: string
  queueDiscipline?: "fifo"
  retryPolicy?: string
  join?: { kind: "all" | "first-success"; memberNodeIds: string[] }
  dependencyNodeIds?: string[]
}

/** Null is unmeasured. A zero is an admitted observation, never a fallback. */
export interface CircuitNodeReading {
  arrivals: number | null
  completions: number | null
  capacity: number | null
  queued: number | null
  status: EvidenceStatus
}

export interface CircuitFlow {
  edgeId: string
  perSecond: number | null
  unit: CircuitUnit
}

export interface CircuitTotals {
  arrivals: number | null
  completions: number | null
  capacity: number | null
  queued: number | null
  roots: number | null
  attempts: number | null
  retries: number | null
  successes: number | null
  errors: number | null
}

/** An aggregate observation event. No individual service times are implied. */
export interface CircuitTapeEntry {
  id: string
  at: number
  nodes: Record<string, CircuitNodeReading>
  flows: CircuitFlow[]
  totals: CircuitTotals
}

export interface CircuitEdition {
  id: string
  synthetic: boolean
  sourceRevision: string
  analysisRevision: string
  kind: "observed" | "modeled"
  label: string
  unit: CircuitUnit
  timing: "aggregate-intervals" | "incomplete"
  individualTimings: "unavailable"
  entries: CircuitTapeEntry[]
  assumptions: string[]
  evidenceRefs: string[]
  model?: {
    id: string
    observedEditionId: string
    assumptions: Record<string, number | string>
    guardrails: {
      label: string
      status: "pass" | "fail" | "unverified"
      detail: string
    }[]
  }
}

export interface CircuitModule {
  id: string
  nodeId: string
  kind: CircuitModuleKind
  semantics: CircuitNodeSemantics
  /** Capsules own their role node; neighbors remain canonical port references. */
  selectedMatchId?: string
  relatedMatchIds: string[]
  roles: MotifMatch["roles"]
  ports: { edgeId: string; direction: "in" | "out"; endpointId: string }[]
}

export interface FlowCircuitProjection {
  atlas: PreparedNetworkAtlas
  overlapPolicy: "role-priority:id-asc"
  modules: CircuitModule[]
  matches: MotifMatch[]
  order: string[]
  backboneEdgeIds: string[]
  residualEdgeIds: string[]
}

export interface CircuitSelection {
  analysisRevision: string
  nodeId: string
  relationScopeId: "directed-admitted"
}

export interface CircuitReading {
  editionId: string
  kind: CircuitEdition["kind"]
  mode: CircuitMode
  requestedTime: number
  observedAt: number
  entry: CircuitTapeEntry
  status: "exact" | "incomplete"
}

export interface CircuitBox {
  x: number
  y: number
  width: number
  height: number
}

export interface CircuitModuleRegion extends CircuitBox {
  module: CircuitModule
  queue: CircuitBox
  sensor: CircuitBox
}

export interface CircuitRoute {
  edgeId: string
  source: string
  target: string
  residual: boolean
  points: { x: number; y: number }[]
  pathD: string
}

export interface CircuitGeometry {
  width: number
  height: number
  sections: { id: string; x: number }[]
  modules: CircuitModuleRegion[]
  routes: CircuitRoute[]
  history: CircuitBox
}
