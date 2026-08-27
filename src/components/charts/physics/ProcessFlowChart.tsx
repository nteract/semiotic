"use client"

import * as React from "react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import StreamPhysicsFrame, {
  type PhysicsBodyStyleContext,
  type PhysicsSemanticItem,
  type StreamPhysicsFrameHandle,
  type StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import {
  createCapacityQueueController,
  type CapacityQueueSnapshot,
  type PhysicsController
} from "../../stream/physics/PhysicsControllers"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"
import type { ProcessChromeOptions } from "../../recipes/processChrome"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { filterSparseArray } from "../shared/sparseArray"
import { physicsProcessGroupSemanticItems } from "./physicsProcessPrimitives"
import {
  buildProcessFlowPhysics,
  physicsChartArea,
  projectionRowsToSemanticItems,
  styleFromColorAccessor,
  type ProcessFlowPhysicsOptions,
  type ProcessFlowProjectionMetadata,
  type ProcessFlowStageDef
} from "./physicsChartUtils"
import {
  usePhysicsHocHandle,
  type PhysicsFrameHandle
} from "./physicsHocHandle"
import {
  composePhysicsFrameGraphics,
  renderPhysicsChartState,
  renderPhysicsFrame,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsTooltipProps,
  type PhysicsHocFrameProps,
  type PhysicsRerunMS,
  type PhysicsSharedChartProps,
  type TooltipProp,
  usePhysicsChartMode,
  usePhysicsRerun,
  usePhysicsSelection
} from "./physicsHocUtils"
import {
  processFlowChrome,
  processFlowProjectionOverlay
} from "./processFlowOverlays"

export type { ProcessFlowStageDef, ProcessFlowProjectionMetadata }

export interface ProcessFlowChartProps<TDatum extends Datum = Datum>
  extends
    Omit<BaseChartProps, "margin" | "selection">,
    PhysicsSharedChartProps {
  data?: TDatum[]
  size?: [number, number]
  stages: readonly ProcessFlowStageDef[]
  idAccessor?: ChartAccessor<TDatum, string>
  stageAccessor?: ChartAccessor<TDatum, string>
  groupBy?: ChartAccessor<TDatum, string>
  groupLabelAccessor?: ChartAccessor<TDatum, string>
  workAccessor?: ChartAccessor<TDatum, number>
  radiusAccessor?: ChartAccessor<TDatum, number>
  ballRadius?: number
  colorBy?: ChartAccessor<TDatum, string>
  seed?: number
  route?: "horizontal"
  groupCompletion?: "allAbsorbed" | "none"
  groupAnchorAlong?: number
  showProjection?: boolean
  showChrome?: boolean
  /** Options for the default processChrome overlay (stage bays, badges, sockets). */
  chromeOptions?: ProcessChromeOptions
  settle?: boolean
  gravityX?: number
  gravityY?: number
  springStiffness?: number
  springDamping?: number
  tooltip?: TooltipProp
  paused?: boolean
  /**
   * Replay the seeded simulation this many milliseconds after it settles.
   * Omit or pass `null` for a single run; `0` replays on the next timer turn.
   */
  rerunMS?: PhysicsRerunMS
  initialSpawnPacing?: StreamPhysicsFrameProps["initialSpawnPacing"]
  /**
   * When true (default), stages with `capacity` install live FIFO queue
   * controllers that drain work at unitsPerSecond — not just force theater.
   */
  liveCapacity?: boolean
  /** Live capacity metrics callback (queue depth, processed count per region). */
  onCapacityChange?: (stats: CapacityQueueSnapshot[]) => void
  /**
   * Soft body budget: caps live bodies via pipeline bodyLimit (evict oldest).
   * Use for infinite/long streams with sediment-style history in the readout.
   */
  bodyLimit?: number
  /** Mark kind for all bodies, or read per-row from datum.__physicsMark / mark. */
  bodyMark?: "circle" | "halo" | "faceted" | "pill" | "diamond" | "square"
  /** Frame passthrough; HOC-owned `config` is merged after the built pipeline config. */
  frameProps?: PhysicsHocFrameProps
}

/**
 * Capacity controllers expose a coarse metricRevision (default 4 Hz), so
 * callbacks can receive live work/age/utilization without rerendering at RAF
 * frequency. Discrete queue changes also advance the revision immediately.
 */
