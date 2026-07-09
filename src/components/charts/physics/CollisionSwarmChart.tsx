"use client"

import * as React from "react"
import { forwardRef, useCallback, useMemo, useRef } from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import StreamPhysicsFrame, {
  type PhysicsSemanticItem,
  type StreamPhysicsFrameHandle,
  type StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import {
  buildCollisionSwarmPhysics,
  physicsChartArea,
  styleFromColorAccessor,
  type CollisionSwarmProjectionMetadata
} from "./physicsChartUtils"
import { usePhysicsHocHandle } from "./physicsHocHandle"
import {
  composePhysicsFrameGraphics,
  renderPhysicsChartState,
  renderPhysicsFrame,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsTooltipProps,
  usePhysicsChartMode,
  type PhysicsHocFrameProps,
  type PhysicsSharedChartProps,
  type TooltipProp
} from "./physicsHocUtils"

export interface CollisionSwarmChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "margin">,
    PhysicsSharedChartProps {
  data?: TDatum[]
  size?: [number, number]
  xAccessor?: ChartAccessor<TDatum, number>
  groupAccessor?: ChartAccessor<TDatum, string>
  radiusAccessor?: ChartAccessor<TDatum, number>
  pointRadius?: number
  colorBy?: ChartAccessor<TDatum, string>
  seed?: number
  xExtent?: [number, number]
  collisionIterations?: number
  settle?: boolean
  showProjection?: boolean
  tooltip?: TooltipProp
  paused?: boolean
  frameProps?: PhysicsHocFrameProps<"config">
}

function formatTick(value: number): string {
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function collisionSwarmProjectionOverlay(
  metadata: CollisionSwarmProjectionMetadata | undefined,
  enabled: boolean | undefined
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  if (enabled === false || !metadata) return undefined

  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || 700,
      Number(size[1]) || 360
    ]
    const area = physicsChartArea(resolvedSize)
    const yAxis = area.plot.y + area.plot.height
    const [min, max] = metadata.xExtent
    const mid = min + (max - min) / 2
    const ticks = [
      { label: formatTick(min), x: metadata.xRange[0] },
      { label: formatTick(mid), x: metadata.xRange[0] + (metadata.xRange[1] - metadata.xRange[0]) / 2 },
      { label: formatTick(max), x: metadata.xRange[1] }
    ]

    return (
      <svg
        aria-hidden="true"
        data-testid="collision-swarm-projection-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none"
        }}
      >
        {metadata.groups.map((group) => (
          <g key={group.label}>
            <line
              x1={area.plot.x}
              x2={area.plot.x + area.plot.width}
              y1={group.y}
              y2={group.y}
              stroke="var(--semiotic-border, #d1d5db)"
              strokeDasharray="3 5"
              strokeWidth={1}
            />
            <text
              x={area.plot.x + 4}
              y={group.y - 7}
              fill="var(--semiotic-text-secondary, #555)"
              fontSize={10}
              fontWeight={700}
            >
              {group.label}
            </text>
            <text
              x={area.plot.x + area.plot.width - 4}
              y={group.y - 7}
              textAnchor="end"
              fill="var(--semiotic-text-secondary, #555)"
              fontSize={10}
            >
              n={group.count}
            </text>
          </g>
        ))}
        <line
          x1={metadata.xRange[0]}
          x2={metadata.xRange[1]}
          y1={yAxis}
          y2={yAxis}
          stroke="var(--semiotic-text-secondary, #555)"
          strokeWidth={1}
        />
        {ticks.map((tick) => (
          <g key={`${tick.label}-${tick.x}`}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={yAxis}
              y2={yAxis + 5}
              stroke="var(--semiotic-text-secondary, #555)"
              strokeWidth={1}
            />
            <text
              x={tick.x}
              y={Math.min(resolvedSize[1] - 8, yAxis + 18)}
              textAnchor="middle"
              fill="var(--semiotic-text-secondary, #555)"
              fontSize={10}
            >
              {tick.label}
            </text>
          </g>
        ))}
      </svg>
    )
  }
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
>(props: CollisionSwarmChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const {
    colorBy,
    collisionIterations,
    data,
    emptyContent,
    frameProps,
    groupAccessor,
    loading,
    loadingContent,
    paused,
    pointRadius = 5,
    radiusAccessor,
    responsiveHeight,
    responsiveWidth,
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
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const chartData = useMemo(() => data ?? [], [data])
  const layout = useMemo(
    () =>
      buildCollisionSwarmPhysics({
        data: chartData,
        xAccessor,
        groupAccessor,
        radiusAccessor,
        pointRadius,
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
      pointRadius,
      radiusAccessor,
      seed,
      settle,
      xAccessor,
      xExtent
    ]
  )

  const spawnDatum = useCallback(
    (datum: Datum, index: number) => {
      const single = buildCollisionSwarmPhysics({
        data: [datum],
        xAccessor: xAccessor as ChartAccessor<Datum, number>,
        groupAccessor: groupAccessor as ChartAccessor<Datum, string> | undefined,
        radiusAccessor: radiusAccessor as ChartAccessor<Datum, number> | undefined,
        pointRadius,
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
        shape: { type: "circle" as const, radius: pointRadius },
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
      pointRadius,
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
  const bodyStyle = useMemo(
    () => styleFromColorAccessor(resolvedColorBy),
    [resolvedColorBy]
  )

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
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      ref={frameRef}
      config={layout.config}
      foregroundGraphics={composePhysicsFrameGraphics(
        projectionOverlay,
        frameProps?.foregroundGraphics
      )}
      initialSpawns={layout.initialSpawns}
      paused={paused}
      responsiveHeight={responsiveHeight}
      responsiveWidth={responsiveWidth}
      size={chartSize}
      bodyStyle={bodyStyle}
    />
  )
})

export default CollisionSwarmChart
