"use client"

import * as React from "react"
import { forwardRef, useCallback, useMemo, useRef } from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle,
  type StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import {
  buildGaltonBoardPhysics,
  generateGaltonMechanicalSamples,
  physicsChartArea,
  projectionRowsToSemanticItems,
  styleFromColorAccessor
} from "./physicsChartUtils"
import { usePhysicsHocHandle } from "./physicsHocHandle"
import {
  composePhysicsFrameGraphics,
  renderPhysicsChartState,
  renderPhysicsFrame,
  resolvePhysicsChartSize,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsTooltipProps,
  type TooltipProp
} from "./physicsHocUtils"

type ProjectionRow = {
  label: string
  value: number
}

export interface GaltonBoardChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "margin" | "mode"> {
  data?: TDatum[]
  size?: [number, number]
  valueAccessor?: ChartAccessor<TDatum, number>
  bins?: number
  mode?: "sample" | "mechanical"
  pegRows?: number
  mechanicalCount?: number
  branchProbability?: number
  ballRadius?: number
  colorBy?: ChartAccessor<TDatum, string>
  seed?: number
  showProjection?: boolean
  tooltip?: TooltipProp
  paused?: boolean
  frameProps?: Partial<
    Omit<
      StreamPhysicsFrameProps,
      "config" | "initialSpawns" | "initialSpawnPacing" | "size"
    >
  >
}

function galtonBoardOverlay(
  rows: ProjectionRow[],
  bins: number,
  enabled: boolean | undefined
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  if (enabled === false) return undefined
  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || 700,
      Number(size[1]) || 420
    ]
    const area = physicsChartArea(resolvedSize)
    const resolvedBins = Math.max(2, Math.round(bins))
    const laneWidth = area.plot.width / resolvedBins
    const yBottom = area.plot.y + area.plot.height
    const maxValue = Math.max(1, ...rows.map((row) => row.value))
    // The ghost curve traces the exact settled count per bin — the "truth
    // layer" the physical pile of units assembles itself into as it falls.
    const curve = rows
      .map((row, index) => {
        const x = area.plot.x + (index + 0.5) * laneWidth
        const y = yBottom - (row.value / maxValue) * area.plot.height * 0.9
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(" ")

    return (
      <svg
        aria-hidden="true"
        data-testid="galton-board-structure-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {Array.from({ length: resolvedBins + 1 }, (_, index) => {
          const x = area.plot.x + index * laneWidth
          return (
            <line
              key={`bin-wall-${index}`}
              data-testid="galton-board-bin-wall"
              x1={x}
              x2={x}
              y1={area.plot.y}
              y2={yBottom}
              stroke="var(--semiotic-border, #d1d5db)"
              strokeOpacity={0.28}
              strokeWidth={1}
            />
          )
        })}
        <line
          x1={area.plot.x}
          x2={area.plot.x + area.plot.width}
          y1={yBottom}
          y2={yBottom}
          stroke="var(--semiotic-border, #d1d5db)"
          strokeWidth={1.5}
        />
        <path
          d={curve}
          fill="none"
          stroke="var(--semiotic-accent, #4e79a7)"
          strokeOpacity={0.7}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {rows.map((row, index) => {
          if (row.value <= 0) return null
          const x = area.plot.x + (index + 0.5) * laneWidth
          const y = yBottom - (row.value / maxValue) * area.plot.height * 0.9
          return (
            <text
              key={`${row.label}-${index}`}
              x={x}
              y={Math.max(area.plot.y + 10, y - 6)}
              textAnchor="middle"
              fill="var(--semiotic-text-secondary, #555)"
              fontSize={10}
              fontWeight={700}
            >
              {row.value}
            </text>
          )
        })}
      </svg>
    )
  }
}

/**
 * Physics-backed Galton board chart that drops values through seeded pegs into a settled distribution.
 *
 * @example
 * ```tsx
 * <GaltonBoardChart
 *   data={[{ id: "a", value: 2 }, { id: "b", value: 7 }]}
 *   valueAccessor="value"
 *   bins={12}
 *   size={[520, 320]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <GaltonBoardChart
 *   mode="mechanical"
 *   mechanicalCount={80}
 *   branchProbability={0.62}
 *   seed={11}
 * />
 * ```
 */