function capacitySnapshotsEqual(
  a: Record<string, CapacityQueueSnapshot>,
  b: Record<string, CapacityQueueSnapshot>
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    const prev = a[key]
    const next = b[key]
    if (!next) return false
    if (
      prev.queueDepth !== next.queueDepth ||
      prev.blockedDepth !== next.blockedDepth ||
      prev.processedCount !== next.processedCount ||
      prev.unitsPerSecond !== next.unitsPerSecond ||
      prev.regionId !== next.regionId ||
      prev.metricRevision !== next.metricRevision
    ) {
      return false
    }
  }
  return true
}

/**
 * Physics-backed multi-body process flow: work items move through capacitated
 * stages with optional feature groups that complete only when every member is
 * absorbed (the merge-pressure / review-queue pattern).
 *
 * @example
 * ```tsx
 * <ProcessFlowChart
 *   data={prs}
 *   idAccessor="id"
 *   stageAccessor="status"
 *   groupBy="featureId"
 *   stages={[
 *     { id: "coding", label: "Coding", force: 14 },
 *     { id: "review", label: "Review", capacity: { unitsPerSecond: 4 }, pressure: true },
 *     { id: "merged", label: "Merged", absorb: true },
 *   ]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Push-only: omit data, stream work items live through the capacity lane.
 * const ref = useRef()
 * <ProcessFlowChart
 *   ref={ref}
 *   stages={[
 *     { id: "triage", label: "Triage", force: 10 },
 *     { id: "review", label: "Review", capacity: { unitsPerSecond: 3 } },
 *     { id: "done", label: "Done", absorb: true },
 *   ]}
 *   stageAccessor="stage"
 *   liveCapacity
 * />
 * ref.current?.push({ id: "pr-42", stage: "review", work: 2 })
 * ```
 */
