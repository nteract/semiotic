"use client"

import * as React from "react"
import { forwardRef, useCallback, useMemo, useRef } from "react"
import StreamPhysicsFrame, {
  type PhysicsSemanticItem,
  type StreamPhysicsFrameHandle
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import {
  buildCollisionSwarmPhysics,
  composePhysicsBodyStyle,
  physicsChartArea,
  styleFromColorAccessor,
  type CollisionSwarmProjectionMetadata
} from "./physicsChartUtils"
import type { StyleRule } from "../shared/styleRules"
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
  usePhysicsChartMode,
  usePhysicsRerun,
  usePhysicsSelection,
  type PhysicsHocFrameProps,
  type PhysicsRerunMS,
  type PhysicsSharedChartProps,
  type TooltipProp
} from "./physicsHocUtils"
import { collisionSwarmProjectionOverlay } from "./physicsProjectionOverlays"

export interface CollisionSwarmChartProps<TDatum extends Datum = Datum>
  extends
    Omit<BaseChartProps, "margin" | "selection">,
    PhysicsSharedChartProps {
  data?: TDatum[]
  size?: [number, number]
  xAccessor?: ChartAccessor<TDatum, number>
  groupAccessor?: ChartAccessor<TDatum, string>
  radiusAccessor?: ChartAccessor<TDatum, number>
  pointRadius?: number
  colorBy?: ChartAccessor<TDatum, string>
  /**
   * Declarative, threshold-aware dot styling. Ordered `{ when, style }` rules;
   * last applicable rule wins. `ctx` = `{ value, category }` (value = the
   * `xAccessor` position). A rule `fill` may be a color or a HatchFill.
   */
  styleRules?: StyleRule[]
  seed?: number
  xExtent?: [number, number]
  collisionIterations?: number
  settle?: boolean
  /**
   * Replay the seeded simulation this many milliseconds after it settles.
   * Omit or pass `null` for a single run; `0` replays on the next timer turn.
   */
  rerunMS?: PhysicsRerunMS
  showProjection?: boolean
  tooltip?: TooltipProp
  paused?: boolean
  frameProps?: PhysicsHocFrameProps<"config">
}

function collisionSwarmSemanticItems(
  metadata: CollisionSwarmProjectionMetadata | undefined
): PhysicsSemanticItem[] {
  if (!metadata) return []
  const width = Math.max(24, metadata.xRange[1] - metadata.xRange[0])
  const x = metadata.xRange[0] + width / 2
  return metadata.groups.map((group) => {
    const label = `${group.label} lane: ${group.count} points`
    return {
      id: `collision-swarm-${group.label}`,
      label,
      description: label,
      datum: group,
      x,
      y: group.y,
      shape: "rect" as const,
      width,
      height: 28,
      group: "lane"
    }
  })
}

/**
 * Physics-backed collision swarm chart that preserves a quantitative x position while separating overlapping bodies.
 *
 * @example
 * ```tsx
 * <CollisionSwarmChart
 *   data={[{ id: "a", x: 12, group: "East" }, { id: "b", x: 14, group: "East" }]}
 *   xAccessor="x"
 *   groupAccessor="group"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <CollisionSwarmChart
 *   data={samples}
 *   xAccessor={(d) => d.score}
 *   radiusAccessor="weight"
 *   collisionIterations={180}
 *   settle
 * />
 * ```
 */
