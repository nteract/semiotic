"use client"

import * as React from "react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import type { Style } from "../../stream/types"
import StreamPhysicsFrame, {
  type PhysicsBodySemanticItemAccessor,
  type PhysicsBodyStyleContext,
  type StreamPhysicsBodyForceContext,
  type StreamPhysicsFrameHandle,
  type StreamPhysicsFrameProps,
  type StreamPhysicsRegionEffect
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type { CapacityQueueSnapshot } from "../../stream/physics/PhysicsControllers"
import type {
  PhysicsPipelineControlSurface,
  PhysicsPipelineTickResult
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
  buildLayout,
  buildProjectSpawns,
  createInitialState,
  defaultViability,
  gauntletWallColliders,
  readAccessor,
  resolvePlacement,
  type GauntletBodyDatum,
  type GauntletEffect,
  type GauntletProjectState,
  type GauntletPropertyDefinition
} from "./gauntletPhysics"
import {
  buildGauntletCapacityControllers,
  buildGauntletImperativeHandle,
  capacitySnapshotsEqual,
  runGauntletTick
} from "./gauntletController"
import {
  computeGauntletBodyForce,
  spawnBodiesForGauntletEffect
} from "./gauntletRuntime"
import {
  defaultGauntletTooltipContent,
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
  buildGauntletPhysics
} from "./gauntletPhysics"
export {
  applyGauntletEffect,
  planGauntletPropertyWork,
  replaceGauntletNegative
} from "./gauntletEffects"
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
  ref: React.Ref<PhysicsFrameHandle>
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
      buildGauntletCapacityControllers({
        dataKey,
        gates: layout.gates,
        statesRef,
        processedGateVisitsRef
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
    () =>
      buildGauntletImperativeHandle({
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
      runGauntletTick(result, controls, {
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
      })
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
  const tooltipContent = tooltipProps.tooltipContent ?? defaultGauntletTooltipContent

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
      React.RefAttributes<PhysicsFrameHandle>
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
