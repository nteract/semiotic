"use client"

import * as React from "react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { Style } from "../../stream/types"
import StreamPhysicsFrame, {
  type PhysicsBodySemanticItemAccessor,
  type PhysicsBodyStyleContext,
  type PhysicsHoverData,
  type StreamPhysicsBodyForceContext,
  type StreamPhysicsFrameHandle,
  type StreamPhysicsFrameProps,
  type StreamPhysicsRegionEffect
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import {
  createCapacityQueueController,
  type CapacityQueueSnapshot
} from "../../stream/physics/PhysicsControllers"
import type {
  PhysicsPipelineControlSurface,
  PhysicsPipelineTickResult,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { physicsProcessGroupSemanticItems } from "./physicsProcessPrimitives"
import {
  composePhysicsFrameGraphics,
  renderPhysicsChartState,
  renderPhysicsFrame,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsTooltipProps,
  usePhysicsChartMode
} from "./physicsHocUtils"
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  CORE_KIND,
  POSITIVE_KIND,
  NEGATIVE_KIND,
  applyGauntletEffect,
  buildLayout,
  buildProjectSpawns,
  createInitialState,
  defaultViability,
  eventLogItem,
  gauntletWallColliders,
  projectCoreId,
  projectNegativeId,
  projectPositiveId,
  propertyLabel,
  readAccessor,
  recordGauntletEvent,
  resolvePlacement,
  type GauntletBodyDatum,
  type GauntletEffect,
  type GauntletEventContext,
  type GauntletProjectState,
  type GauntletPropertyDefinition
} from "./gauntletPhysics"
import {
  computeGauntletBodyForce,
  spawnBodiesForGauntletEffect
} from "./gauntletRuntime"
import {
  drawGauntletBody,
  drawTethers,
  GauntletChrome,
  GauntletProjectionOverlay,
  gauntletProjectionSemanticItems,
  gauntletSemanticItem
} from "./gauntletChrome"
import type { GauntletChartProps } from "./gauntletChartProps"

// Public pure API (also used by SSR + tests)
export {
  GAUNTLET_WALL,
  clampGauntletPoint,
  buildGauntletPhysics,
  applyGauntletEffect,
  planGauntletPropertyWork,
  replaceGauntletNegative
} from "./gauntletPhysics"
export type {
  GauntletAccessors,
  GauntletCoreBodyFn,
  GauntletEffect,
  GauntletEvent,
  GauntletEventContext,
  GauntletEventLogItem,
  GauntletGate,
  GauntletLayout,
  GauntletPopSpec,
  GauntletProjectPlacement,
  GauntletProjectPlacementFn,
  GauntletProjectState,
  GauntletPropertyDefinition,
  GauntletPropertyForceContext,
  GauntletPropertyWorkPlan,
  GauntletPropertyWorkPlanOptions,
  GauntletNegativeReplacementOptions,
  GauntletViabilityFn
} from "./gauntletPhysics"
export type { GauntletChartProps }

const EMPTY_GAUNTLET_PROPERTIES: readonly GauntletPropertyDefinition[] = []

function capacitySnapshotsEqual(
  a: readonly CapacityQueueSnapshot[],
  b: readonly CapacityQueueSnapshot[]
): boolean {
  if (a.length !== b.length) return false
  return a.every((snapshot, index) => {
    const other = b[index]
    return (
      snapshot.regionId === other?.regionId &&
      snapshot.queueDepth === other.queueDepth &&
      snapshot.processedCount === other.processedCount &&
      Math.abs(snapshot.remainingWork - other.remainingWork) < 0.01
    )
  })
}

/**
 * Physics-backed gauntlet: project core + property satellites through timed or
 * capacity-gated process events.
 *
 * @example
 * ```tsx
 * <GauntletChart
 *   data={[{ id: "plan-a", positives: ["homes"], negatives: ["cost"] }]}
 *   positiveProperties={[{ id: "homes", label: "Homes", radius: 10 }]}
 *   negativeProperties={[{ id: "cost", label: "Cost", load: 1.2, radius: 8 }]}
 *   size={[720, 380]}
 * />
 * ```
 *
 * @example
 * Multiple attached properties routed through timed gates, with the
 * settled viability/outcome projection strip enabled:
 * ```tsx
 * <GauntletChart
 *   data={[{ id: "plan-a", positives: ["homes", "jobs"], negatives: ["cost"] }]}
 *   positiveProperties={[
 *     { id: "homes", label: "Homes", radius: 10 },
 *     { id: "jobs", label: "Jobs", radius: 10 },
 *   ]}
 *   negativeProperties={[{ id: "cost", label: "Cost", load: 1.2, radius: 8 }]}
 *   gates={[
 *     { id: "review", label: "Review" },
 *     { id: "budget", label: "Budget" },
 *   ]}
 *   showProjection
 *   size={[720, 380]}
 * />
 * ```
 *
 * @example
 * Stagger negative-only compound entities on project-local clocks and share a
 * finite service across their root bodies:
 * ```tsx
 * <GauntletChart
 *   data={pullRequests}
 *   startTimeAccessor="arrival"
 *   negativeAccessor="risks"
 *   negativeProperties={riskProperties}
 *   gates={[{
 *     id: "review",
 *     capacity: { unitsPerSecond: 5, unitAccessor: "reviewWork" }
 *   }]}
 *   events={reviewEvents}
 *   onCapacityChange={setCapacity}
 * />
 * ```
 */
export const GauntletChart = forwardRef(function GauntletChart<TDatum extends Datum = Datum>(
  props: GauntletChartProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const {
    bodyGroups,
    coreBody,
    coreForceMode = "route",
    crashDetection = true,
    crashOffset = 30,
    data,
    emptyContent,
    events,
    frameProps = {},
    gates,
    initialSpawnPacing,
    loading,
    loadingContent,
    negativeProperties,
    onCapacityChange,
    onClick,
    onStateChange,
    outcome,
    paused,
    positiveProperties = EMPTY_GAUNTLET_PROPERTIES,
    projectPlacement,
    responsiveHeight,
    responsiveWidth,
    showTethers = true,
    terminalBehavior = "outcome",
    viability
  } = props
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const stateAccessors = useMemo(
    () => ({
      idAccessor: props.idAccessor,
      initialViability: props.initialViability,
      metricsAccessor: props.metricsAccessor,
      negativeAccessor: props.negativeAccessor,
      positiveAccessor: props.positiveAccessor,
      startTimeAccessor: props.startTimeAccessor
    }),
    [
      props.idAccessor,
      props.initialViability,
      props.metricsAccessor,
      props.negativeAccessor,
      props.positiveAccessor,
      props.startTimeAccessor
    ]
  )
  const layoutMode = usePhysicsChartMode(props, [DEFAULT_WIDTH, DEFAULT_HEIGHT])
  const {
    chartSize,
    showProjection,
    showChrome,
    className: modeClassName,
    title: modeTitle,
    chartMode,
    margin: modeMargin,
    enableHover: modeEnableHover,
    description: modeDescription,
    summary: modeSummary,
    accessibleTable: modeAccessibleTable
  } = layoutMode
  const stateEl = renderPhysicsChartState({
    data,
    emptyContent,
    loading,
    loadingContent,
    size: chartSize
  })
  const safeData = useMemo(() => filterSparseArray(data ?? []) as TDatum[], [data])
  const dataKey = useMemo(
    () =>
      safeData
        .map((datum, index) =>
          String(
            readAccessor(
              datum,
              index,
              stateAccessors.idAccessor,
              datum.id != null ? String(datum.id) : `project-${index}`
            )
          )
        )
        .join("|"),
    [safeData, stateAccessors.idAccessor]
  )
  const positiveById = useMemo(
    () => new Map(positiveProperties.map((property) => [property.id, property])),
    [positiveProperties]
  )
  const negativeById = useMemo(
    () => new Map(negativeProperties.map((property) => [property.id, property])),
    [negativeProperties]
  )
  const layout = useMemo(() => buildLayout(chartSize, gates, crashOffset), [chartSize, crashOffset, gates])
  const gateById = useMemo(() => new Map(layout.gates.map((gate) => [gate.id, gate])), [layout.gates])
  const gateRegionEffects = useMemo<StreamPhysicsRegionEffect[]>(
    () =>
      layout.gates.map((gate) => ({
        kind: "force-field",
        damping: 0.035,
        force: { x: 12, y: 0 },
        semanticItem: false,
        ...gate.regionEffect,
        id: `gauntlet-gate-${gate.id}`,
        label: gate.label ?? gate.id,
        description: gate.description,
        bodyFilter: gate.capacity
          ? { property: "datum.kind", equals: CORE_KIND }
          : gate.regionEffect?.bodyFilter,
        shape: {
          type: "aabb",
          x: gate.x,
          y: layout.routeY,
          width: gate.capacity
            ? gate.capacity.sensorWidth ?? Math.max(96, gate.width * 6)
            : Math.max(gate.width, 54),
          height: Math.min(360, layout.height - 170)
        }
      })),
    [layout.gates, layout.height, layout.routeY]
  )
  const [states, setStates] = useState<GauntletProjectState<TDatum>[]>(() =>
    safeData.map((datum, index) => {
      const state = createInitialState(datum, index, stateAccessors, positiveProperties, negativeById)
      return {
        ...state,
        viability:
          viability?.(state, {
            negativeProperties: negativeById,
            positiveProperties: positiveById
          }) ?? defaultViability(state, positiveById, negativeById)
      }
    })
  )
  const statesRef = useRef(states)
  const elapsedRef = useRef(0)
  const processedGateVisitsRef = useRef(new Map<string, number>())
  const capacitySnapshotsRef = useRef<CapacityQueueSnapshot[]>([])
  const onCapacityChangeRef = useRef(onCapacityChange)
  onCapacityChangeRef.current = onCapacityChange
  const capacityControllers = useMemo(
    () =>
      layout.gates.flatMap((gate) => {
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
            unitAccessor: (body) => {
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
            onProcessed: (body) => {
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
      }),
    [dataKey, layout.gates]
  )
  const combinedControllers = useMemo(
    () => [...capacityControllers, ...(frameProps.controllers ?? [])],
    [capacityControllers, frameProps.controllers]
  )
  // Keep latest builders/callbacks in refs so identity thrash (inline
  // viability, data={[row]}, onStateChange={() => …}) cannot re-seed the
  // simulation or re-enter React update loops.
  const safeDataRef = useRef(safeData)
  safeDataRef.current = safeData
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange
  const createStateDepsRef = useRef({
    negativeById,
    positiveById,
    positiveProperties,
    stateAccessors,
    viability
  })
  createStateDepsRef.current = {
    negativeById,
    positiveById,
    positiveProperties,
    stateAccessors,
    viability
  }

  const createState = useCallback((
    datum: TDatum,
    index: number,
    defaultStartedAt = 0
  ) => {
    const deps = createStateDepsRef.current
    const state = createInitialState(
      datum,
      index,
      deps.stateAccessors,
      deps.positiveProperties,
      deps.negativeById
    )
    if (!deps.stateAccessors.startTimeAccessor) {
      state.startedAt = Math.max(0, defaultStartedAt)
    }
    return {
      ...state,
      viability:
        deps.viability?.(state, {
          negativeProperties: deps.negativeById,
          positiveProperties: deps.positiveById
        }) ?? defaultViability(state, deps.positiveById, deps.negativeById)
    }
  }, [])

  // Re-seed project state only when the set of project ids changes — not when
  // the parent passes a fresh `data={[…]}` array with the same rows (the usual
  // cause of gauntlet remount flicker + max-update-depth loops with live
  // onStateChange readouts).
  useEffect(() => {
    processedGateVisitsRef.current.clear()
    capacitySnapshotsRef.current = []
    const next = safeDataRef.current.map((datum, index) => createState(datum, index))
    statesRef.current = next
    setStates(next)
  }, [createState, dataKey])

  useEffect(() => {
    statesRef.current = states
    onStateChangeRef.current?.(states)
  }, [states])

  const projectEvents = useCallback(
    (project: GauntletProjectState<TDatum>) => {
      const resolved = typeof events === "function" ? events(project, layout) : events
      return [...(resolved ?? [])].sort((a, b) => a.time - b.time)
    },
    [events, layout]
  )

  const capacityEventReady = useCallback(
    (
      project: GauntletProjectState<TDatum>,
      event: ReturnType<typeof projectEvents>[number],
      timeline: readonly ReturnType<typeof projectEvents>[number][]
    ) => {
      if (!event.gateId || !gateById.get(event.gateId)?.capacity) return true
      const authoredVisit = Number(event.gateVisit)
      const visitOrdinal =
        Number.isFinite(authoredVisit) && authoredVisit > 0
          ? Math.floor(authoredVisit)
          : timeline
              .filter((candidate) => candidate.gateId === event.gateId)
              .findIndex((candidate) => candidate.id === event.id) + 1
      if (visitOrdinal <= 0) return false
      const completed =
        processedGateVisitsRef.current.get(`${project.id}:${event.gateId}`) ?? 0
      return completed >= visitOrdinal
    },
    [gateById]
  )

  const reportCapacity = useCallback(() => {
    if (!capacityControllers.length) return
    const snapshots = capacityControllers.flatMap((controller) => {
      const snapshot = controller.getSnapshot?.()
      return snapshot ? [snapshot as CapacityQueueSnapshot] : []
    })
    if (capacitySnapshotsEqual(capacitySnapshotsRef.current, snapshots)) return
    capacitySnapshotsRef.current = snapshots
    onCapacityChangeRef.current?.(snapshots)
  }, [capacityControllers])

  const initialSpawns = useMemo(
    () =>
      states.flatMap((project, index) => {
        const placement = resolvePlacement(project, index, layout, projectPlacement)
        return buildProjectSpawns(project, index, layout, placement, positiveById, negativeById, coreBody)
      }),
    [coreBody, layout, negativeById, positiveById, projectPlacement, states]
  )

  const updateProjectState = useCallback((projectId: string, updater: (project: GauntletProjectState<TDatum>) => GauntletProjectState<TDatum>) => {
    let changed = false
    const next = statesRef.current.map((project) => {
      if (project.id !== projectId) return project
      const updated = updater(project)
      changed = changed || updated !== project
      return updated
    })
    if (!changed) return

    // Physics ticks can outpace React commits. Advance the authoritative ref
    // immediately so a due event cannot be discovered again on the next tick.
    statesRef.current = next
    setStates(next)
  }, [])

  useImperativeHandle(
    ref,
    (): RealtimeFrameHandle => ({
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
      getCustomLayout: () => frameRef.current?.snapshot() ?? null
    }),
    [coreBody, createState, layout, negativeById, positiveById, projectPlacement]
  )

  const addBodiesForEffect = useCallback(
    (project: GauntletProjectState<TDatum>, effect: GauntletEffect, controls: PhysicsPipelineControlSurface) => {
      spawnBodiesForGauntletEffect({
        project,
        effect,
        controls,
        layout,
        positiveById,
        negativeById,
        coreBody,
        popBodies: (ids, options) => frameRef.current?.popBodies(ids, options)
      })
    },
    [coreBody, layout, negativeById, positiveById]
  )

  const bodyForces = useCallback(
    ({ body, bodies }: StreamPhysicsBodyForceContext) =>
      computeGauntletBodyForce({
        body,
        bodies,
        layout,
        states: statesRef.current,
        projectPlacement,
        positiveById,
        negativeById,
        projectEvents,
        gateById,
        coreForceMode,
        terminalBehavior,
        elapsed: elapsedRef.current
      }),
    [coreForceMode, gateById, layout, negativeById, positiveById, projectEvents, projectPlacement, terminalBehavior]
  )

  const onTick = useCallback(
    (result: PhysicsPipelineTickResult, controls: PhysicsPipelineControlSurface) => {
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
    },
    [
      addBodiesForEffect,
      capacityEventReady,
      crashDetection,
      frameProps,
      gateById,
      layout,
      negativeById,
      outcome,
      positiveById,
      projectEvents,
      reportCapacity,
      updateProjectState,
      viability
    ]
  )

  const bodyStyle = useCallback(
    (body: PhysicsBodyState, context: PhysicsBodyStyleContext): Style => {
      const frameStyle =
        typeof frameProps.bodyStyle === "function"
          ? frameProps.bodyStyle(body, context)
          : frameProps.bodyStyle
      const datum = body.datum as GauntletBodyDatum | undefined
      if (!datum?.__gauntlet) return frameStyle ?? {}
      return {
        fill:
          datum.kind === CORE_KIND
            ? "var(--semiotic-accent, #0f766e)"
            : datum.property?.color ?? "var(--semiotic-accent, #38bdf8)",
        stroke: datum.kind === CORE_KIND ? "#f8fafc" : "#0f172a",
        opacity: 0.96,
        ...frameStyle
      }
    },
    [frameProps]
  )

  const resolvedBodyGroups = useMemo(
    () =>
      typeof bodyGroups === "function"
        ? bodyGroups(states, layout)
        : bodyGroups ?? [],
    [bodyGroups, layout, states]
  )
  const bodyGroupSemanticItems = useMemo(
    () => physicsProcessGroupSemanticItems(resolvedBodyGroups),
    [resolvedBodyGroups]
  )
  const projectionSemanticItems = useMemo(
    () =>
      showProjection ? gauntletProjectionSemanticItems(states, layout) : [],
    [layout, showProjection, states]
  )
  const semanticItems = useMemo(
    () => [...projectionSemanticItems, ...bodyGroupSemanticItems],
    [bodyGroupSemanticItems, projectionSemanticItems]
  )

  const handlePointerDown = useCallback<
    NonNullable<StreamPhysicsFrameProps["onBodyPointerDown"]>
  >(
    (body, event) => {
      frameProps.onBodyPointerDown?.(body, event)
    },
    [frameProps]
  )

  // Gauntlet bodies wrap source rows — unwrap for the Semiotic onClick contract.
  const gauntletOnClick = useCallback<
    NonNullable<StreamPhysicsFrameProps["onClick"]>
  >(
    (datum, event) => {
      if (!onClick) return
      const wrapped = datum as GauntletBodyDatum<TDatum> | null
      if (wrapped && typeof wrapped === "object" && wrapped.__gauntlet) {
        onClick(wrapped.sourceDatum, { x: event.x, y: event.y })
        return
      }
      onClick(datum, { x: event.x, y: event.y })
    },
    [onClick]
  )

  if (stateEl) return stateEl

  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
  const sharedFrameProps = resolvePhysicsFrameSharedProps(
    props,
    frameProps,
    semanticItems,
    {
      chartMode,
      className: modeClassName,
      title: modeTitle,
      description: modeDescription,
      summary: modeSummary,
      accessibleTable: modeAccessibleTable,
      enableHover: modeEnableHover,
      margin: modeMargin
    }
  )
  const projectionOverlay = showProjection ? (
    <GauntletProjectionOverlay states={states} layout={layout} />
  ) : undefined
  const backgroundGraphics = composePhysicsFrameGraphics(
    showChrome ? <GauntletChrome layout={layout} states={states} /> : undefined,
    frameProps.backgroundGraphics
  )
  const foregroundGraphics = composePhysicsFrameGraphics(
    projectionOverlay,
    frameProps.foregroundGraphics
  )
  const beforePaint = (ctx: CanvasRenderingContext2D, bodies: PhysicsBodyState[]) => {
    frameProps.beforePaint?.(ctx, bodies)
    if (showTethers) drawTethers(ctx, bodies)
  }
  const renderBody = frameProps.renderBody ?? drawGauntletBody
  const tooltipContent = tooltipProps.tooltipContent ?? ((hover: PhysicsHoverData) => {
    const datum = hover.data as GauntletBodyDatum | undefined
    if (!datum?.__gauntlet) return null
    const sourceLabel =
      typeof datum.sourceDatum?.label === "string"
        ? datum.sourceDatum.label
        : datum.projectId
    return (
      <div
        className="semiotic-tooltip"
        style={{
          background: "var(--semiotic-tooltip-bg, rgba(15, 23, 42, 0.94))",
          color: "var(--semiotic-tooltip-text, #f8fafc)",
          padding: "8px 12px",
          borderRadius: 6,
          boxShadow: "var(--semiotic-tooltip-shadow, 0 8px 24px rgba(0,0,0,0.35))",
          maxWidth: 280
        }}
      >
        <strong>{datum.kind === CORE_KIND ? sourceLabel : propertyLabel(datum.property)}</strong>
        <div>{datum.kind === POSITIVE_KIND ? "Positive property" : datum.kind === NEGATIVE_KIND ? "Negative property" : "Project core"}</div>
      </div>
    )
  })

  return renderPhysicsFrame(
    "GauntletChart",
    chartSize,
    <StreamPhysicsFrame
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      key={`${chartSize[0]}x${chartSize[1]}:${dataKey}`}
      ref={frameRef}
      accessibleTable={props.accessibleTable ?? frameProps.accessibleTable}
      backgroundGraphics={backgroundGraphics}
      bodyForces={bodyForces}
      bodySemanticItems={(frameProps.bodySemanticItems as PhysicsBodySemanticItemAccessor | undefined) ?? gauntletSemanticItem}
      bodyStyle={bodyStyle}
      beforePaint={beforePaint}
      onClick={onClick ? gauntletOnClick : sharedFrameProps.onClick}
      config={{
        fixedDt: 1 / 60,
        maxSubsteps: 8,
        kernel: {
          gravity: { x: 0, y: 0 },
          restitution: 0.16,
          friction: 0.44,
          velocityDamping: 0.982,
          maxVelocity: 520,
          sleepAfter: 0.8,
          sleepSpeed: 7,
          ...(frameProps.config?.kernel ?? {})
        },
        colliders: [
          ...gauntletWallColliders(layout),
          ...(frameProps.config?.colliders ?? [])
        ]
      }}
      controllers={combinedControllers}
      enableHover={tooltipProps.enableHover ?? true}
      foregroundGraphics={foregroundGraphics}
      hoverRadius={props.hoverRadius ?? frameProps.hoverRadius ?? 18}
      initialSpawns={initialSpawns}
      initialSpawnPacing={initialSpawnPacing}
      onBodyPointerDown={handlePointerDown}
      onTick={onTick}
      paused={paused}
      regionEffects={[...gateRegionEffects, ...(frameProps.regionEffects ?? [])]}
      renderBody={renderBody}
      responsiveHeight={responsiveHeight}
      responsiveWidth={responsiveWidth}
      size={chartSize}
      tooltipContent={tooltipContent}
    />
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(
    props: GauntletChartProps<TDatum> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}
;(GauntletChart as { displayName?: string }).displayName = "GauntletChart"

/**
 * @deprecated Typo alias of {@link GauntletChart}. Use `GauntletChart` instead.
 * Removed in the next major version.
 */
export const GuantletChart = GauntletChart
export default GauntletChart
