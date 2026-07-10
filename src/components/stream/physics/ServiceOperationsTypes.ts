import type { PhysicsBodyState, PhysicsColliderBodyFilter } from "./PhysicsKernel"
import type { StreamPhysicsRegionVector } from "./StreamPhysicsFrame"

export type ServiceLevelCaseState =
  | "waiting"
  | "protected"
  | "unhappy"
  | "resolved"
  | "resolved-unhappy"

export interface ServiceResourceDefinition {
  id: string
  /** Defaults to `id`; use this when the visual body has a different id. */
  bodyId?: string
  /** Resting point used while the resource is unassigned. */
  home: { x: number; y: number }
}

export interface ServiceResourceAssignment {
  resourceId: string
  resourceBodyId: string
  caseBodyId: string
  assignedAt: number
}

export interface ServiceResourcePoolSnapshot {
  total: number
  available: number
  assigned: number
  assignments: ServiceResourceAssignment[]
  simulatedAt: number
  metricRevision: number
}

export interface ServiceResourcePoolOptions {
  id?: string
  resources: readonly ServiceResourceDefinition[]
  /** Pulls an assigned resource toward its case (default 0.45). */
  assignmentForce?: number
  /** Place an assigned resource ahead of its case to express directional service. */
  assignmentOffset?: StreamPhysicsRegionVector
  /** Returns an idle resource to its home point (default 0.35). */
  returnForce?: number
  /** Small reciprocal force that makes an assignment readable as a tether. */
  caseAttraction?: number
}

export interface ServiceLevelCaseInfo {
  bodyId: string
  openedAt: number
  deadlineAt: number
  state: ServiceLevelCaseState
  completedAt?: number
  protectedAt?: number
}

export interface ServiceLevelSnapshot {
  total: number
  waiting: number
  protected: number
  unhappy: number
  resolved: number
  resolvedUnhappy: number
  simulatedAt: number
  metricRevision: number
}

export interface ServiceLevelControllerOptions {
  id?: string
  /** Only matching bodies become service cases. */
  bodyFilter?: PhysicsColliderBodyFilter
  /** String form reads `body.datum[field]`; values are simulated seconds. */
  deadlineAccessor:
    | string
    | ((body: PhysicsBodyState) => number | null | undefined)
  /** Entering this region marks a case complete. Completion may also be explicit. */
  completionRegionId?: string
  onStateChange?: (caseInfo: ServiceLevelCaseInfo) => void
}

export interface DependencyGateSnapshot {
  regionId: string
  isOpen: boolean
  blocked: number
  released: number
  simulatedAt: number
  metricRevision: number
}

export interface DependencyGateOptions {
  id?: string
  regionId: string
  bodyFilter?: PhysicsColliderBodyFilter
  /** Defaults to closed until `opensAt`; provide `isOpen` for live external state. */
  opensAt?: number
  isOpen?: (simulatedAt: number) => boolean
  /** Pull strength toward the closed gate's center (default 0.4). */
  holdForce?: number
  /** Applied once to every held body as the gate opens. */
  releaseImpulse?: StreamPhysicsRegionVector
  onHeld?: (body: PhysicsBodyState) => void
  onReleased?: (body: PhysicsBodyState) => void
}
