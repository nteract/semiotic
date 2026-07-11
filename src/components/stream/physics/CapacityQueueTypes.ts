import type {
  PhysicsBodyState,
  PhysicsColliderBodyFilter
} from "./PhysicsKernel"
import type { StreamPhysicsRegionVector } from "./StreamPhysicsFrame"

/** Current age distribution for visits admitted to a capacity queue. */
export interface CapacityQueueAgeSummary {
  count: number
  meanSeconds: number
  p50Seconds: number
  p95Seconds: number
  oldestSeconds: number
}

/** Rolling simulated-time service evidence. */
export interface CapacityQueueWindowSnapshot {
  seconds: number
  arrivals: number
  arrivalWork: number
  completions: number
  completedWork: number
  processedWork: number
  arrivalsPerSecond: number
  throughputPerSecond: number
  /** Service work consumed / available work capacity, clamped to 0-1. */
  utilization: number
  /** Incoming work rate / service rate. Values above 1 indicate overload. */
  pressure: number
}

/** Live capacity queue metrics for projection, evidence, and UI. */
export interface CapacityQueueSnapshot {
  regionId: string
  queueDepth: number
  processedCount: number
  unitsPerSecond: number
  /** Remaining work units currently in the admitted queue. */
  remainingWork: number
  meanRemainingWork: number
  /** Current admitted + blocked work still waiting for service. */
  waitingWork: number
  blockedDepth: number
  blockedWork: number
  /** Unique physical entries observed, including entries initially blocked. */
  arrivalCount: number
  admittedCount: number
  admittedWork: number
  /** Cumulative service work consumed, including partially processed jobs. */
  processedWork: number
  completedWork: number
  blockedCount: number
  abandonedCount: number
  abandonedWork: number
  peakQueueDepth: number
  peakRemainingWork: number
  queueAge: CapacityQueueAgeSummary
  meanCompletedQueueSeconds: number
  window: CapacityQueueWindowSnapshot
  /** Latest simulated clock observed by the controller. */
  simulatedAt: number
  /** Coarse reporting bucket suitable for React equality checks. */
  metricRevision: number
}

export interface CapacityQueueVisitInfo {
  bodyId: string
  jobId: string
  visitId: string
  visit: number
  regionId: string
  work: number
  queuedAt: number
}

export interface CapacityQueueProcessedInfo extends CapacityQueueVisitInfo {
  completedAt: number
  queueSeconds: number
}

export interface CapacityQueueBlockedInfo extends CapacityQueueVisitInfo {
  blockedAt: number
}

export interface CapacityQueueAbandonedInfo extends CapacityQueueVisitInfo {
  abandonedAt: number
  remainingWork: number
  queueSeconds: number
}

export interface CapacityQueueControllerOptions {
  id?: string
  /** Must match a StreamPhysicsRegionEffect id (sensor region). */
  regionId: string
  /** Work units processed per second while the queue is non-empty. */
  unitsPerSecond: number
  /** Only matching bodies may enter the queue. Uses collider body-filter semantics. */
  bodyFilter?: PhysicsColliderBodyFilter
  /** String form reads `body.datum[field]`; defaults to work/reviewWork/value. */
  unitAccessor?: string | ((body: PhysicsBodyState) => number)
  /**
   * Semantic job identity. String form reads `body.datum[field]`; defaults to
   * body id. Multiple matching bodies with the same key consume one visit.
   */
  jobKey?:
    string | ((body: PhysicsBodyState) => string | number | null | undefined)
  /** Impulse applied when a body finishes processing (default forward release). */
  releaseImpulse?: StreamPhysicsRegionVector
  onProcessed?: (
    body: PhysicsBodyState,
    info: CapacityQueueProcessedInfo
  ) => void
  onQueued?: (body: PhysicsBodyState, info: CapacityQueueVisitInfo) => void
  onBlocked?: (body: PhysicsBodyState, info: CapacityQueueBlockedInfo) => void
  onAbandoned?: (
    body: PhysicsBodyState,
    info: CapacityQueueAbandonedInfo
  ) => void
  queueLayout?: "lane" | "none"
  queueSlotSpacing?: number
  queueStiffness?: number
  /** Max admitted visits; overflow is measured while it waits outside. */
  maxQueue?: number
  /** Rolling simulated-time window for throughput/utilization (default 30s). */
  metricWindowSeconds?: number
  /** Coarse snapshot cadence used by HOC callbacks (default 0.25s). */
  snapshotIntervalSeconds?: number
  continuous?: boolean
}

export interface CapacityQueueEntry {
  bodyId: string
  jobId: string
  visitId: string
  visit: number
  remaining: number
  total: number
  queuedAt: number
  sequence: number
}

export interface CapacityBlockedEntry extends CapacityQueueVisitInfo {
  blockedAt: number
  sequence: number
}

export interface CapacityMetricSlice {
  start: number
  end: number
  arrivals: number
  arrivalWork: number
  completions: number
  completedWork: number
  processedWork: number
}
