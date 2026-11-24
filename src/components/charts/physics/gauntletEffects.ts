/**
 * Pure Gauntlet gate-effect helpers (no React): resolving which attached
 * properties an effect pops, planning bounded property work, and applying
 * an effect to project state.
 */
import type { Datum } from "../shared/datumTypes"
import type {
  GauntletEffect,
  GauntletEvent,
  GauntletEventContext,
  GauntletEventLogItem,
  GauntletNegativeReplacementOptions,
  GauntletPopSpec,
  GauntletProjectState,
  GauntletPropertyWorkPlan,
  GauntletPropertyWorkPlanOptions
} from "./gauntletTypes"

export function indexDefinitions<T extends { id: string }>(definitions: readonly T[]) {
  return new Map(definitions.map(definition => [definition.id, definition]))
}

export function expandIds(input: readonly string[] | Record<string, number> | undefined): string[] {
  if (!input) return []
  if (Array.isArray(input)) return [...input]
  return Object.entries(input).flatMap(([id, count]) =>
    Array.from({ length: Math.max(0, Math.round(Number(count) || 0)) }, () => id)
  )
}

export function isReadonlyStringArray(value: GauntletPopSpec | undefined): value is readonly string[] {
  return Array.isArray(value)
}

export function resolvePopSpecIds(
  attachedIds: readonly string[],
  popSpec: GauntletPopSpec | undefined
): string[] {
  if (!popSpec) return []
  if (isReadonlyStringArray(popSpec)) return [...popSpec]
  if (popSpec.ids) return [...popSpec.ids]
  if (!popSpec.candidates) return []
  return popSpec.candidates
    .filter((id: string) => attachedIds.includes(id))
    .slice(0, popSpec.count ?? 1)
}

function removeOccurrences(ids: readonly string[], spec: GauntletPopSpec | undefined, newest: boolean) {
  const remaining = new Map<string, number>()
  for (const id of resolvePopSpecIds(ids, spec)) remaining.set(id, (remaining.get(id) ?? 0) + 1)
  const removed: Array<{ propertyId: string; index: number }> = []
  if (remaining.size) {
    for (let i = 0; i < ids.length; i++) {
      const index = newest ? ids.length - 1 - i : i
      const propertyId = ids[index]
      const count = remaining.get(propertyId) ?? 0
      if (count > 0) {
        remaining.set(propertyId, count - 1)
        removed.push({ propertyId, index })
      }
    }
  }
  return removed
}

export function inventoryChange(ids: readonly string[], pop: GauntletPopSpec | undefined, additions: GauntletEffect["addPositive"], newest: boolean) {
  const removed = removeOccurrences(ids, pop, newest)
  const indices = new Set(removed.map(entry => entry.index))
  const added = expandIds(additions)
  const active = ids.filter((_, index) => !indices.has(index)).concat(added)
  return { removed, added, active }
}

/**
 * Select attached property occurrences without exceeding a bounded work
 * budget. Selection is deterministic: property priority, then attachment
 * order. Expensive occurrences are skipped so later affordable work can fit.
 */
export function planGauntletPropertyWork(
  options: GauntletPropertyWorkPlanOptions
): GauntletPropertyWorkPlan {
  const budgetValue = Number(options.budget)
  const budget = Number.isFinite(budgetValue) ? Math.max(0, budgetValue) : 0
  const properties =
    options.properties instanceof Map
      ? options.properties
      : indexDefinitions(options.properties)
  const candidates = options.candidates ? new Set(options.candidates) : null
  const occurrences = options.attachedIds
    .map((id, index) => {
      const property = properties.get(id)
      const workValue = Number(property?.work ?? 1)
      const priorityValue = Number(property?.priority ?? index)
      return {
        id,
        index,
        priority: Number.isFinite(priorityValue) ? priorityValue : index,
        work: Number.isFinite(workValue) && workValue > 0 ? workValue : 1
      }
    })
    .filter((entry) => !candidates || candidates.has(entry.id))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)

  const ids: string[] = []
  const skippedIds: string[] = []
  let used = 0
  for (const entry of occurrences) {
    if (used + entry.work > budget + Number.EPSILON) {
      skippedIds.push(entry.id)
      continue
    }
    ids.push(entry.id)
    used += entry.work
  }

  return {
    ids,
    used,
    budget,
    remaining: Math.max(0, budget - used),
    skippedIds
  }
}