export const GaltonBoardChart = forwardRef(function GaltonBoardChart<
  TDatum extends Datum = Datum
>(props: GaltonBoardChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const {
    data,
    valueAccessor = "value" as ChartAccessor<TDatum, number>,
    bins = 21,
    ballRadius = 6,
    colorBy,
    className,
    branchProbability = 0.5,
    emptyContent,
    frameProps,
    height,
    loading,
    loadingContent,
    mechanicalCount,
    mode = "sample",
    paused,
    pegRows,
    responsiveHeight,
    responsiveWidth,
    seed = 1,
    showProjection = true,
    size,
    width
  } = props
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const sizeWidth = size?.[0]
  const sizeHeight = size?.[1]
  const chartSize = useMemo(
    () =>
      sizeWidth != null && sizeHeight != null
        ? [sizeWidth, sizeHeight] as [number, number]
        : resolvePhysicsChartSize(undefined, width, height, [700, 420]),
    [height, sizeHeight, sizeWidth, width]
  )
  const resolvedPegRows = Math.max(1, Math.round(pegRows ?? bins - 1))
  const chartData = useMemo(
    () =>
      mode === "mechanical"
        ? (generateGaltonMechanicalSamples({
            bins,
            branchProbability,
            count: mechanicalCount,
            pegRows: resolvedPegRows,
            seed
          }) as TDatum[])
        : (data ?? []),
    [bins, branchProbability, data, mechanicalCount, mode, resolvedPegRows, seed]
  )
  const layout = useMemo(
    () =>
      buildGaltonBoardPhysics({
        data: chartData,
        valueAccessor,
        bins,
        ballRadius,
        seed,
        size: chartSize,
        valueExtent: mode === "mechanical" ? [0, resolvedPegRows] : undefined
      }),
    [ballRadius, bins, chartData, chartSize, mode, resolvedPegRows, seed, valueAccessor]
  )

  const spawnDatum = useCallback(
    (datum: Datum, index: number) => {
      const single = buildGaltonBoardPhysics({
        data: [datum],
        valueAccessor: valueAccessor as ChartAccessor<Datum, number>,
        bins,
        ballRadius,
        seed: seed + index + 1,
        size: chartSize,
        valueExtent: mode === "mechanical" ? [0, resolvedPegRows] : undefined
      })
      const spawn = single.initialSpawns[0] ?? {
        id: String(datum.id ?? `galton-push-${index}`),
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
    [ballRadius, bins, chartSize, mode, resolvedPegRows, seed, valueAccessor]
  )
  usePhysicsHocHandle(ref, { frameRef, spawnDatum })
  const resolvedColorBy =
    mode === "mechanical" && colorBy == null
      ? ("side" as ChartAccessor<Datum, string>)
      : (colorBy as ChartAccessor<Datum, string> | undefined)
  const bodyStyle = useMemo(
    () => styleFromColorAccessor(resolvedColorBy),
    [resolvedColorBy]
  )
  const semanticItems = useMemo(
    () => projectionRowsToSemanticItems(layout.projectionRows, chartSize, "bin"),
    [chartSize, layout.projectionRows]
  )

  const stateEl = renderPhysicsChartState({
    data: mode === "mechanical" ? chartData : data,
    emptyContent,
    loading,
    loadingContent,
    size: chartSize
  })
  if (stateEl) return stateEl
  const structureOverlay = galtonBoardOverlay(
    layout.projectionRows,
    bins,
    showProjection
  )
  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
  const sharedFrameProps = resolvePhysicsFrameSharedProps(
    props,
    frameProps,
    semanticItems
  )

  return renderPhysicsFrame(
    "GaltonBoardChart",
    chartSize,
    <StreamPhysicsFrame
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      ref={frameRef}
      className={className}
      config={layout.config}
      foregroundGraphics={composePhysicsFrameGraphics(
        structureOverlay,
        frameProps?.foregroundGraphics
      )}
      initialSpawns={layout.initialSpawns}
      initialSpawnPacing={layout.initialSpawnPacing}
      paused={paused}
      responsiveHeight={responsiveHeight}
      responsiveWidth={responsiveWidth}
      size={chartSize}
      title={props.title ?? "Galton board chart"}
      bodyStyle={bodyStyle}
    />
  )
})

export default GaltonBoardChart
