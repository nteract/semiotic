import type { ProcessSankeyRibbonLane } from "./layoutGeometry"

export interface ProcessSankeyOrderMetrics {
  crossings: number
  weightedLength: number
  pixelLength: number
  transitOcclusion: number
  cost: number
}

export interface ProcessSankeyOrderingResult {
  before: ProcessSankeyOrderMetrics
  after: ProcessSankeyOrderMetrics
  /** Stable slot ids before optimization, used by quality baselines. */
  initialOrder: string[]
  /** Candidate counts make the performance budget testable without timers. */
  evaluations: { fullCrossing: number; localCrossing: number }
}

export interface ProcessSankeyOrderingOptions {
  plotH: number
  padding: number
  valueScale: number
  groupPadding?: number
  laneOrder?: "insertion" | "crossing-min" | "inside-out" | "crossing-min+inside-out"
  ribbonLane?: ProcessSankeyRibbonLane
  domain?: [number, number]
  /** Placement used when scoring pixel/transit cost. */
  lanePlacement?: "stack" | "hug"
  /** Full search or the bounded final-scale geometry refinement. */
  mode?: "full" | "geometry-refine"
}
