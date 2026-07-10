/**
 * Serializable stage-journey state derived from physics region events.
 *
 * Keep this reducer independent from a live physics runtime so authors can
 * replay, compare, persist, and project the same event stream deterministically.
 */

import type { StreamPhysicsRegionEvent } from "../stream/physics/StreamPhysicsFrame"

export interface ProcessJourneyStage {
  id: string
  label?: string
}

export interface ProcessJourneyEntityState {
  id: string
  currentStageId?: string
  furthestStageId?: string
  furthestStageIndex: number
  visitedStageIds: string[]
  visitsByStage: Record<string, number>
  firstEnteredAt: Record<string, number>
  lastEnteredAt: Record<string, number>
  regressionCount: number
}

export interface ProcessJourneyLedger {
  stages: ProcessJourneyStage[]
  bodyIds: string[]
  entities: Record<string, ProcessJourneyEntityState>
}

type ProcessJourneyRegionEvent = Pick<
  StreamPhysicsRegionEvent,
  "bodyId" | "datum" | "region"
>

export interface ProcessJourneyUpdateOptions {
  entityId?: (event: ProcessJourneyRegionEvent) => string
  stageId?: (event: ProcessJourneyRegionEvent) => string | undefined
}

export interface ProcessJourneyRow {
  id: string
  label: string
  reached: number
  entered: number
  total: number
  conversion: number
  fromPrevious: number
  dropoff: number
  visits: number
  repeatVisits: number
}

function emptyJourneyEntity(id: string): ProcessJourneyEntityState {
  return {
    id,
    furthestStageIndex: -1,
    visitedStageIds: [],
    visitsByStage: {},
    firstEnteredAt: {},
    lastEnteredAt: {},
    regressionCount: 0
  }
}

function journeyStageId(
  event: ProcessJourneyRegionEvent,
  options: ProcessJourneyUpdateOptions
): string {
  const authored = options.stageId?.(event)
  if (authored) return authored
  const metadata = event.region.metadata
  if (metadata && typeof metadata === "object") {
    const stageId = (metadata as Record<string, unknown>).stageId
    if (typeof stageId === "string") return stageId
  }
  return event.region.id
}

/** Create serializable journey state for a known or initially empty cohort. */
export function createProcessJourneyLedger(options: {
  stages: readonly ProcessJourneyStage[]
  bodyIds?: readonly string[]
}): ProcessJourneyLedger {
  const bodyIds = Array.from(new Set(options.bodyIds ?? []))
  return {
    stages: options.stages.map((stage) => ({ ...stage })),
    bodyIds,
    entities: Object.fromEntries(
      bodyIds.map((bodyId) => [bodyId, emptyJourneyEntity(bodyId)])
    )
  }
}

/** Reduce a stage-region enter into unique reach and visit-aware entity state. */
export function updateProcessJourney(
  previous: ProcessJourneyLedger,
  event: Pick<
    StreamPhysicsRegionEvent,
    "type" | "bodyId" | "datum" | "observation" | "region"
  >,
  options: ProcessJourneyUpdateOptions = {}
): ProcessJourneyLedger {
  if (event.type !== "region-enter") return previous
  const stageId = journeyStageId(event, options)
  const stageIndex = previous.stages.findIndex((stage) => stage.id === stageId)
  if (stageIndex < 0) return previous

  const bodyId = options.entityId?.(event) ?? event.bodyId
  if (!bodyId) return previous
  const current = previous.entities[bodyId] ?? emptyJourneyEntity(bodyId)
  const previousStageIndex = current.currentStageId
    ? previous.stages.findIndex((stage) => stage.id === current.currentStageId)
    : -1
  const firstVisit = !current.visitedStageIds.includes(stageId)
  const timestamp = Number(event.observation.timestamp)
  const enteredAt = Number.isFinite(timestamp) ? timestamp : 0
  const nextEntity: ProcessJourneyEntityState = {
    ...current,
    currentStageId: stageId,
    furthestStageId:
      stageIndex > current.furthestStageIndex
        ? stageId
        : current.furthestStageId,
    furthestStageIndex: Math.max(current.furthestStageIndex, stageIndex),
    visitedStageIds: firstVisit
      ? [...current.visitedStageIds, stageId]
      : current.visitedStageIds,
    visitsByStage: {
      ...current.visitsByStage,
      [stageId]: (current.visitsByStage[stageId] ?? 0) + 1
    },
    firstEnteredAt: firstVisit
      ? { ...current.firstEnteredAt, [stageId]: enteredAt }
      : current.firstEnteredAt,
    lastEnteredAt: { ...current.lastEnteredAt, [stageId]: enteredAt },
    regressionCount:
      previousStageIndex >= 0 && stageIndex < previousStageIndex
        ? current.regressionCount + 1
        : current.regressionCount
  }

  return {
    ...previous,
    bodyIds: previous.bodyIds.includes(bodyId)
      ? previous.bodyIds
      : [...previous.bodyIds, bodyId],
    entities: { ...previous.entities, [bodyId]: nextEntity }
  }
}

/** Convert a live journey ledger into stable stage reach and conversion rows. */
export function processJourneyRows(
  ledger: ProcessJourneyLedger
): ProcessJourneyRow[] {
  const entities = ledger.bodyIds.map(
    (bodyId) => ledger.entities[bodyId] ?? emptyJourneyEntity(bodyId)
  )
  const total = entities.length
  let previousReached = total

  return ledger.stages.map((stage, stageIndex) => {
    const reached = entities.filter(
      (entity) => entity.furthestStageIndex >= stageIndex
    ).length
    const entered = entities.filter((entity) =>
      entity.visitedStageIds.includes(stage.id)
    ).length
    const visits = entities.reduce(
      (sum, entity) => sum + (entity.visitsByStage[stage.id] ?? 0),
      0
    )
    const row = {
      id: stage.id,
      label: stage.label ?? stage.id,
      reached,
      entered,
      total,
      conversion: total > 0 ? reached / total : 0,
      fromPrevious: previousReached > 0 ? reached / previousReached : 0,
      dropoff: Math.max(0, previousReached - reached),
      visits,
      repeatVisits: Math.max(0, visits - entered)
    }
    previousReached = reached
    return row
  })
}
