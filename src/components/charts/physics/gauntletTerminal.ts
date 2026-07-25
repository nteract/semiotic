/**
 * Gauntlet terminal state — the end of the authored tape, computed without
 * running the simulation.
 *
 * ## Why this exists
 *
 * Every event-tape physics chart owes the same contract: **its end state must be
 * computable from the authored inputs alone.** If the outcome only exists as the
 * residue of a simulation, then reduced motion, SSR, snapshot export, and
 * `describeChart` cannot state it, and the chart is a movie rather than a
 * reading. `CrucibleChart` satisfies this by compiling `terminalState` /
 * `terminalSpawns`; `ChainReactionChart` satisfies it by deriving task state from
 * the data at `currentTime`. Gauntlet had no such function — this is it.
 *
 * The fold below mirrors the live `runGauntletTick` state path exactly (same
 * `applyGauntletEffect` / `recordGauntletEvent` / viability / final-outcome
 * order), so the pure answer and the simulated answer agree. Terminal means the
 * tape has fully run: every authored event is due, including capacity-gated
 * ones, because at terminal every gate visit has been processed.
 *
 * ## The one thing this cannot predict
 *
 * `GauntletChart` has a **second outcome source that is not in the tape**: with
 * `crashDetection` enabled (the default), a core whose simulated trajectory
 * touches the crash line is killed and its outcome is overridden to
 * `"bad_design_crash"`. That is a genuine physics-derived finding, and no pure
 * function can compute it — it depends on the trajectory.
 *
 * So this resolver returns the **authored-tape terminal state**. It equals the
 * simulated settled state whenever the run does not crash (notably with
 * `crashDetection={false}`, where the tape is the whole story). When crash
 * detection is armed, treat the pure result as "the outcome the plan earns on
 * paper" and the simulated `killed` / `crashX` fields as the physical override.
 * Charts that need a fully authored reading should disable crash detection.
 */
import type { Datum } from "../shared/datumTypes"
import {
  applyGauntletEffect,
  eventLogItem,
  recordGauntletEvent
} from "./gauntletEffects"
import { defaultViability } from "./gauntletPhysics"
import type {
  GauntletEvent,
  GauntletEventContext,
  GauntletLayout,
  GauntletProjectState,
  GauntletPropertyDefinition,
  GauntletViabilityFn
} from "./gauntletTypes"

export interface GauntletTerminalOptions<TDatum extends Datum = Datum> {
  /** Initial project states, as `createInitialState` produces them. */
  projects: readonly GauntletProjectState<TDatum>[]
  /** Authored tape, or the per-project function form. */
  events?:
    | readonly GauntletEvent[]
    | ((
        project: GauntletProjectState<TDatum>,
        layout: GauntletLayout
      ) => readonly GauntletEvent[])
  layout: GauntletLayout
  positiveProperties: Map<string, GauntletPropertyDefinition>
  negativeProperties: Map<string, GauntletPropertyDefinition>
  viability?: GauntletViabilityFn<TDatum>
  outcome?: (
    project: GauntletProjectState<TDatum>,
    context: {
      layout: GauntletLayout
      negativeProperties: Map<string, GauntletPropertyDefinition>
      positiveProperties: Map<string, GauntletPropertyDefinition>
    }
  ) => string
}

function gateIndex(
  layout: GauntletLayout
): Map<string, GauntletLayout["gates"][number]> {
  return new Map(layout.gates.map((gate) => [gate.id, gate]))
}

/**
 * Fold one project's whole authored tape into its terminal state.
 *
 * Pure: no store, no kernel, no clock. Given the same inputs it returns the
 * same state, which is what makes it usable for SSR and snapshot export.
 */
export function resolveGauntletTerminalState<TDatum extends Datum = Datum>(
  project: GauntletProjectState<TDatum>,
  options: GauntletTerminalOptions<TDatum>
): GauntletProjectState<TDatum> {
  const { layout, positiveProperties, negativeProperties, viability, outcome } =
    options
  const gates = gateIndex(layout)
  const timeline = [
    ...((typeof options.events === "function"
      ? options.events(project, layout)
      : options.events) ?? [])
  ].sort((a, b) => a.time - b.time)

  let next = project
  for (const event of timeline) {
    const gate = event.gateId ? gates.get(event.gateId) : undefined
    const effects = event.effects ?? []
    const logItem = { ...eventLogItem(event, effects), appliedAt: event.time }

    const recorded = recordGauntletEvent(next, logItem)
    // Already-applied events are skipped, exactly as the live path does.
    if (recorded === next) continue
    next = recorded

    for (const effect of effects) {
      const context: GauntletEventContext<TDatum> = {
        event,
        gate,
        negativeProperties,
        positiveProperties,
        project: next
      }
      if (effect.when && !effect.when(context)) continue
      next = applyGauntletEffect(next, effect, context)
    }

    next = {
      ...next,
      viability:
        viability?.(next, { negativeProperties, positiveProperties }) ??
        defaultViability(next, positiveProperties, negativeProperties)
    }

    if (event.final) {
      next = {
        ...next,
        outcome:
          event.outcome ??
          outcome?.(next, { layout, negativeProperties, positiveProperties }) ??
          (next.viability > 20 ? "built" : "approved_not_built")
      }
    }
  }
  return next
}

/** Terminal state for every project in a run. */
export function resolveGauntletTerminalStates<TDatum extends Datum = Datum>(
  options: GauntletTerminalOptions<TDatum>
): GauntletProjectState<TDatum>[] {
  return options.projects.map((project) =>
    resolveGauntletTerminalState(project, options)
  )
}
