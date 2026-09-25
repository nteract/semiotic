/**
 * The shared fixed-step loop behind live ticks and both of
 * `PhysicsPipelineStore`'s settle entry points.
 *
 * Each step advances simulated time and admits due arrivals. An observed run
 * can also execute authored behavior at that boundary. The step limit bounds
 * the work; reaching it does not prove that every arrival or process completed.
 * Both entry points use this loop so pacing cannot drift between them.
 */
import type { PhysicsBodyBudgetDecision } from "./PhysicsBodyBudget"
import type { PhysicsKernelEvent } from "./PhysicsKernel"
import type { PhysicsPipelineEvictionResult } from "./physicsPipelineHelpers"
import type {
  PhysicsObservationEvent,
  PhysicsPipelineExecution,
  PhysicsPipelineTickResult
} from "./PhysicsPipelineTypes"

/**
 * The slice of store behavior the loop drives. Passed explicitly (rather than
 * reaching into the store) so the loop stays independently testable.
 */
export interface PhysicsSettleHost {
  fixedDt: number
  queueSize: () => number
  atRest: () => boolean
  elapsed: () => number
  nextArrival: () => number | undefined
  lastArrival: () => number | undefined
  /** Advance simulated time; this is what makes time-driven consumers progress. */
  advanceTime: (seconds: number) => void
  spawnDue: (
    spawned: string[],
    observations?: PhysicsObservationEvent[]
  ) => void
  observeBodyBudget: (
    observations?: PhysicsObservationEvent[]
  ) => PhysicsBodyBudgetDecision
  evictOverflow: (
    observations?: PhysicsObservationEvent[]
  ) => PhysicsPipelineEvictionResult
  step: (deltaSeconds: number) => void
  /** Drain buffered kernel events for this step. */
  drainEvents: () => PhysicsKernelEvent[]
  observeKernelEvents: (
    events: PhysicsKernelEvent[],
    observations?: PhysicsObservationEvent[]
  ) => void
  observeSensorTransitions: (observations?: PhysicsObservationEvent[]) => void
  refreshQuiescence: (deltaSeconds: number, spawnedCount: number) => void
}

/**
 * Collectors for the run. Only `spawned` is required — the cheap `settle()` path
 * discards the rest, while `settleWithObservations()` collects everything.
 * Omitting `events` also suppresses observation of kernel/sensor transitions.
 */
export interface PhysicsSettleSink {
  spawned: string[]
  evicted?: string[]
  sedimented?: string[]
  events?: PhysicsKernelEvent[]
  observations?: PhysicsObservationEvent[]
}

export interface PhysicsSettleRun {
  steps: number
  budget?: PhysicsBodyBudgetDecision
}

/** Deliver each admission/event exactly once, while retaining the aggregate
 * result for the caller of tick or settleWithObservations. */
export function createPhysicsStepObserver(
  execution: PhysicsPipelineExecution | undefined,
  readResult: (steps: number) => PhysicsPipelineTickResult,
  observeInitial = false
): (() => void) | undefined {
  if (!execution) return undefined
  const keys = [
    "spawned",
    "evicted",
    "sedimented",
    "events",
    "observations"
  ] as const
  const cursors = {
    spawned: 0,
    evicted: 0,
    sedimented: 0,
    events: 0,
    observations: 0
  }
  const observe = (steps: number) => {
    const aggregate = readResult(steps)
    const result: PhysicsPipelineTickResult = {
      ...aggregate,
      spawned: aggregate.spawned.slice(cursors.spawned),
      evicted: aggregate.evicted.slice(cursors.evicted),
      sedimented: aggregate.sedimented.slice(cursors.sedimented),
      events: aggregate.events.slice(cursors.events),
      observations: aggregate.observations.slice(cursors.observations)
    }
    for (const key of keys) cursors[key] = aggregate[key].length
    // A display-frame boundary is not another model step. Still deliver
    // admissions and transitions at t=0, but do not rerun controllers on an
    // empty boundary: otherwise RAF batching changes process outcomes.
    if (steps === 0 && !observeInitial && keys.every((key) => result[key].length === 0)) {
      return
    }
    execution.onStep(result)
  }
  observe(0)
  return () => observe(1)
}

export function runPhysicsSettleSteps(
  host: PhysicsSettleHost,
  maxSteps: number,
  sink: PhysicsSettleSink,
  options: {
    stopAtRest?: boolean
    shouldStop?: () => boolean
    continueWhile?: () => boolean
    afterStep?: () => void
    /** Include the queued arrival horizon before spending the settling margin. */
    drainArrivals?: boolean
    /** Skip at-rest intervals only when no authored step callback is active. */
    skipIdle?: boolean
  } = {}
): PhysicsSettleRun {
  let steps = 0
  let skippedSteps = 0
  let budget: PhysicsBodyBudgetDecision | undefined
  const arrivalSteps = options.drainArrivals ? Math.max(0, Math.ceil(
    ((host.lastArrival() ?? host.elapsed()) - host.elapsed()) / host.fixedDt
  )) : 0
  const stepLimit = maxSteps + arrivalSteps

  while (
    steps + skippedSteps < stepLimit &&
    !options.shouldStop?.() &&
    (options.stopAtRest === false ||
      host.queueSize() > 0 ||
      !host.atRest() ||
      options.continueWhile?.())
  ) {
    const nextArrival = host.nextArrival()
    const idleSteps = options.skipIdle && nextArrival != null && host.atRest()
      ? Math.min(
          Math.max(0, Math.floor((nextArrival - host.elapsed()) / host.fixedDt) - 1),
          Math.max(0, stepLimit - steps - skippedSteps - 1)
        )
      : 0
    if (idleSteps > 0) {
      host.advanceTime(idleSteps * host.fixedDt)
      skippedSteps += idleSteps
    }
    // Integrate [t, t + dt] before admitting arrivals at its end. A body born
    // at t + dt must never receive the motion from the interval before birth.
    host.step(host.fixedDt)
    host.advanceTime(host.fixedDt)

    const stepEvents = host.drainEvents()
    if (sink.events) {
      sink.events.push(...stepEvents)
      host.observeKernelEvents(stepEvents, sink.observations)
      host.observeSensorTransitions(sink.observations)
    }

    const stepSpawned: string[] = []
    host.spawnDue(stepSpawned, sink.observations)
    if (stepSpawned.length > 0) {
      sink.spawned.push(...stepSpawned)
      // Honor the body budget as bodies arrive, exactly as `tick` does, so a
      // bounded stream can't blow past `bodyLimit` during a settle.
      budget = host.observeBodyBudget(sink.observations)
      const overflow = host.evictOverflow(sink.observations)
      sink.evicted?.push(...overflow.evicted)
      sink.sedimented?.push(...overflow.sedimented)
    }

    steps += 1
    // Break early on sustained quiescence so a bounded settle doesn't spin to
    // the step limit on stragglers that never formally sleep. A fresh arrival
    // resets the timer, so a paced stream is never mistaken for at-rest.
    host.refreshQuiescence(host.fixedDt, stepSpawned.length)
    // Controllers see transitions before the next integration step, regardless
    // of how many steps the display frame or bounded settle requested.
    options.afterStep?.()
  }

  return { steps, budget }
}
