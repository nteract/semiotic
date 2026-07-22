"use client"

import * as React from "react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type { Style } from "../../stream/types"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type {
  PhysicsBodySemanticItemAccessor,
  PhysicsBodyStyleContext,
  StreamPhysicsBodyForceContext,
  StreamPhysicsFrameHandle,
  StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsFrame"
import StreamPhysicsFrame from "../../stream/physics/StreamPhysicsFrame"
import { useReducedMotion } from "../../stream/useMediaPreferences"
import { useWasHydratingFromSSR } from "../../stream/useHydration"
import { useResponsiveSize } from "../../stream/useResponsiveSize"
import { filterSparseArray } from "../shared/sparseArray"
import {
  composePhysicsFrameGraphics,
  renderPhysicsChartState,
  renderPhysicsFrame,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsTooltipProps,
  usePhysicsChartMode,
  usePhysicsRerun
} from "./physicsHocUtils"
import {
  buildCrucibleProjection,
  cloneCrucibleState,
  evaluateCrucibleConservation
} from "./crucibleEffects"
import { compileCruciblePlan, DEFAULT_CRUCIBLE_SIZE } from "./cruciblePhysics"
import {
  advanceCrucibleRuntime,
  computeCrucibleBodyForce,
  crucibleSnapshotTime,
  crucibleStateSpawns,
  crucibleStateTargets,
  nextCruciblePhaseBoundary,
  reconcileCrucibleBodies,
  replayCrucibleRuntime,
  type CrucibleRuntime
} from "./crucibleController"
import {
  CrucibleChrome,
  CrucibleProjectionOverlay,
  CrucibleReplayControls,
  crucibleProjectionSemanticItems,
  defaultCrucibleTooltipContent,
  resolveCrucibleBodyStyle
} from "./crucibleChrome"
import { crucibleBodySemanticItem, drawCrucibleBody, drawCrucibleBonds } from "./crucibleBodyRenderers"
import type {
  CrucibleChartHandle,
  CrucibleChartProps,
  CrucibleColorBy,
  CrucibleControls
} from "./crucibleChartProps"
import type {
  CrucibleBodyDatum,
  CrucibleComponentState,
  CrucibleProjectionSpec,
  CrucibleRunState
} from "./crucibleTypes"

// Public pure API (also consumed by SSR, evidence, and focused tests).
export * from "./crucibleTypes"
export * from "./crucibleProgram"
export {
  applyCrucibleEvent,
  buildCrucibleEvidence,
  buildCrucibleProjection,
  cloneCrucibleState,
  crucibleProjectionRows,
  evaluateCrucibleConservation,
  resolveCrucibleSelector
} from "./crucibleEffects"
export {
  DEFAULT_CRUCIBLE_HEIGHT,
  DEFAULT_CRUCIBLE_OUTLETS,
  DEFAULT_CRUCIBLE_SIZE,
  DEFAULT_CRUCIBLE_WIDTH,
  buildCrucibleInitialSpawns,
  buildCrucibleLayout,
  buildCruciblePhysicsConfig,
  buildCrucibleStateSpawns,
  buildCrucibleTerminalSpawns,
  compileCruciblePlan,
  createInitialCrucibleState,
  crucibleBoundaryColliders,
  crucibleBondId,
  crucibleComponentBodyId,
  crucibleProductBodyId,
  crucibleSemanticKey,
  replayCruciblePlan,
  resolveCrucibleSnapshotAt,
  resolveCrucibleTime
} from "./cruciblePhysics"
export type { CrucibleSelectorResult } from "./crucibleEffects"
export type {
  CrucibleInitialStateResult,
  CrucibleResolvedTime,
  CrucibleSpawnOptions
} from "./cruciblePhysics"
export type {
  CrucibleChartHandle,
  CrucibleChartProps,
  CrucibleColorBy,
  CrucibleControls,
  CrucibleSnapshotAt
} from "./crucibleChartProps"

