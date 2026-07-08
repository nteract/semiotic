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
  buildPhysicsPile,
  generatePhysicsPileMechanicalSamples,
  physicsChartArea,
  pileTubeGeometry,
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

export interface PhysicsPileChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "margin" | "mode"> {
  data?: TDatum[]
  size?: [number, number]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  mode?: "sample" | "mechanical"
  mechanicalCount?: number
  mechanicalCategories?: readonly string[]
  unitValue?: number
  ballRadius?: number
  colorBy?: ChartAccessor<TDatum, string>
  seed?: number
  showProjection?: boolean
  sediment?: boolean
  tooltip?: TooltipProp
  paused?: boolean
  frameProps?: Partial<
    Omit<
      StreamPhysicsFrameProps,
      "config" | "initialSpawns" | "initialSpawnPacing" | "size"
    >
  >
}

function pileProjectionOverlay(
  rows: ProjectionRow[],
  ballRadius: number,
  enabled: boolean | undefined
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  if (enabled === false || rows.length === 0) return undefined
  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || 700,
      Number(size[1]) || 380
    ]
    const area = physicsChartArea(resolvedSize)
    const geom = pileTubeGeometry(area.plot, rows.length, ballRadius)
    const yBottom = area.plot.y + area.plot.height

    return (
      <svg
        aria-hidden="true"
        data-testid="physics-pile-projection-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none"
        }}
      >
        <line
          x1={area.plot.x}
          x2={area.plot.x + area.plot.width}
          y1={yBottom}
          y2={yBottom}
          stroke="var(--semiotic-border, #d1d5db)"
          strokeWidth={1}
        />
        {rows.map((row, index) => {
          // The bar is the exact fill target: its height is the same
          // count→height mapping the tube uses, so the settling units rise to
          // meet it. It reads as the "truth" the pile assembles.
          const barHeight = Math.min(area.plot.height, geom.pileHeight(row.value))
          const barWidth = geom.tubeWidth
          const x = geom.centerX(index)
          const y = yBottom - barHeight
          return (
            <g key={`${row.label}-${index}`}>
              <rect
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill="var(--semiotic-accent, #4e79a7)"
                fillOpacity={0.08}
                stroke="var(--semiotic-accent, #4e79a7)"
                strokeOpacity={0.42}
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={x}
                y={Math.max(area.plot.y + 12, y - 6)}
                textAnchor="middle"
                fill="var(--semiotic-text-secondary, #555)"
                fontSize={11}
                fontWeight={700}
              >
                {row.value}
              </text>
              <text
                x={x}
                y={Math.min(resolvedSize[1] - 8, yBottom + 16)}
                textAnchor="middle"
                fill="var(--semiotic-text-secondary, #555)"
                fontSize={10}
              >
                {row.label}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }
}

/**
 * Physics-backed unit pile chart that converts category values into repeated bodies and a readable settled projection.
 *
 * @example
 * ```tsx
 * <PhysicsPileChart
 *   data={[{ category: "A", value: 12 }, { category: "B", value: 8 }]}
 *   categoryAccessor="category"
 *   valueAccessor="value"
 *   unitValue={1}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <PhysicsPileChart
 *   mode="mechanical"
 *   mechanicalCategories={["North", "South", "West"]}
 *   mechanicalCount={90}
 *   seed={5}
 * />
 * ```
 */
export const PhysicsPileChart = forwardRef(function PhysicsPileChart<
  TDatum extends Datum = Datum
>(props: PhysicsPileChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const {
    ballRadius = 8,
    categoryAccessor = "category" as ChartAccessor<TDatum, string>,
    className,
    colorBy,
    data,
    emptyContent,
    frameProps,
    height,
    loading,
    loadingContent,
    mechanicalCategories,
    mechanicalCount,
    mode = "sample",
    paused,
    responsiveHeight,
    responsiveWidth,
    seed = 1,
    showProjection = true,
    size,
    unitValue = 1,
    valueAccessor,
    width
  } = props
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const sizeWidth = size?.[0]
  const sizeHeight = size?.[1]
  const chartSize = useMemo(
    () =>
      sizeWidth != null && sizeHeight != null
        ? [sizeWidth, sizeHeight] as [number, number]
        : resolvePhysicsChartSize(undefined, width, height, [700, 380]),
    [height, sizeHeight, sizeWidth, width]
  )
  const resolvedValueAccessor =
    mode === "mechanical" && valueAccessor == null
      ? ("value" as ChartAccessor<TDatum, number>)
      : valueAccessor
  const chartData = useMemo(
    () =>
      mode === "mechanical"
        ? (generatePhysicsPileMechanicalSamples({
            categories: mechanicalCategories,
            count: mechanicalCount,
            seed,
            unitValue
          }) as TDatum[])
        : (data ?? []),
    [data, mechanicalCategories, mechanicalCount, mode, seed, unitValue]
  )
  const layout = useMemo(
    () =>
      buildPhysicsPile({
        data: chartData,
        categoryAccessor,
        valueAccessor: resolvedValueAccessor,
        unitValue,
        ballRadius,
        seed,
        size: chartSize
      }),
    [
      ballRadius,
      categoryAccessor,
      chartSize,
      chartData,
      resolvedValueAccessor,
      seed,
      unitValue,
    ]
  )

  const spawnDatum = useCallback(
    (datum: Datum, index: number) => {
      const single = buildPhysicsPile({
        data: [datum],
        categoryAccessor: categoryAccessor as ChartAccessor<Datum, string>,
        valueAccessor: resolvedValueAccessor as ChartAccessor<Datum, number> | undefined,
        unitValue,
        ballRadius,
        seed: seed + index + 1,
        size: chartSize
      })
      const fallback = {
        id: String(datum.id ?? `pile-push-${index}`),
        x: physicsChartArea(chartSize).plot.x,
        y: physicsChartArea(chartSize).plot.y,
        mass: 1,
        shape: { type: "circle" as const, radius: ballRadius },
        datum
      }
      const spawns = single.initialSpawns.length
        ? single.initialSpawns
        : [fallback]
      return {
        datumId: String(datum.id ?? spawns[0].id),
        spawns: spawns as PhysicsQueuedSpawn[]
      }
    },
    [
      ballRadius,
      categoryAccessor,
      chartSize,
      resolvedValueAccessor,
      seed,
      unitValue
    ]
  )
  usePhysicsHocHandle(ref, { frameRef, spawnDatum })
  const resolvedColorBy =
    mode === "mechanical" && colorBy == null
      ? ("category" as ChartAccessor<Datum, string>)
      : (colorBy as ChartAccessor<Datum, string> | undefined)
  const bodyStyle = useMemo(
    () => styleFromColorAccessor(resolvedColorBy),
    [resolvedColorBy]
  )
  const semanticItems = useMemo(
    () =>
      projectionRowsToSemanticItems(
        layout.projectionRows,
        chartSize,
        "category"
      ),
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
  const projectionOverlay = pileProjectionOverlay(
    layout.projectionRows,
    ballRadius,
    showProjection
  )
  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
  const sharedFrameProps = resolvePhysicsFrameSharedProps(
    props,
    frameProps,
    semanticItems
  )

  return renderPhysicsFrame(
    "PhysicsPileChart",
    chartSize,
    <StreamPhysicsFrame
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      ref={frameRef}
      className={className}
      config={layout.config}
      foregroundGraphics={composePhysicsFrameGraphics(
        projectionOverlay,
        frameProps?.foregroundGraphics
      )}
      initialSpawns={layout.initialSpawns}
      initialSpawnPacing={layout.initialSpawnPacing}
      paused={paused}
      responsiveHeight={responsiveHeight}
      responsiveWidth={responsiveWidth}
      size={chartSize}
      title={props.title ?? "Physics pile chart"}
      bodyStyle={bodyStyle}
    />
  )
})

export default PhysicsPileChart