export const CollisionSwarmChart = forwardRef(function CollisionSwarmChart<
  TDatum extends Datum = Datum
>(props: CollisionSwarmChartProps<TDatum>, ref: React.Ref<PhysicsFrameHandle>) {
  const {
    colorBy,
    styleRules,
    collisionIterations,
    data,
    emptyContent,
    frameProps,
    groupAccessor,
    loading,
    loadingContent,
    paused,
    pointRadius,
    radiusAccessor,
    rerunMS,
    seed = 1,
    settle,
    xAccessor = "x" as ChartAccessor<TDatum, number>,
    xExtent
  } = props
  const layoutMode = usePhysicsChartMode(props, [700, 360])
  const {
    chartSize,
    showProjection,
    className: modeClassName,
    title: modeTitle,
    chartMode,
    margin: modeMargin,
    enableHover: modeEnableHover,
    description: modeDescription,
    summary: modeSummary,
    accessibleTable: modeAccessibleTable
  } = layoutMode
  const resolvedPointRadius =
    pointRadius ??
    (chartMode === "sparkline" ? 2 : chartMode === "context" ? 4 : 5)
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const chartData = useMemo(() => data ?? [], [data])
  const layout = useMemo(
    () =>
      buildCollisionSwarmPhysics({
        data: chartData,
        xAccessor,
        groupAccessor,
        radiusAccessor,
        pointRadius: resolvedPointRadius,
        seed,
        size: chartSize,
        xExtent,
        collisionIterations,
        settle
      }),
    [
      chartData,
      chartSize,
      collisionIterations,
      groupAccessor,
      resolvedPointRadius,
      radiusAccessor,
      seed,
      settle,
      xAccessor,
      xExtent
    ]
  )
  const rerun = usePhysicsRerun(
    layout.config,
    rerunMS,
    paused,
    undefined,
    props.onSimulationStateChange
  )

  const spawnDatum = useCallback(
    (datum: Datum, index: number) => {
      const single = buildCollisionSwarmPhysics({
        data: [datum],
        xAccessor: xAccessor as ChartAccessor<Datum, number>,
        groupAccessor: groupAccessor as
          ChartAccessor<Datum, string> | undefined,
        radiusAccessor: radiusAccessor as
          ChartAccessor<Datum, number> | undefined,
        pointRadius: resolvedPointRadius,
        seed: seed + index + 1,
        size: chartSize,
        xExtent,
        collisionIterations,
        settle
      })
      const spawn = single.initialSpawns[0] ?? {
        id: String(datum.id ?? `collision-swarm-push-${index}`),
        x: physicsChartArea(chartSize).plot.x,
        y: physicsChartArea(chartSize).plot.y,
        mass: 1,
        shape: { type: "circle" as const, radius: resolvedPointRadius },
        datum
      }
      return {
        datumId: String(datum.id ?? spawn.id),
        spawns: [spawn as PhysicsQueuedSpawn]
      }
    },
    [
      chartSize,
      collisionIterations,
      groupAccessor,
      resolvedPointRadius,
      radiusAccessor,
      seed,
      settle,
      xAccessor,
      xExtent
    ]
  )
  usePhysicsHocHandle(ref, {
    frameRef,
    spawnDatum,
    seedRows: chartData as Datum[],
    seedSpawns: layout.initialSpawns
  })

  const resolvedColorBy =
    (colorBy as ChartAccessor<Datum, string> | undefined) ??
    (groupAccessor as ChartAccessor<Datum, string> | undefined)
  const generatedBodyStyle = useMemo(
    () =>
      styleFromColorAccessor(resolvedColorBy, "#4e79a7", {
        styleRules,
        valueAccessor: xAccessor as string | ((d: Datum) => unknown)
      }),
    [resolvedColorBy, styleRules, xAccessor]
  )
  const bodyStyle = useMemo(
    () => composePhysicsBodyStyle(generatedBodyStyle, frameProps?.bodyStyle),
    [generatedBodyStyle, frameProps?.bodyStyle]
  )

  const { selection: bodySelection, onBodyHover } = usePhysicsSelection({
    selection: props.selection,
    linkedHover: props.linkedHover,
    colorBy: resolvedColorBy,
    chartType: "CollisionSwarmChart",
    chartId: props.chartId,
    onObservation: props.onObservation,
    onClick: props.onClick,
    onBodyHover: frameProps?.onBodyHover,
    fallbackFields: typeof xAccessor === "string" ? [xAccessor] : undefined
  })

  const stateEl = renderPhysicsChartState({
    data,
    emptyContent,
    loading,
    loadingContent,
    size: chartSize
  })
  if (stateEl) return stateEl

  const projectionOverlay = collisionSwarmProjectionOverlay(
    layout.metadata as CollisionSwarmProjectionMetadata | undefined,
    showProjection
  )
  const semanticItems = collisionSwarmSemanticItems(
    layout.metadata as CollisionSwarmProjectionMetadata | undefined
  )
  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
  const sharedFrameProps = resolvePhysicsFrameSharedProps(
    props,
    frameProps,
    semanticItems,
    {
      selection: bodySelection,
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
  return renderPhysicsFrame(
    "CollisionSwarmChart",
    chartSize,
    <StreamPhysicsFrame
      key={`${chartSize[0]}x${chartSize[1]}:${rerun.rerunKey}`}
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      ref={frameRef}
      onBodyHover={onBodyHover}
      config={rerun.config}
      foregroundGraphics={composePhysicsFrameGraphics(
        projectionOverlay,
        frameProps?.foregroundGraphics
      )}
      initialSpawns={layout.initialSpawns}
      paused={paused}
      responsiveHeight={false}
      responsiveWidth={false}
      size={chartSize}
      bodyStyle={bodyStyle}
    />,
    layoutMode
  )
})

export default CollisionSwarmChart