const PALETTE = [
  "#356b63",
  "#a34b43",
  "#c08b38",
  "#3e5f83",
  "#785b7c",
  "#6e7740",
  "#8f5c3a",
  "#41717b"
]

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function numericSeed(seed: number | string | undefined): number {
  return typeof seed === "number" && Number.isFinite(seed)
    ? seed
    : hashText(String(seed ?? "crucible"))
}

function boundedPlaybackRate(value: unknown): number {
  const rate = Number(value)
  return Number.isFinite(rate) && rate > 0
    ? Math.max(0.05, Math.min(8, rate))
    : 1
}

function resolvedControls(controls: boolean | CrucibleControls | undefined): {
  playPause: boolean
  reset: boolean
  stepPhase: boolean
  timeline: boolean
  speed: boolean
} {
  if (!controls) {
    return {
      playPause: false,
      reset: false,
      stepPhase: false,
      timeline: false,
      speed: false
    }
  }
  if (controls === true) {
    return {
      playPause: true,
      reset: true,
      stepPhase: true,
      timeline: true,
      speed: true
    }
  }
  return {
    playPause: controls.playPause ?? true,
    reset: controls.reset ?? true,
    stepPhase: controls.stepPhase ?? true,
    timeline: controls.timeline ?? true,
    speed: controls.speed ?? false
  }
}

function readColorAccessor<TDatum extends Datum>(
  accessor: ChartAccessor<TDatum, string>,
  datum: TDatum,
  index: number
): string {
  const value =
    typeof accessor === "function" ? accessor(datum, index) : datum[accessor]
  return String(value ?? "unassigned")
}

function colorKeyForComponent<TDatum extends Datum>(
  component: CrucibleComponentState<TDatum>,
  colorBy: CrucibleColorBy<TDatum>,
  index: number
): string {
  if (colorBy === "category") return component.category
  if (colorBy === "status") return component.status
  if (colorBy === "outlet") return component.outletId ?? "in chamber"
  if (colorBy === "product") return component.productIds[0] ?? "unalloyed"
  return readColorAccessor(
    colorBy as ChartAccessor<TDatum, string>,
    component.datum,
    index
  )
}

function colorForKey(key: string): string {
  return PALETTE[hashText(key) % PALETTE.length]
}

function summaryForState<TDatum extends Datum>(
  state: CrucibleRunState<TDatum>,
  amountLabel?: string
): string {
  const components = Object.keys(state.components).length
  const products = Object.keys(state.products).length
  const amount = Object.values(state.products).reduce(
    (sum, product) => sum + product.amount,
    0
  )
  const unit = amountLabel ? ` ${amountLabel}` : " amount"
  const outcome = state.outcome ? ` Outcome: ${state.outcome}.` : ""
  return `${components} source component${components === 1 ? "" : "s"}; ${products} product${products === 1 ? "" : "s"}; ${amount.toLocaleString()}${unit} in products.${outcome}`
}

/**
 * A bounded, deterministic treatment tape for peer components. Authored
 * events own every semantic transition; physics only explains co-presence,
 * agitation, binding, separation, and settling.
 *
 * @example One authored event forms and completes a declared product.
 * ```tsx
 * <CrucibleChart
 *   data={[{ id: "crm", amount: 1 }, { id: "billing", amount: 1 }]}
 *   phases={[{ id: "resolve", duration: 2, motion: "bind" }]}
 *   products={[{ id: "golden-record", outletId: "published" }]}
 *   outlets={[{ id: "published", side: "bottom" }]}
 *   events={[{
 *     id: "publish-record",
 *     at: { phaseId: "resolve", progress: 0.7 },
 *     effects: [{
 *       type: "combine",
 *       sourceIds: ["crm", "billing"],
 *       productId: "golden-record",
 *       complete: true
 *     }]
 *   }]}
 *   idAccessor="id"
 *   amountAccessor="amount"
 * />
 * ```
 *
 * @example Build an explicit lifecycle and replay it without remount state.
 * ```tsx
 * const chartRef = React.createRef<CrucibleChartHandle>()
 * const events = buildCrucibleProductEvents({
 *   productId: "finding",
 *   form: { at: { time: 0.5 }, sourceIds: ["trace", "metric"] },
 *   contributions: [{ at: { time: 1 }, sourceIds: ["experiment"] }],
 *   complete: { at: { time: 1.5 }, outletId: "supported" }
 * })
 *
 * <button onClick={() => chartRef.current?.replay()}>Replay</button>
 * <CrucibleChart
 *   ref={chartRef}
 *   data={evidence}
 *   phases={[{ id: "assay", duration: 2, motion: "mix" }]}
 *   products={[{ id: "finding", outletId: "supported" }]}
 *   outlets={[{ id: "supported", side: "bottom" }]}
 *   events={events}
 * />
 * ```
 */
