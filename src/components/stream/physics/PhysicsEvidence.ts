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

/**
 * Where every charged body ended up.
 *
 * Physics charts all share one deep structure — a charge enters, an apparatus
 * routes it, and it comes to rest in destinations — so they all owe the same
 * invariant: every body that entered is accounted for in exactly one place.
 * That invariant is this family's "bars start at zero": it is what makes a
 * settled projection an auditable reading rather than a claim about a movie.
 *
 * Supply `charge` (the total the chart says entered) and the evidence reports
 * whether the world can still account for it.
 */
export interface PhysicsSettledLedger {
  /** Total the chart claims entered the apparatus. */
  charge: number
  /** Bodies live in the world when it came to rest. */
  live: number
  /** Bodies the queue still owes and never admitted. */
  queued: number
  /** Bodies retired into sediment by the body budget. */
  sedimented: number
  /** `charge - (live + queued + sedimented)`. Non-zero means bodies vanished. */
  unaccounted: number
  balanced: boolean
}

export interface PhysicsSettledEvidence {
  bodyCount: number
  sleepingCount: number
  settled: boolean
  stepsRun: number
  seed: number
  binCounts: PhysicsEvidenceBinCount[]
  /** Spawns still owed by the queue. Non-zero in a settled scene is a defect. */
  queuedCount: number
  /** Bodies the body budget retired into sediment. */
  sedimentedCount: number
  ledger?: PhysicsSettledLedger
  warnings: string[]
}

export interface PhysicsSettledEvidenceOptions {
  bodies?: PhysicsBodyState[]
  projectionRows?: PhysicsSettledProjectionRow[]
  stepsRun?: number
  /**
   * Total bodies the chart claims entered the apparatus. Pass it when the chart
   * knows its own charge (a unitized total, a row count) to enable the ledger
   * check. Omit it and the ledger is simply absent — never guessed.
   */
  charge?: number
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

function buildLedger(
  charge: number,
  live: number,
  queued: number,
  sedimented: number
): PhysicsSettledLedger {
  const unaccounted = charge - (live + queued + sedimented)
  return {
    charge,
    live,
    queued,
    sedimented,
    unaccounted,
    balanced: unaccounted === 0
  }
}

export function buildPhysicsSettledEvidence(
  snapshot: PhysicsPipelineSnapshot,
  options: PhysicsSettledEvidenceOptions = {}
): PhysicsSettledEvidence {
  const bodies = options.bodies ?? snapshotBodies(snapshot)
  const sleepingCount = bodies.filter((body) => body.sleeping).length
  const queuedCount = snapshot.queue.length
  const sedimentedCount = snapshot.sediment.reduce(
    (sum, bin) => sum + bin.count,
    0
  )
  const settled =
    snapshot.simulationState === "settled" &&
    queuedCount === 0 &&
    sleepingCount === bodies.length

  const warnings: string[] = []
  // An undrained queue in a scene presented as settled is unambiguous: the
  // apparatus never received bodies the chart already counted in its
  // projection, so the drawn marks and the stated numbers disagree.
  if (queuedCount > 0) warnings.push("PHYSICS_QUEUE_UNDRAINED")

  const ledger =
    options.charge != null && Number.isFinite(options.charge)
      ? buildLedger(options.charge, bodies.length, queuedCount, sedimentedCount)
      : undefined
  if (ledger && !ledger.balanced) warnings.push("PHYSICS_LEDGER_MISMATCH")

  return {
    bodyCount: bodies.length,
    sleepingCount,
    settled,
    stepsRun: Math.max(0, Math.floor(options.stepsRun ?? 0)),
    seed: snapshot.world.options.seed,
    binCounts: projectionBinCounts(options.projectionRows),
    queuedCount,
    sedimentedCount,
    ...(ledger ? { ledger } : {}),
    warnings
  }
}
