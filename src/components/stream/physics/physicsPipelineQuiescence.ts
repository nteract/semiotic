import type {
  PhysicsBodyState,
  PhysicsKernelOptions
} from "./PhysicsKernel"
import type { PhysicsEngineAdapter } from "./PhysicsEngineAdapter"

/**
 * Speed (px/s) below which a still-awake body counts as quiescent. Matches the
 * kernel's default `sleepSpeed`; overridden per-store from `kernel.sleepSpeed`.
 */
const DEFAULT_QUIESCENT_SPEED = 8

/**
 * How long (seconds of simulated time) the whole system must stay below the
 * quiescent speed before it is treated as "at rest" even if some bodies never
 * formally sleep. Two bodies leaning on each other (neither counts as the
 * other's support) or a tethered body held in force equilibrium can sit still
 * forever without sleeping; without this fallback `allSleeping()` is never
 * true, so the sim never reports "settled" and `rerunMS` never re-arms.
 */
const QUIESCENT_AFTER_SECONDS = 0.6

function quiescentSpeedFromKernel(
  kernel: PhysicsKernelOptions | undefined
): number {
  const sleepSpeed = kernel?.sleepSpeed
  return typeof sleepSpeed === "number" && Number.isFinite(sleepSpeed) && sleepSpeed > 0
    ? sleepSpeed
    : DEFAULT_QUIESCENT_SPEED
}

/**
 * Tracks sustained-quiescence as an "at rest" fallback for bodies that never
 * formally sleep (see {@link QUIESCENT_AFTER_SECONDS}).
 */
export class PhysicsQuiescenceTracker {
  private seconds = 0
  private speed = DEFAULT_QUIESCENT_SPEED
  private scratch: PhysicsBodyState[] = []

  setKernelOptions(kernel: PhysicsKernelOptions | undefined): void {
    this.speed = quiescentSpeedFromKernel(kernel)
  }

  reset(): void {
    this.seconds = 0
  }

  isAtRest(): boolean {
    return this.seconds >= QUIESCENT_AFTER_SECONDS
  }

  /**
   * Advance (or reset) the sustained-quiescence timer from the bodies' current
   * speeds. A fresh spawn or any body moving faster than the quiescent speed
   * resets it; otherwise it accrues the simulated delta.
   */
  refresh(
    world: PhysicsEngineAdapter,
    deltaSeconds: number,
    spawnedCount: number
  ): void {
    if (spawnedCount > 0) {
      this.seconds = 0
      return
    }
    const bodies = world.readState(this.scratch)
    const thresholdSq = this.speed * this.speed
    let quiescent = true
    for (const body of bodies) {
      if (body.sleeping) continue
      if (body.vx * body.vx + body.vy * body.vy >= thresholdSq) {
        quiescent = false
        break
      }
    }
    this.seconds = quiescent ? this.seconds + Math.max(0, deltaSeconds) : 0
  }
}