/** Build one add/pop effect for an occurrence-preserving replacement. */
export function replaceGauntletNegative<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  options: GauntletNegativeReplacementOptions
): GauntletEffect {
  if (!options.from || !options.to || options.from === options.to) return {}
  const requested = Math.max(0, Math.floor(Number(options.count ?? 1) || 0))
  const available = project.negativeIds.filter((id) => id === options.from).length
  const count = Math.min(requested, available)
  if (!count) return {}
  return {
    addNegative: { [options.to]: count },
    popNegative: {
      ids: Array.from({ length: count }, () => options.from)
    }
  }
}

/**
 * Resolve which negative property instances to detach. Returns body indices
 * into `project.negativeIds` so multi-instance loads keep stable body ids.
 */
export function resolvePopNegativeEntries<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  effect: GauntletEffect
): Array<{ propertyId: string; index: number }> {
  return removeOccurrences(project.negativeIds, effect.popNegative, false)
}

/**
 * Pure project-state transition for a single gate effect. Exported so unit
 * tests can cover popPositive / popNegative / add* without driving the
 * full physics tick loop.
 */
export function applyGauntletEffect<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  effect: GauntletEffect,
  context: GauntletEventContext<TDatum>
): GauntletProjectState<TDatum> {
  if (effect.when && !effect.when(context)) return project
  const next = { ...project }
  if (effect.popPositive || effect.addPositive) {
    const { active, added, removed } = inventoryChange(project.activePositiveIds, effect.popPositive, effect.addPositive, true)
    next.activePositiveIds = active
    next.poppedPositiveIds = [...project.poppedPositiveIds, ...removed.map(entry => entry.propertyId)]
    next.missingPositiveIds = project.missingPositiveIds.filter(id => !added.includes(id))
  }
  if (effect.popNegative || effect.addNegative) {
    const { active, removed } = inventoryChange(project.negativeIds, effect.popNegative, effect.addNegative, false)
    next.negativeIds = active
    next.poppedNegativeIds = [...project.poppedNegativeIds, ...removed.map(entry => entry.propertyId)]
  }
  if (effect.delayDelta) next.delay += effect.delayDelta
  if (effect.metricsDelta) {
    next.metrics = { ...project.metrics }
    for (const [key, value] of Object.entries(effect.metricsDelta)) {
      next.metrics[key] = Number(next.metrics[key] ?? 0) + value
    }
  }
  if (effect.viabilityDelta) next.viability += effect.viabilityDelta
  if (effect.stage) next.stage = effect.stage
  if (effect.outcome) next.outcome = effect.outcome
  return next
}

export function eventLogItem(event: GauntletEvent, effects: readonly GauntletEffect[]): GauntletEventLogItem {
  return {
    id: event.id,
    label: event.label ?? event.id,
    summary: event.summary ?? effects.find((effect) => effect.summary)?.summary,
    time: event.time
  }
}

/** Append one semantic event exactly once, even when render ticks outpace state commits. */
export function recordGauntletEvent<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  logItem: GauntletEventLogItem
): GauntletProjectState<TDatum> {
  if (project.eventsApplied.includes(logItem.id)) return project
  return {
    ...project,
    eventsApplied: [...project.eventsApplied, logItem.id],
    eventHistory: [...(project.eventHistory ?? []), logItem],
    lastEvent: logItem,
    stage: logItem.label ?? project.stage
  }
}
