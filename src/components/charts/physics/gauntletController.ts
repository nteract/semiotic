/**
 * Gauntlet React-facing controller glue: builds the imperative ref handle,
 * the per-gate capacity controllers, and the per-tick crash/event-application
 * pass. Plain functions (no hooks) called from inside GauntletChart's
 * existing useImperativeHandle/useMemo/useCallback — refs and memoized
 * callbacks are passed in explicitly instead of closed over, so identity and
 * dependency-array semantics are unchanged from before extraction.
 */
import type { Datum } from "../shared/datumTypes"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import {
  createCapacityQueueController,
  type CapacityQueueSnapshot,
  type PhysicsController
} from "../../stream/physics/PhysicsControllers"
import type {
  PhysicsPipelineControlSurface,
  PhysicsPipelineTickResult,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import type { StreamPhysicsFrameHandle } from "../../stream/physics/StreamPhysicsFrame"
import {
  CORE_KIND,
  buildProjectSpawns,
  defaultViability,
  projectCoreId,
  projectNegativeId,
  projectPositiveId,
  resolvePlacement,
  type GauntletBodyDatum,
  type GauntletCoreBodyFn,
  type GauntletEffect,
  type GauntletEvent,
  type GauntletEventContext,
  type GauntletLayout,
  type GauntletProjectPlacementFn,
  type GauntletProjectState,
  type GauntletPropertyDefinition,
  type GauntletViabilityFn
} from "./gauntletPhysics"
import { applyGauntletEffect, eventLogItem, recordGauntletEvent } from "./gauntletEffects"

export function capacitySnapshotsEqual(
  a: readonly CapacityQueueSnapshot[],
  b: readonly CapacityQueueSnapshot[]
): boolean {
  if (a.length !== b.length) return false
  return a.every((snapshot, index) => {
    const other = b[index]
    if (!other) return false
    return (
      snapshot.regionId === other.regionId &&
      snapshot.queueDepth === other.queueDepth &&
      snapshot.blockedDepth === other.blockedDepth &&
      snapshot.processedCount === other.processedCount &&
      snapshot.metricRevision === other.metricRevision
    )
  })
}

/** Build one capacity-queue controller per gate that declares `capacity`. */
export function buildGauntletCapacityControllers<TDatum extends Datum>(options: {
  dataKey: string
  gates: GauntletLayout["gates"]
  statesRef: { current: readonly GauntletProjectState<TDatum>[] }
  processedGateVisitsRef: { current: Map<string, number> }
}): PhysicsController[] {
  const { dataKey, gates, statesRef, processedGateVisitsRef } = options
  return gates.flatMap((gate) => {
    if (!gate.capacity || gate.capacity.unitsPerSecond <= 0) return []
    const regionId = `gauntlet-gate-${gate.id}`
    return [
      createCapacityQueueController({
        id: `gauntlet-capacity-${dataKey}-${gate.id}`,
        regionId,
        unitsPerSecond: gate.capacity.unitsPerSecond,
        bodyFilter: { property: "datum.kind", equals: CORE_KIND },
        maxQueue: gate.capacity.maxQueue,
        queueLayout: gate.capacity.queueLayout,
        queueSlotSpacing: gate.capacity.queueSlotSpacing,
        queueStiffness: gate.capacity.queueStiffness ?? 24,
        releaseImpulse: { x: 36, y: 0 },
        unitAccessor: (body: PhysicsBodyState) => {
          const wrapped = body.datum as GauntletBodyDatum<TDatum> | undefined
          const source = wrapped?.sourceDatum as Record<string, unknown> | undefined
          const accessor = gate.capacity?.unitAccessor
          const project = statesRef.current.find(
            (candidate) => candidate.id === wrapped?.projectId
          )
          let sourceValue: unknown
          if (typeof accessor === "function") {
            sourceValue = project
              ? accessor(project as GauntletProjectState)
              : undefined
          } else if (accessor) {
            sourceValue = source?.[accessor]
          }
          const fallback =
            source?.reviewWork ??
            source?.work ??
            project?.metrics.reviewWork ??
            source?.points
          const work = Number(sourceValue ?? fallback)
          return Number.isFinite(work) && work > 0 ? work : 1
        },
        onProcessed: (body: PhysicsBodyState) => {
          const wrapped = body.datum as GauntletBodyDatum<TDatum> | undefined
          if (!wrapped?.projectId) return
          const key = `${wrapped.projectId}:${gate.id}`
          processedGateVisitsRef.current.set(
            key,
            (processedGateVisitsRef.current.get(key) ?? 0) + 1
          )
        }
      })
    ]
  })
}

/** Build the `ref.current` imperative API (push/pushMany/remove/update/clear/...). */
export function buildGauntletImperativeHandle<TDatum extends Datum>(deps: {
  statesRef: { current: GauntletProjectState<TDatum>[] }
  setStates: (states: GauntletProjectState<TDatum>[]) => void
  elapsedRef: { current: number }
  frameRef: { current: StreamPhysicsFrameHandle | null }
  layout: GauntletLayout
  projectPlacement: GauntletProjectPlacementFn<TDatum> | undefined
  positiveById: Map<string, GauntletPropertyDefinition>
  negativeById: Map<string, GauntletPropertyDefinition>
  coreBody: GauntletCoreBodyFn<TDatum> | undefined
  createState: (datum: TDatum, index: number, defaultStartedAt?: number) => GauntletProjectState<TDatum>
}): PhysicsFrameHandle {
  const {
    statesRef,
    setStates,
    elapsedRef,
    frameRef,
    layout,
    projectPlacement,
    positiveById,
    negativeById,
    coreBody,
    createState
  } = deps
  return {
    push: (datum) => {
      const state = createState(
        datum as TDatum,
        statesRef.current.length,
        elapsedRef.current
      )
      const placement = resolvePlacement(
        state,
        statesRef.current.length,
        layout,
        projectPlacement
      )
      const spawns = buildProjectSpawns(
        state,
        statesRef.current.length,
        layout,
        placement,
        positiveById,
        negativeById,
        coreBody
      )
      const nextStates = [...statesRef.current, state]
      statesRef.current = nextStates
      setStates(nextStates)
      frameRef.current?.pushMany(spawns)
      frameRef.current?.step(0)
    },
    pushMany: (rows) => {
      const nextStates = [...statesRef.current]
      const nextSpawns: PhysicsQueuedSpawn[] = []
      const startedAt = elapsedRef.current
      rows.forEach((row) => {
        const state = createState(
          row as TDatum,
          nextStates.length,
          startedAt
        )
        const placement = resolvePlacement(state, nextStates.length, layout, projectPlacement)
        nextSpawns.push(
          ...buildProjectSpawns(
            state,
            nextStates.length,
            layout,
            placement,
            positiveById,
            negativeById,
            coreBody
          )
        )
        nextStates.push(state)
      })
      statesRef.current = nextStates
      setStates(nextStates)
      if (nextSpawns.length) frameRef.current?.pushMany(nextSpawns)
      frameRef.current?.step(0)
    },
    remove: (id) => {
      const ids = Array.isArray(id) ? id : [id]
      const removed: Datum[] = []
      const bodyIds: string[] = []
      for (const projectId of ids) {
        const project = statesRef.current.find((state) => state.id === projectId)
        if (!project) continue
        removed.push(project.datum)
        bodyIds.push(
          projectCoreId(project.id),
          ...project.activePositiveIds.map((propertyId) => projectPositiveId(project.id, propertyId))
        )
        project.negativeIds.forEach((propertyId, index) => {
          bodyIds.push(projectNegativeId(project.id, propertyId, index))
        })
      }
      statesRef.current = statesRef.current.filter((state) => !ids.includes(state.id))
      setStates(statesRef.current)
      frameRef.current?.remove(bodyIds)
      return removed
    },
    update: (id, updater) => {
      const ids = Array.isArray(id) ? id : [id]
      const previous: Datum[] = []
      for (const projectId of ids) {
        const old = statesRef.current.find((state) => state.id === projectId)
        if (!old) continue
        const projectIndex = statesRef.current.findIndex((state) => state.id === projectId)
        previous.push(old.datum)
        const nextDatum = updater(old.datum) as TDatum
        const nextState = createState(
          nextDatum,
          projectIndex < 0 ? statesRef.current.length : projectIndex,
          old.startedAt ?? elapsedRef.current
        )
        const placement = resolvePlacement(
          nextState,
          projectIndex < 0 ? statesRef.current.length : projectIndex,
          layout,
          projectPlacement
        )
        frameRef.current?.remove([
          projectCoreId(old.id),
          ...old.activePositiveIds.map((propertyId) => projectPositiveId(old.id, propertyId)),
          ...old.negativeIds.map((propertyId, index) => projectNegativeId(old.id, propertyId, index))
        ])
        frameRef.current?.pushMany(
          buildProjectSpawns(
            nextState,
            projectIndex < 0 ? statesRef.current.length : projectIndex,
            layout,
            placement,
            positiveById,
            negativeById,
            coreBody
          )
        )
        statesRef.current = statesRef.current.map((state) => state.id === projectId ? nextState : state)
      }
      setStates(statesRef.current)
      return previous
    },
    clear: () => {
      statesRef.current = []
      setStates([])
      frameRef.current?.clear()
    },
    getData: () => statesRef.current.map((state) => state.datum),
    getScales: () => null,
    getCustomLayout: () => frameRef.current?.snapshot() ?? null,
    popBodies: (ids, popOptions) => frameRef.current?.popBodies(ids, popOptions) ?? []
  }
}

/** Per-tick crash detection + due-event application, driving `updateProjectState`. */
export function runGauntletTick<TDatum extends Datum>(
  result: PhysicsPipelineTickResult,
  controls: PhysicsPipelineControlSurface,
  deps: {
    frameProps: { onTick?: (result: PhysicsPipelineTickResult, controls: PhysicsPipelineControlSurface) => void }
    elapsedRef: { current: number }
    statesRef: { current: readonly GauntletProjectState<TDatum>[] }
    crashDetection: boolean
    layout: GauntletLayout
    projectEvents: (project: GauntletProjectState<TDatum>) => readonly GauntletEvent[]
    gateById: Map<string, GauntletLayout["gates"][number]>
    capacityEventReady: (
      project: GauntletProjectState<TDatum>,
      event: GauntletEvent,
      timeline: readonly GauntletEvent[]
    ) => boolean
    addBodiesForEffect: (
      project: GauntletProjectState<TDatum>,
      effect: GauntletEffect,
      controls: PhysicsPipelineControlSurface
    ) => void
    updateProjectState: (
      projectId: string,
      updater: (project: GauntletProjectState<TDatum>) => GauntletProjectState<TDatum>
    ) => void
    viability: GauntletViabilityFn<TDatum> | undefined
    positiveById: Map<string, GauntletPropertyDefinition>
    negativeById: Map<string, GauntletPropertyDefinition>
    outcome:
      | ((
          project: GauntletProjectState<TDatum>,
          context: {
            layout: GauntletLayout
            negativeProperties: Map<string, GauntletPropertyDefinition>
            positiveProperties: Map<string, GauntletPropertyDefinition>
          }
        ) => string)
      | undefined
    reportCapacity: () => void
  }
): void {
  const {
    frameProps,
    elapsedRef,
    statesRef,
    crashDetection,
    layout,
    projectEvents,
    gateById,
    capacityEventReady,
    addBodiesForEffect,
    updateProjectState,
    viability,
    positiveById,
    negativeById,
    outcome,
    reportCapacity
  } = deps
  frameProps.onTick?.(result, controls)
  elapsedRef.current = result.elapsedSeconds ?? controls.snapshot().elapsedSeconds
  reportCapacity()
  for (const project of statesRef.current) {
    const core = controls.readBodies().find((body) => body.id === projectCoreId(project.id))
    if (!core) continue
    const radius = core.shape.type === "circle" ? core.shape.radius : 28
    if (crashDetection && !project.killed && core.y + radius >= layout.crashY) {
      controls.readBodies().forEach((body) => {
        const datum = body.datum as GauntletBodyDatum | undefined
        if (!datum?.__gauntlet || datum.projectId !== project.id) return
        controls.applyImpulse(body.id, -body.vx * body.mass, 0)
      })
      updateProjectState(project.id, (current) => {
        const crashEvent = {
          appliedAt: Math.max(
            0,
            elapsedRef.current - (current.startedAt ?? 0)
          ),
          id: "gauntlet-crash-line",
          label: "Crash Line",
          summary: "The project hit the crash threshold; lift and forward motion shut off.",
          time: Math.max(0, elapsedRef.current - (current.startedAt ?? 0))
        }
        return {
          ...current,
          crashX: core.x,
          eventHistory: [...(current.eventHistory ?? []), crashEvent],
          killed: true,
          lastEvent: crashEvent,
          metrics: {
            ...current.metrics,
            lastX: core.x
          },
          outcome: "bad_design_crash",
          stage: "Crash Line",
          viability: Math.min(0, current.viability)
        }
      })
      continue
    }
    if (project.killed) continue
    const projectElapsed = Math.max(
      0,
      elapsedRef.current - (project.startedAt ?? 0)
    )
    const timeline = projectEvents(project)
    const due = timeline.filter(
      (event) =>
        event.time <= projectElapsed &&
        !project.eventsApplied.includes(event.id) &&
        capacityEventReady(project, event, timeline)
    )
    let projectedForBodies = project
    for (const event of due) {
      const gate = event.gateId ? gateById.get(event.gateId) : undefined
      const effects = event.effects ?? []
      for (const effect of effects) {
        const context: GauntletEventContext<TDatum> = {
          event,
          gate,
          negativeProperties: negativeById,
          positiveProperties: positiveById,
          project: projectedForBodies
        }
        if (effect.when && !effect.when(context)) continue
        addBodiesForEffect(projectedForBodies, effect, controls)
        projectedForBodies = applyGauntletEffect(projectedForBodies, effect, context)
      }
      const logItem = {
        ...eventLogItem(event, effects),
        appliedAt: projectElapsed
      }
      projectedForBodies = recordGauntletEvent(projectedForBodies, logItem)
      updateProjectState(project.id, (current) => {
        let next = recordGauntletEvent(current, logItem)
        if (next === current) return current
        for (const effect of effects) {
          const context: GauntletEventContext<TDatum> = {
            event,
            gate,
            negativeProperties: negativeById,
            positiveProperties: positiveById,
            project: next
          }
          next = applyGauntletEffect(next, effect, context)
        }
        const computedViability =
          viability?.(next, {
            negativeProperties: negativeById,
            positiveProperties: positiveById
          }) ?? defaultViability(next, positiveById, negativeById)
        next = { ...next, viability: computedViability }
        if (event.final) {
          next = {
            ...next,
            outcome:
              event.outcome ??
              outcome?.(next, {
                layout,
                negativeProperties: negativeById,
                positiveProperties: positiveById
              }) ??
              (next.viability > 20 ? "built" : "approved_not_built")
          }
        }
        return next
      })
    }
  }
}