export const ProcessFlowChart = forwardRef(function ProcessFlowChart<
  TDatum extends Datum = Datum
>(props: ProcessFlowChartProps<TDatum>, ref: React.Ref<PhysicsFrameHandle>) {
  const {
    ballRadius = 6,
    chromeOptions,
    colorBy,
    data,
    emptyContent,
    frameProps = {},
    groupAnchorAlong,
    groupBy,
    groupCompletion,
    groupLabelAccessor,
    gravityX,
    gravityY,
    idAccessor,
    initialSpawnPacing,
    liveCapacity = true,
    onCapacityChange,
    selection,
    bodyLimit,
    bodyMark,
    loading,
    loadingContent,
    paused,
    radiusAccessor,
    rerunMS,
    route = "horizontal",
    seed = 1,
    settle,
    springDamping,
    springStiffness,
    stageAccessor = "stage" as ChartAccessor<TDatum, string>,
    stages,
    workAccessor
  } = props

  const layoutMode = usePhysicsChartMode(props, [900, 420])
  const {
    chartSize,
    showProjection,
    showChrome,
    className,
    title: modeTitle,
    chartMode,
    margin: modeMargin,
    enableHover: modeEnableHover,
    description: modeDescription,
    summary: modeSummary,
    accessibleTable: modeAccessibleTable
  } = layoutMode
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const safeData = useMemo(
    () => filterSparseArray(data ?? []) as TDatum[],
    [data]
  )

  const builderOptions = useMemo(
    (): ProcessFlowPhysicsOptions<TDatum> => ({
      data: safeData,
      stages,
      size: chartSize,
      idAccessor,
      stageAccessor,
      groupBy,
      groupLabelAccessor,
      workAccessor,
      radiusAccessor,
      ballRadius,
      seed,
      route,
      groupCompletion,
      groupAnchorAlong,
      springStiffness,
      springDamping,
      gravityX,
      gravityY,
      settle
    }),
    [
      ballRadius,
      chartSize,
      gravityX,
      gravityY,
      groupAnchorAlong,
      groupBy,
      groupCompletion,
      groupLabelAccessor,
      idAccessor,
      radiusAccessor,
      route,
      safeData,
      seed,
      settle,
      springDamping,
      springStiffness,
      stageAccessor,
      stages,
      workAccessor
    ]
  )

  const layout = useMemo(
    () => buildProcessFlowPhysics(builderOptions),
    [builderOptions]
  )
  const metadata = layout.metadata as ProcessFlowProjectionMetadata | undefined

  const spawnDatum = useCallback(
    (datum: Datum, index: number) => {
      const single = buildProcessFlowPhysics({
        ...builderOptions,
        data: [datum as TDatum],
        seed: seed + index + 1,
        settle: true
      })
      const spawn = single.initialSpawns[0] ?? {
        id: String(datum.id ?? `process-flow-push-${index}`),
        x: physicsChartArea(chartSize).plot.x,
        y: physicsChartArea(chartSize).plot.y,
        mass: 1,
        shape: { type: "circle" as const, radius: ballRadius },
        datum
      }
      return {
        datumId: String(datum.id ?? spawn.id),
        spawns: [spawn as PhysicsQueuedSpawn]
      }
    },
    [ballRadius, builderOptions, chartSize, seed]
  )
  usePhysicsHocHandle(ref, {
    frameRef,
    spawnDatum,
    seedRows: safeData as Datum[],
    seedSpawns: layout.initialSpawns
  })

  const bodyStyle = useMemo(
    () =>
      styleFromColorAccessor(
        colorBy as ChartAccessor<Datum, string> | undefined
      ),
    [colorBy]
  )

  const capacityControllers = useMemo((): PhysicsController[] | undefined => {
    if (!liveCapacity) {
      return frameProps.controllers as PhysicsController[] | undefined
    }
    const built = stages
      .filter((stage) => stage.capacity && stage.capacity.unitsPerSecond > 0)
      .map((stage) => {
        const units = stage.capacity!.unitsPerSecond
        return createCapacityQueueController({
          id: `process-capacity-${stage.id}`,
          regionId: `process-stage-${stage.id}`,
          unitsPerSecond: units,
          unitAccessor:
            stage.capacity!.unitAccessor ??
            (workAccessor
              ? typeof workAccessor === "string"
                ? workAccessor
                : (body) => {
                    const datum = body.datum as TDatum | undefined
                    if (!datum) return 1
                    try {
                      return Number(workAccessor(datum, 0)) || 1
                    } catch {
                      return 1
                    }
                  }
              : "work"),
          releaseImpulse: {
            x: 70 + Math.min(40, units * 2),
            y: 0
          },
          queueLayout: "lane",
          continuous: true
        })
      })
    const extras = frameProps.controllers ?? []
    const merged = [...built, ...extras]
    return merged.length ? merged : undefined
  }, [frameProps.controllers, liveCapacity, stages, workAccessor])

  const [capacityStats, setCapacityStats] = useState<
    Record<string, CapacityQueueSnapshot>
  >({})
  const capacityControllersRef = useRef(capacityControllers)
  capacityControllersRef.current = capacityControllers
  const frameOnTickRef = useRef(frameProps.onTick)
  frameOnTickRef.current = frameProps.onTick
  // Skip React capacity updates when nothing reads them (no chrome badges, no callback).
  const trackCapacity = showChrome !== false || onCapacityChange != null

  useEffect(() => {
    if (!onCapacityChange) return
    const list = Object.values(capacityStats)
    if (list.length) onCapacityChange(list)
  }, [capacityStats, onCapacityChange])

  const handleTick = useCallback<
    NonNullable<StreamPhysicsFrameProps["onTick"]>
  >(
    (result, controls) => {
      frameOnTickRef.current?.(result, controls)
      if (!trackCapacity) return
      const controllers = capacityControllersRef.current
      if (!controllers?.length) return
      const next: Record<string, CapacityQueueSnapshot> = {}
      for (const controller of controllers) {
        const snap = controller.getSnapshot?.() as
          CapacityQueueSnapshot | undefined
        if (snap && typeof snap.regionId === "string") {
          next[snap.regionId] = snap
        }
      }
      setCapacityStats((prev) =>
        capacitySnapshotsEqual(prev, next) ? prev : next
      )
    },
    [trackCapacity]
  )

  const resolvedBodyStyle = useMemo(() => {
    const base = bodyStyle
    const frameStyle = frameProps.bodyStyle
    if (!bodyMark && !frameStyle) return base
    return (body: PhysicsBodyState, ctx: PhysicsBodyStyleContext) => {
      const fromFrame =
        typeof frameStyle === "function" ? frameStyle(body, ctx) : frameStyle
      const fromBase = typeof base === "function" ? base(body) : base
      return {
        ...fromBase,
        ...fromFrame,
        mark:
          (fromFrame as { mark?: string } | undefined)?.mark ??
          (body.datum as { __physicsMark?: string; mark?: string } | undefined)
            ?.__physicsMark ??
          (body.datum as { mark?: string } | undefined)?.mark ??
          bodyMark
      }
    }
  }, [bodyMark, bodyStyle, frameProps.bodyStyle])

  const resolvedConfig = useMemo(
    () => ({
      ...layout.config,
      ...(bodyLimit != null ? { bodyLimit, eviction: "oldest" as const } : {}),
      ...frameProps.config
    }),
    [bodyLimit, frameProps.config, layout.config]
  )
  const rerun = usePhysicsRerun(
    resolvedConfig,
    rerunMS,
    paused,
    undefined,
    props.onSimulationStateChange
  )

  const { selection: bodySelection, onBodyHover } = usePhysicsSelection({
    selection,
    linkedHover: props.linkedHover,
    colorBy,
    chartType: "ProcessFlowChart",
    chartId: props.chartId,
    onObservation: props.onObservation,
    onClick: props.onClick,
    onBodyHover: frameProps?.onBodyHover,
    fallbackFields:
      typeof stageAccessor === "string" ? [stageAccessor] : undefined
  })

  const stateEl = renderPhysicsChartState({
    data,
    emptyContent,
    loading,
    loadingContent,
    size: chartSize
  })
  if (stateEl) return stateEl

  if (!stages?.length) {
    return renderPhysicsFrame(
      "ProcessFlowChart",
      chartSize,
      <div
        role="status"
        style={{
          width: chartSize[0],
          height: chartSize[1],
          display: "grid",
          placeItems: "center",
          color: "var(--semiotic-text-secondary, #64748b)"
        }}
      >
        ProcessFlowChart requires a non-empty stages array.
      </div>,
      layoutMode
    )
  }

  const chrome = processFlowChrome(
    metadata,
    showChrome,
    capacityStats,
    chromeOptions
  )
  const projectionOverlay = processFlowProjectionOverlay(
    layout.projectionRows,
    metadata,
    showProjection
  )
  const stageSemanticItems = projectionRowsToSemanticItems(
    layout.projectionRows,
    chartSize,
    "stage"
  )
  const groupSemanticItems = physicsProcessGroupSemanticItems(
    metadata?.groups ?? []
  )
  const semanticItems: PhysicsSemanticItem[] = [
    ...stageSemanticItems,
    ...groupSemanticItems
  ]

  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
  const sharedFrameProps = resolvePhysicsFrameSharedProps(
    props,
    frameProps,
    semanticItems,
    {
      chartMode,
      className,
      title: modeTitle,
      description: modeDescription,
      summary: modeSummary,
      accessibleTable: modeAccessibleTable,
      enableHover: modeEnableHover,
      margin: modeMargin
    }
  )
  const regionEffects = [
    ...(metadata?.regionEffects ?? []),
    ...(frameProps.regionEffects ?? [])
  ]

  return renderPhysicsFrame(
    "ProcessFlowChart",
    chartSize,
    <StreamPhysicsFrame
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      key={`${chartSize[0]}x${chartSize[1]}:${rerun.rerunKey}`}
      ref={frameRef}
      onBodyHover={onBodyHover}
      controllers={capacityControllers}
      regionEffects={regionEffects}
      selection={bodySelection ?? frameProps.selection}
      backgroundGraphics={composePhysicsFrameGraphics(
        chrome,
        frameProps.backgroundGraphics
      )}
      foregroundGraphics={composePhysicsFrameGraphics(
        projectionOverlay,
        frameProps.foregroundGraphics
      )}
      initialSpawns={layout.initialSpawns}
      initialSpawnPacing={initialSpawnPacing ?? layout.initialSpawnPacing}
      onTick={handleTick}
      paused={paused}
      responsiveHeight={false}
      responsiveWidth={false}
      size={chartSize}
      bodyStyle={resolvedBodyStyle}
      config={rerun.config}
    />,
    layoutMode
  )
})

;(ProcessFlowChart as { displayName?: string }).displayName = "ProcessFlowChart"

export default ProcessFlowChart
