/**
 * The shared "run this simulation to completion" loop behind both of
 * `PhysicsPipelineStore`'s settle entry points.
 *
 * Settling has to mean *the simulation reached its end state*, and that includes
 * admitting every arrival the queue still owes. Advancing simulated time per
 * step and re-checking due spawns inside the loop is what lets paced spawns
 * (`initialSpawnPacing`, per-datum `spawnAt`) and elapsed-time event tapes
 * finish on the reduced-motion / snapshot path instead of freezing at the first
 * spawn instant. Both entry points run this one loop so they cannot drift apart.
 */
import type { PhysicsBodyBudgetDecision } from "./PhysicsBodyBudget"
import type { PhysicsKernelEvent } from "./PhysicsKernel"
import type { PhysicsPipelineEvictionResult } from "./physicsPipelineHelpers"
import type { PhysicsObservationEvent } from "./PhysicsPipelineTypes"

/**
 * The slice of store behavior the loop drives. Passed explicitly (rather than
 * reaching into the store) so the loop stays independently testable.
 */
export interface PhysicsSettleHost {
  fixedDt: number
  queueSize: () => number
  atRest: () => boolean
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
  observeSensorTransitions: (
    observations?: PhysicsObservationEvent[]
  ) => void
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

export function runPhysicsSettleSteps(
  host: PhysicsSettleHost,
  maxSteps: number,
  sink: PhysicsSettleSink
): PhysicsSettleRun {
  let steps = 0
  let budget: PhysicsBodyBudgetDecision | undefined

  while (steps < maxSteps && (host.queueSize() > 0 || !host.atRest())) {
    host.advanceTime(host.fixedDt)

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

    host.step(host.fixedDt)
    // Drain kernel events every step whether or not this caller observes them,
    // matching `tick` so nothing accumulates into a later frame.
    const stepEvents = host.drainEvents()
    if (sink.events) {
      sink.events.push(...stepEvents)
      host.observeKernelEvents(stepEvents, sink.observations)
      host.observeSensorTransitions(sink.observations)
    }

    steps += 1
    // Break early on sustained quiescence so a bounded settle doesn't spin to
    // the step limit on stragglers that never formally sleep. A fresh arrival
    // resets the timer, so a paced stream is never mistaken for at-rest.
    host.refreshQuiescence(host.fixedDt, stepSpawned.length)
  }

  return { steps, budget }
}
