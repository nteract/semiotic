import type { PhysicsSettledProjectionRow } from "./PhysicsAccessibility"
import type { PhysicsBodyState } from "./PhysicsKernel"
import type { PhysicsPipelineSnapshot } from "./PhysicsPipelineStore"

export interface PhysicsEvidenceBinCount {
  id: string
  label: string
  count: number
  secondary?: number
  secondaryLabel?: string
  observed?: number
}

export interface PhysicsSettledEvidence {
  bodyCount: number
  sleepingCount: number
  settled: boolean
  stepsRun: number
  seed: number
  binCounts: PhysicsEvidenceBinCount[]
}

export interface PhysicsSettledEvidenceOptions {
  bodies?: PhysicsBodyState[]
  projectionRows?: PhysicsSettledProjectionRow[]
  stepsRun?: number
}

function snapshotBodies(snapshot: PhysicsPipelineSnapshot): PhysicsBodyState[] {
  return snapshot.world.bodies.map((body) => ({
    id: body.id,
    x: body.x,
    y: body.y,
    prevX: body.prevX,
    prevY: body.prevY,
    vx: body.vx,
    vy: body.vy,
    angle: body.angle,
    mass: body.mass,
    shape: { ...body.shape },
    sleeping: body.sleeping,
    datum: body.datum
  }))
}

function projectionBinCounts(
  rows: PhysicsSettledProjectionRow[] = []
): PhysicsEvidenceBinCount[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    count: row.count,
    ...(row.secondary != null ? { secondary: row.secondary } : {}),
    ...(row.secondaryLabel ? { secondaryLabel: row.secondaryLabel } : {}),
    ...(row.observed != null ? { observed: row.observed } : {})
  }))
}

export function buildPhysicsSettledEvidence(
  snapshot: PhysicsPipelineSnapshot,
  options: PhysicsSettledEvidenceOptions = {}
): PhysicsSettledEvidence {
  const bodies = options.bodies ?? snapshotBodies(snapshot)
  const sleepingCount = bodies.filter((body) => body.sleeping).length
  return {
    bodyCount: bodies.length,
    sleepingCount,
    settled:
      snapshot.simulationState === "settled" &&
      snapshot.queue.length === 0 &&
      sleepingCount === bodies.length,
    stepsRun: Math.max(0, Math.floor(options.stepsRun ?? 0)),
    seed: snapshot.world.options.seed,
    binCounts: projectionBinCounts(options.projectionRows)
  }
}
