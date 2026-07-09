"use client"

import * as React from "react"
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import StreamPhysicsFrame, {
  type PhysicsBodySelection,
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
import { processChrome } from "../../recipes/processChrome"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { filterSparseArray } from "../shared/sparseArray"
import {
  physicsProcessGroupSemanticItems
} from "./physicsProcessPrimitives"
import {
  buildProcessFlowPhysics,
  physicsChartArea,
  projectionRowsToSemanticItems,
  styleFromColorAccessor,
  type ProcessFlowPhysicsOptions,
  type ProcessFlowProjectionMetadata,
  type ProcessFlowStageDef
} from "./physicsChartUtils"
import { usePhysicsHocHandle } from "./physicsHocHandle"
import {
  composePhysicsFrameGraphics,
  renderPhysicsChartState,
  renderPhysicsFrame,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsTooltipProps,
  type PhysicsHocFrameProps,
  type PhysicsSharedChartProps,
  type TooltipProp,
  usePhysicsChartMode
} from "./physicsHocUtils"

export type { ProcessFlowStageDef, ProcessFlowProjectionMetadata }

export interface ProcessFlowChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "margin" | "selection">,
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
  settle?: boolean
  gravityX?: number
  gravityY?: number
  springStiffness?: number
  springDamping?: number
  tooltip?: TooltipProp
  paused?: boolean
  initialSpawnPacing?: StreamPhysicsFrameProps["initialSpawnPacing"]
  /**
   * When true (default), stages with `capacity` install live FIFO queue
   * controllers that drain work at unitsPerSecond — not just force theater.
   */
  liveCapacity?: boolean
  /** Live capacity metrics callback (queue depth, processed count per region). */
  onCapacityChange?: (stats: CapacityQueueSnapshot[]) => void
  /** Shared selection (process body restyle without relayout). */
  selection?: PhysicsBodySelection | null
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
 * Equality for capacity chrome/callback re-renders. Compares discrete
 * display fields only — remainingWork drifts every tick and would force
 * React updates at frame rate without changing queueDepth badges.
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
      prev.processedCount !== next.processedCount ||
      prev.unitsPerSecond !== next.unitsPerSecond ||
      prev.regionId !== next.regionId
    ) {
      return false
    }
  }
  return true
}

function processFlowChrome(
  metadata: ProcessFlowProjectionMetadata | undefined,
  enabled: boolean | undefined,
  capacityByRegion: Record<string, CapacityQueueSnapshot> = {}
): StreamPhysicsFrameProps["backgroundGraphics"] | undefined {
  if (enabled === false || !metadata) return undefined
  const { volume, stages, groups, groupCompletion } = metadata
  const bandById = new Map(volume.stages.map((s) => [s.id, s]))
  const completionById = new Map(groupCompletion.map((row) => [row.id, row]))
  return ({ size }) => {
    const w = Number(size[0]) || volume.width
    const h = Number(size[1]) || volume.height
    const chromeStages = stages.map((stage) => {
      const band = bandById.get(stage.id)
      const cap = capacityByRegion[`process-stage-${stage.id}`]
      return {
        id: stage.id,
        label: stage.label,
        x0: band?.x0 ?? stage.x - stage.width / 2,
        x1: (band?.x0 ?? stage.x - stage.width / 2) + (band?.width ?? stage.width),
        x: stage.x,
        width: band?.width ?? stage.width,
        count: stage.count,
        capacity: stage.capacity,
        absorb: stage.absorb,
        portalTarget: stage.portalTarget,
        queueDepth: cap?.queueDepth,
        processed: cap?.processedCount
      }
    })
    const chromeGroups = groups.map((group) => {
      const completion = completionById.get(group.id)
      return {
        id: group.id,
        label: group.label ?? group.id,
        x: group.anchor?.x ?? group.x ?? 0,
        y: group.anchor?.y ?? group.y ?? 0,
        absorbed: completion?.absorbed,
        total: completion?.total,
        complete: completion?.complete
      }
    })
    return processChrome(
      {
        width: w,
        height: h,
        left: volume.left,
        right: volume.right,
        topY: volume.topY,
        bottomY: volume.bottomY,
        midY: volume.midY,
        stages: chromeStages,
        groups: chromeGroups
      },
      { showCapacityBadges: true, showGroupSockets: true }
    )
  }
}