export const CrucibleChart = forwardRef(function CrucibleChart<
  TDatum extends Datum = Datum
>(
  props: CrucibleChartProps<TDatum>,
  ref: React.Ref<CrucibleChartHandle<TDatum>>
) {
  const {
    amountAccessor,
    amountLabel,
    bodyRadius,
    categoryAccessor,
    colorBy = "category",
    conservation,
    controls,
    data,
    emptyContent,
    events,
    frameProps = {},
    idAccessor,
    initialStateAccessor,
    initialSpawnPacing,
    labelAccessor,
    loading,
    loadingContent,
    metrics,
    metricsAccessor,
    onClick,
    onConservation,
    onCrucibleObservation,
    onDiagnostic,
    onStateChange,
    outlets,
    paused,
    phases,
    playback = "replay",
    playbackRate = 1,
    products,
    projection: projectionProp,
    radiusRange,
    rerunMS,
    responsiveHeight,
    responsiveWidth,
    seed,
    showBonds = true,
    snapshotAt
  } = props
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const reducedMotion = useReducedMotion()
  const wasHydratingFromSSR = useWasHydratingFromSSR()
  const layoutMode = usePhysicsChartMode(props, DEFAULT_CRUCIBLE_SIZE)
  const {
    chartMode,
    chartSize,
    showChrome,
    showProjection,
    className: modeClassName,
    title: modeTitle,
    description: modeDescription,
    summary: modeSummary,
    accessibleTable: modeAccessibleTable,
    enableHover: modeEnableHover,
    margin: modeMargin
  } = layoutMode
  // Crucible owns an extra controls wrapper. Measure that wrapper rather than
  // asking StreamPhysicsFrame to observe its own fixed-width node.
  const [responsiveContainerRef, measuredSize] = useResponsiveSize(
    chartSize,
    responsiveWidth,
    false
  )
  const resolvedWidth = responsiveWidth
    ? Math.max(1, measuredSize[0])
    : chartSize[0]
  const resolvedHeight = chartSize[1]
  const resolvedChartSize = useMemo<[number, number]>(
    () => [resolvedWidth, resolvedHeight],
    [resolvedHeight, resolvedWidth]
  )
  const safeData = useMemo(
    () => filterSparseArray(data ?? []) as TDatum[],
    [data]
  )
  const candidatePlan = useMemo(
    () =>
      compileCruciblePlan({
        data: safeData,
        phases,
        products,
        outlets,
        events,
        idAccessor,
        labelAccessor,
        categoryAccessor,
        amountAccessor,
        metricsAccessor,
        initialStateAccessor,
        metrics,
        size: resolvedChartSize,
        seed,
        bodyRadius,
        radiusRange
      }),
    [
      amountAccessor,
      bodyRadius,
      categoryAccessor,
      events,
      idAccessor,
      initialStateAccessor,
      labelAccessor,
      metrics,
      metricsAccessor,
      outlets,
      phases,
      products,
      radiusRange,
      resolvedChartSize,
      safeData,
      seed
    ]
  )
  const candidateColorKey = Object.values(candidatePlan.initialState.components)
    .map((component, index) => colorKeyForComponent(component, colorBy, index))
    .join("\u0000")
  const visualKey = `${candidatePlan.semanticKey}:${resolvedChartSize[0]}x${resolvedChartSize[1]}:${String(bodyRadius ?? "auto")}:${radiusRange?.join(",") ?? "auto"}:${candidateColorKey}`
  const planRef = useRef(candidatePlan)
  const planKeyRef = useRef(visualKey)
  if (planKeyRef.current !== visualKey) {
    planKeyRef.current = visualKey
    planRef.current = candidatePlan
  }
  const plan = planRef.current
  const snapshotMode =
    playback === "snapshot" || reducedMotion || wasHydratingFromSSR
  const resolvedSnapshotTime = snapshotMode
    ? crucibleSnapshotTime(plan, snapshotAt)
    : 0
  // `playing` is the local play intent. Controlled `paused` gates it without
  // destroying that intent, so paused={true -> false} resumes in place.
  const shouldAutoplay = !snapshotMode
  const initialRuntime = useMemo(
    () =>
      replayCrucibleRuntime(
        plan,
        resolvedSnapshotTime,
        shouldAutoplay && !paused
      ),
    // planKey is semantic; fresh inline arrays with identical content do not reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planKeyRef.current, resolvedSnapshotTime, shouldAutoplay]
  )
  const [runtime, setRuntime] =
    useState<CrucibleRuntime<TDatum>>(initialRuntime)
  const runtimeRef = useRef(runtime)
  const [playing, setPlaying] = useState(shouldAutoplay)
  const playingRef = useRef(playing)
  const [runKey, setRunKey] = useState(0)
  const [internalPlaybackRate, setInternalPlaybackRate] = useState(() =>
    boundedPlaybackRate(playbackRate)
  )
  const stateTargetsRef = useRef(
    crucibleStateTargets(plan, initialRuntime.state, {
      seed,
      bodyRadius,
      radiusRange
    })
  )
  const settledRunRef = useRef("")

  const onStateChangeRef = useRef(onStateChange)
  const onObservationRef = useRef(onCrucibleObservation)
  const onDiagnosticRef = useRef(onDiagnostic)
  const onConservationRef = useRef(onConservation)
  onStateChangeRef.current = onStateChange
  onObservationRef.current = onCrucibleObservation
  onDiagnosticRef.current = onDiagnostic
  onConservationRef.current = onConservation

  const spawnOptionsRef = useRef({
    seed,
    bodyRadius,
    radiusRange
  })
  spawnOptionsRef.current = {
    seed,
    bodyRadius,
    radiusRange
  }

  const commitRuntime = useCallback(
    (next: CrucibleRuntime<TDatum>, emit = false) => {
      runtimeRef.current = next
      stateTargetsRef.current = crucibleStateTargets(
        planRef.current,
        next.state,
        spawnOptionsRef.current
      )
      setRuntime(next)
      if (emit) {
        for (const observation of next.observations) {
          onObservationRef.current?.(observation)
        }
      }
    },
    []
  )

  useEffect(() => {
    setInternalPlaybackRate(boundedPlaybackRate(playbackRate))
  }, [playbackRate])

  useEffect(() => {
    const nextPlaying = !snapshotMode
    const next = replayCrucibleRuntime(
      plan,
      snapshotMode ? resolvedSnapshotTime : 0,
      nextPlaying && !pausedRef.current
    )
    playingRef.current = nextPlaying
    setPlaying(nextPlaying)
    commitRuntime(next)
    // The semantic key intentionally shields this reset from inline-fresh arrays.
  }, [commitRuntime, plan, resolvedSnapshotTime, snapshotMode, visualKey])

  useEffect(() => {
    const current = runtimeRef.current
    const nextPlaying = playingRef.current && !paused && !current.state.complete
    if (current.state.playing === nextPlaying) return
    const next = {
      ...current,
      state: cloneCrucibleState(current.state)
    }
    next.state.playing = nextPlaying
    commitRuntime(next)
  }, [commitRuntime, paused])

  useEffect(() => {
    for (const diagnostic of plan.diagnostics)
      onDiagnosticRef.current?.(diagnostic)
  }, [visualKey, plan.diagnostics])

  useEffect(() => {
    onStateChangeRef.current?.(runtime.state)
    if (conservation) {
      const spec = conservation === true ? {} : conservation
      onConservationRef.current?.(
        evaluateCrucibleConservation(runtime.state, spec)
      )
    }
  }, [conservation, runtime.state])

  const resetRunState = useCallback(() => {
    settledRunRef.current = ""
    const nextPlaying = !snapshotMode
    const next = replayCrucibleRuntime(
      planRef.current,
      0,
      nextPlaying && !paused
    )
    playingRef.current = nextPlaying
    setPlaying(nextPlaying)
    commitRuntime(next)
  }, [commitRuntime, paused, snapshotMode])

  const physicsConfig = useMemo<StreamPhysicsFrameProps["config"]>(
    () => ({
      ...plan.config,
      ...frameProps.config,
      fixedDt: frameProps.config?.fixedDt ?? plan.config.fixedDt,
      maxSubsteps: frameProps.config?.maxSubsteps ?? plan.config.maxSubsteps,
      settleStepLimit:
        frameProps.config?.settleStepLimit ?? plan.config.settleStepLimit,
      timeScale: internalPlaybackRate,
      colliders: [
        ...(plan.config.colliders ?? []),
        ...(frameProps.config?.colliders ?? [])
      ],
      kernel: {
        ...plan.config.kernel,
        ...frameProps.config?.kernel,
        gravity: frameProps.config?.kernel?.gravity ??
          plan.config.kernel?.gravity ?? { x: 0, y: 0 }
      },
      observation: {
        ...plan.config.observation,
        ...frameProps.config?.observation,
        chartType: "CrucibleChart"
      }
    }),
    [frameProps.config, internalPlaybackRate, plan.config]
  )

  const framePaused =
    snapshotMode || Boolean(paused) || (!playing && !runtime.state.complete)
  const rerun = usePhysicsRerun(
    physicsConfig,
    rerunMS,
    framePaused,
    resetRunState
  )
  const reportSettledRun = useCallback(() => {
    if (
      typeof rerunMS !== "number" ||
      !Number.isFinite(rerunMS) ||
      rerunMS < 0
    ) {
      return
    }
    const settledKey = `${visualKey}:${runKey}:${rerun.rerunKey}`
    if (settledRunRef.current === settledKey) return
    settledRunRef.current = settledKey
    // The bounded tape has reached its canonical state and the store has just
    // been synchronously settled. Report that real transition through the
    // shared rerun hook; waiting for passive kernel sleep is unreliable when
    // a chart owns a runtime body-force accessor.
    rerun.config?.observation?.onSimulationStateChange?.("settled", "running")
  }, [rerun.config, rerun.rerunKey, rerunMS, runKey, visualKey])

  const reset = useCallback(() => {
    const next = replayCrucibleRuntime(planRef.current, 0, false)
    playingRef.current = false
    setPlaying(false)
    commitRuntime(next)
    setRunKey((current) => current + 1)
  }, [commitRuntime])

  const settle = useCallback(() => {
    const currentPlan = planRef.current
    const next = advanceCrucibleRuntime(
      currentPlan,
      runtimeRef.current.state,
      currentPlan.duration,
      false
    )
    playingRef.current = false
    setPlaying(false)
    commitRuntime(next, true)
    const spawns = crucibleStateSpawns(
      currentPlan,
      next.state,
      spawnOptionsRef.current
    )
    const frame = frameRef.current
    if (frame) {
      frame.clear()
      frame.pushMany(spawns)
      frame.step(0)
      frame.settle()
    }
    reportSettledRun()
  }, [commitRuntime, reportSettledRun])

  const pause = useCallback(() => {
    playingRef.current = false
    setPlaying(false)
    const next = {
      ...runtimeRef.current,
      state: cloneCrucibleState(runtimeRef.current.state)
    }
    next.state.playing = false
    commitRuntime(next)
  }, [commitRuntime])

  const replay = useCallback(() => {
    settledRunRef.current = ""
    if (snapshotMode) {
      const next = replayCrucibleRuntime(
        planRef.current,
        resolvedSnapshotTime,
        false
      )
      playingRef.current = false
      setPlaying(false)
      commitRuntime(next)
      setRunKey((current) => current + 1)
      return
    }
    const next = replayCrucibleRuntime(planRef.current, 0, !paused)
    playingRef.current = true
    setPlaying(true)
    commitRuntime(next)
    setRunKey((current) => current + 1)
  }, [commitRuntime, paused, resolvedSnapshotTime, snapshotMode])

  const play = useCallback(() => {
    if (snapshotMode) {
      replay()
      return
    }
    if (runtimeRef.current.state.complete) {
      replay()
      return
    }
    playingRef.current = true
    setPlaying(true)
    const next = {
      ...runtimeRef.current,
      state: cloneCrucibleState(runtimeRef.current.state)
    }
    next.state.playing = !paused
    commitRuntime(next)
  }, [commitRuntime, paused, replay, snapshotMode])

  const stepPhase = useCallback(() => {
    const currentPlan = planRef.current
    const target = nextCruciblePhaseBoundary(
      currentPlan,
      runtimeRef.current.state.elapsed
    )
    const next = advanceCrucibleRuntime(
      currentPlan,
      runtimeRef.current.state,
      target,
      false
    )
    playingRef.current = false
    setPlaying(false)
    commitRuntime(next, true)
    const frame = frameRef.current
    if (frame) {
      frame.clear()
      frame.pushMany(
        crucibleStateSpawns(currentPlan, next.state, spawnOptionsRef.current)
      )
      frame.step(0)
    }
  }, [commitRuntime])

  useImperativeHandle(
    ref,
    () => ({
      play,
      pause,
      reset,
      replay,
      stepPhase,
      settle,
      getCrucibleState: () => cloneCrucibleState(runtimeRef.current.state)
    }),
    [pause, play, replay, reset, settle, stepPhase]
  )

  const handleTick = useCallback<
    NonNullable<StreamPhysicsFrameProps["onTick"]>
  >(
    (result, controlsSurface) => {
      frameProps.onTick?.(result, controlsSurface)
      if (snapshotMode || paused || !playingRef.current) return
      const current = runtimeRef.current.state
      const targetTime = Math.min(
        planRef.current.duration,
        result.elapsedSeconds
      )
      if (
        targetTime <= current.elapsed + 0.045 &&
        targetTime < planRef.current.duration
      )
        return
      const next = advanceCrucibleRuntime(
        planRef.current,
        current,
        targetTime,
        targetTime < planRef.current.duration
      )
      const newEvents =
        next.state.eventsApplied.length !== current.eventsApplied.length
      if (newEvents) {
        reconcileCrucibleBodies(
          controlsSurface,
          crucibleStateSpawns(
            planRef.current,
            next.state,
            spawnOptionsRef.current
          )
        )
      }
      if (next.state.complete) {
        playingRef.current = false
        setPlaying(false)
        const terminalSpawns = crucibleStateSpawns(
          planRef.current,
          next.state,
          spawnOptionsRef.current
        )
        controlsSurface.clear()
        controlsSurface.pushMany(terminalSpawns)
        controlsSurface.step(0)
        controlsSurface.settle()
      }
      commitRuntime(next, newEvents)
      if (next.state.complete) reportSettledRun()
    },
    [commitRuntime, frameProps, paused, reportSettledRun, snapshotMode]
  )

  const bodyForces = useCallback(
    ({ body }: StreamPhysicsBodyForceContext) =>
      computeCrucibleBodyForce({
        body,
        plan: planRef.current,
        state: runtimeRef.current.state,
        targets: stateTargetsRef.current
      }),
    []
  )

  const componentIndex = useMemo(
    () =>
      new Map(
        Object.keys(plan.initialState.components).map((id, index) => [
          id,
          index
        ])
      ),
    [plan.initialState.components]
  )
  const bodyFill = useCallback(
    (body: PhysicsBodyState): string => {
      if (props.color) return props.color
      const wrapped = body.datum as CrucibleBodyDatum<TDatum> | undefined
      if (!wrapped?.__crucible) return "var(--semiotic-accent, #b8792d)"
      if (wrapped.kind === "product") {
        const product = runtimeRef.current.state.products[wrapped.semanticId]
        return product?.color ?? colorForKey(product?.id ?? wrapped.semanticId)
      }
      const component = runtimeRef.current.state.components[wrapped.semanticId]
      if (!component) return "var(--semiotic-accent, #356b63)"
      const key = colorKeyForComponent(
        component,
        colorBy,
        componentIndex.get(component.id) ?? 0
      )
      return colorForKey(key)
    },
    [colorBy, componentIndex, props.color]
  )

  const bodyStyle = useCallback(
    (body: PhysicsBodyState, context: PhysicsBodyStyleContext): Style => ({
      ...resolveCrucibleBodyStyle(
        bodyFill(body),
        body,
        context,
        frameProps.bodyStyle
      ),
      ...(props.stroke !== undefined ? { stroke: props.stroke } : null),
      ...(props.strokeWidth !== undefined
        ? { strokeWidth: props.strokeWidth }
        : null),
      ...(props.opacity !== undefined ? { opacity: props.opacity } : null)
    }),
    [
      bodyFill,
      frameProps.bodyStyle,
      props.opacity,
      props.stroke,
      props.strokeWidth
    ]
  )

  const bodySemanticItems = useCallback<PhysicsBodySemanticItemAccessor>(
    (body, context) => {
      const custom =
        typeof frameProps.bodySemanticItems === "function"
          ? frameProps.bodySemanticItems(body, context)
          : undefined
      return custom ?? crucibleBodySemanticItem(body, runtimeRef.current.state)
    },
    [frameProps]
  )

  const handleClick = useCallback<
    NonNullable<StreamPhysicsFrameProps["onClick"]>
  >(
    (datum) => {
      if (!onClick || !datum || typeof datum !== "object") return
      const wrapped = datum as CrucibleBodyDatum<TDatum>
      if (!wrapped.__crucible) return
      const state = runtimeRef.current.state
      const item =
        wrapped.kind === "component"
          ? state.components[wrapped.semanticId]
          : state.products[wrapped.semanticId]
      if (item) onClick(item)
    },
    [onClick]
  )

  const beforePaint = useCallback(
    (ctx: CanvasRenderingContext2D, bodies: PhysicsBodyState[]) => {
      frameProps.beforePaint?.(ctx, bodies)
      if (showBonds) drawCrucibleBonds(ctx, bodies, runtimeRef.current.state)
    },
    [frameProps, showBonds]
  )

  const projection = useMemo<CrucibleProjectionSpec>(
    () =>
      projectionProp ?? {
        groupBy: "outlet",
        measure: "count"
      },
    [projectionProp]
  )
  const projectionRows = useMemo(
    () => buildCrucibleProjection(runtime.state, projection),
    [projection, runtime.state]
  )
  const projectionItems = useMemo(
    () =>
      showProjection
        ? crucibleProjectionSemanticItems(
            projectionRows,
            plan.layout,
            projection,
            amountLabel
          )
        : [],
    [amountLabel, plan.layout, projection, projectionRows, showProjection]
  )
  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
  const sharedFrameProps = resolvePhysicsFrameSharedProps(
    { ...props, onClick: undefined },
    frameProps,
    projectionItems,
    {
      chartMode,
      className: modeClassName,
      title: modeTitle ?? "Crucible",
      description:
        modeDescription ??
        "A bounded inventory is transformed by an authored phase and event tape; physics explains the motion but does not determine the outcome.",
      summary: modeSummary ?? summaryForState(runtime.state, amountLabel),
      accessibleTable: modeAccessibleTable,
      enableHover: modeEnableHover,
      margin: modeMargin
    }
  )
  const backgroundGraphics = composePhysicsFrameGraphics(
    showChrome ? (
      <CrucibleChrome
        layout={plan.layout}
        phases={plan.phases}
        state={runtime.state}
        compact={
          layoutMode.compactMode ||
          resolvedChartSize[0] < 360 ||
          resolvedChartSize[1] < 260
        }
      />
    ) : undefined,
    frameProps.backgroundGraphics
  )
  const foregroundGraphics = composePhysicsFrameGraphics(
    showProjection ? (
      <CrucibleProjectionOverlay
        rows={projectionRows}
        layout={plan.layout}
        projection={projection}
        amountLabel={amountLabel}
      />
    ) : undefined,
    frameProps.foregroundGraphics
  )
  const defaultTooltip = useCallback(
    (
      hover: Parameters<
        NonNullable<StreamPhysicsFrameProps["tooltipContent"]>
      >[0]
    ) => defaultCrucibleTooltipContent(hover, runtimeRef.current.state),
    []
  )
  const initialSpawns = snapshotMode
    ? crucibleStateSpawns(plan, runtime.state, spawnOptionsRef.current)
    : plan.initialSpawns
  const controlConfig = resolvedControls(controls)
  const controlVisible = Object.values(controlConfig).some(Boolean)
  const currentPhase = plan.phases[runtime.state.phaseIndex]
  const stateEl = renderPhysicsChartState({
    data,
    emptyContent,
    loading,
    loadingContent,
    size: resolvedChartSize
  })
  if (stateEl) return stateEl

  const errors = plan.diagnostics.filter((item) => item.severity === "error")
  if (errors.length) {
    return (
      <div
        className={modeClassName}
        role="alert"
        style={{ maxWidth: "100%", width: resolvedChartSize[0] }}
      >
        <strong>CrucibleChart could not compile this treatment tape.</strong>
        <ul>
          {errors.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${index}`}>{diagnostic.message}</li>
          ))}
        </ul>
      </div>
    )
  }

  return renderPhysicsFrame(
    "CrucibleChart",
    resolvedChartSize,
    <div
      ref={responsiveContainerRef}
      className="semiotic-crucible-chart"
      style={{
        maxWidth: "100%",
        overflow: "hidden",
        position: "relative",
        width: responsiveWidth ? "100%" : resolvedChartSize[0]
      }}
    >
      {controlVisible ? (
        <CrucibleReplayControls
          controls={controlConfig}
          duration={plan.duration}
          elapsed={runtime.state.elapsed}
          phaseLabel={currentPhase?.label ?? currentPhase?.id ?? "Complete"}
          playing={playing && !paused}
          complete={runtime.state.complete}
          playbackRate={internalPlaybackRate}
          disabled={snapshotMode}
          onPlayPause={playing ? pause : play}
          onReset={reset}
          onStepPhase={stepPhase}
          onPlaybackRateChange={setInternalPlaybackRate}
        />
      ) : null}
      <StreamPhysicsFrame
        {...frameProps}
        {...tooltipProps}
        {...sharedFrameProps}
        key={`${visualKey}:${runKey}:${rerun.rerunKey}:${snapshotMode ? resolvedSnapshotTime : "replay"}`}
        ref={frameRef}
        accessibleTable={props.accessibleTable ?? frameProps.accessibleTable}
        backgroundGraphics={backgroundGraphics}
        bodyForces={bodyForces}
        bodySemanticItems={bodySemanticItems}
        bodyStyle={bodyStyle}
        beforePaint={beforePaint}
        config={rerun.config}
        continuous={
          !snapshotMode && playing && !paused && !runtime.state.complete
        }
        enableHover={tooltipProps.enableHover ?? modeEnableHover}
        foregroundGraphics={foregroundGraphics}
        hoverRadius={props.hoverRadius ?? frameProps.hoverRadius ?? 18}
        initialSpawns={initialSpawns}
        initialSpawnPacing={initialSpawnPacing}
        onClick={onClick ? handleClick : sharedFrameProps.onClick}
        onTick={handleTick}
        paused={framePaused}
        renderBody={frameProps.renderBody ?? drawCrucibleBody}
        responsiveHeight={responsiveHeight}
        responsiveWidth={false}
        seed={numericSeed(seed)}
        size={resolvedChartSize}
        tooltipContent={tooltipProps.tooltipContent ?? defaultTooltip}
      />
    </div>
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(
    props: CrucibleChartProps<TDatum> &
      React.RefAttributes<CrucibleChartHandle<TDatum>>
  ): React.ReactElement | null
  displayName?: string
}

;(CrucibleChart as { displayName?: string }).displayName = "CrucibleChart"

export default CrucibleChart