function processFlowProjectionOverlay(
  rows: Array<{ label: string; value: number }>,
  metadata: ProcessFlowProjectionMetadata | undefined,
  enabled: boolean | undefined
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  if (enabled === false || !metadata || rows.length === 0) return undefined
  const bandById = new Map(metadata.volume.stages.map((s) => [s.id, s]))
  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || metadata.volume.width,
      Number(size[1]) || metadata.volume.height
    ]
    const area = physicsChartArea(resolvedSize)
    const maxValue = Math.max(1, ...rows.map((row) => row.value))
    const barMaxH = Math.min(48, area.plot.height * 0.18)
    const yBase = area.plot.y + 6

    return (
      <svg
        aria-hidden="true"
        data-testid="process-flow-projection-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {metadata.stages.map((stage, index) => {
          const row = rows[index]
          if (!row) return null
          const band = bandById.get(stage.id)
          if (!band) return null
          const h = Math.max(2, (row.value / maxValue) * barMaxH)
          const barW = Math.max(8, band.width * 0.35)
          return (
            <rect
              key={stage.id}
              x={band.x - barW / 2}
              y={yBase}
              width={barW}
              height={h}
              rx={2}
              fill="var(--semiotic-primary, #4e79a7)"
              fillOpacity={0.18}
              stroke="var(--semiotic-primary, #4e79a7)"
              strokeOpacity={0.45}
              strokeWidth={1}
            />
          )
        })}
      </svg>
    )
  }
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
 */
export const ProcessFlowChart = forwardRef(function ProcessFlowChart<
  TDatum extends Datum = Datum
>(props: ProcessFlowChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const {
    ballRadius = 6,
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
    responsiveHeight,
    responsiveWidth,
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
    () => styleFromColorAccessor(colorBy as ChartAccessor<Datum, string> | undefined),
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
  >((result, controls) => {
    frameOnTickRef.current?.(result, controls)
    if (!trackCapacity) return
    const controllers = capacityControllersRef.current
    if (!controllers?.length) return
    const next: Record<string, CapacityQueueSnapshot> = {}
    for (const controller of controllers) {
      const snap = controller.getSnapshot?.() as CapacityQueueSnapshot | undefined
      if (snap && typeof snap.regionId === "string") {
        next[snap.regionId] = snap
      }
    }
    setCapacityStats((prev) =>
      capacitySnapshotsEqual(prev, next) ? prev : next
    )
  }, [trackCapacity])

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
      </div>
    )
  }

  const chrome = processFlowChrome(metadata, showChrome, capacityStats)
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
      ref={frameRef}
      controllers={capacityControllers}
      regionEffects={regionEffects}
      selection={selection ?? frameProps.selection}
      backgroundGraphics={composePhysicsFrameGraphics(
        chrome,
        frameProps.backgroundGraphics
      )}
      foregroundGraphics={composePhysicsFrameGraphics(
        projectionOverlay,
        frameProps.foregroundGraphics
      )}
      initialSpawns={layout.initialSpawns}
      initialSpawnPacing={
        initialSpawnPacing ?? layout.initialSpawnPacing
      }
      onTick={handleTick}
      paused={paused}
      responsiveHeight={responsiveHeight}
      responsiveWidth={responsiveWidth}
      size={chartSize}
      bodyStyle={resolvedBodyStyle}
      config={{
        ...layout.config,
        ...(bodyLimit != null ? { bodyLimit, eviction: "oldest" as const } : {}),
        ...frameProps.config
      }}
    />
  )
})

;(ProcessFlowChart as { displayName?: string }).displayName = "ProcessFlowChart"

export default ProcessFlowChart
