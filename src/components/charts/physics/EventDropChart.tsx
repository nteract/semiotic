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
  buildEventDropPhysics,
  physicsChartArea,
  placeEventDropSpawn,
  projectionRowsToSemanticItems,
  styleFromColorAccessor,
  type EventDropProjectionMetadata,
  type EventDropWindowOptions
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
  secondary?: number
  value: number
}

export interface EventDropChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "margin"> {
  data?: TDatum[]
  size?: [number, number]
  timeAccessor?: ChartAccessor<TDatum, number>
  arrivalAccessor?: ChartAccessor<TDatum, number>
  windows?: EventDropWindowOptions
  watermark?: { delay: number } | ((latestEventTime: number) => number)
  ballRadius?: number
  colorBy?: ChartAccessor<TDatum, string>
  seed?: number
  timeScale?: number
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

function eventDropOverlay(
  rows: ProjectionRow[],
  metadata: EventDropProjectionMetadata | undefined,
  enabled: boolean | undefined
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  if (enabled === false || !metadata) return undefined
  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || 760,
      Number(size[1]) || 360
    ]
    const area = physicsChartArea(resolvedSize)
    const windowCount = Math.max(1, metadata.windowCount)
    const laneWidth = area.plot.width / windowCount
    const yBottom = area.plot.y + area.plot.height
    const windowTop = area.plot.y + area.plot.height * 0.48
    const domainStart = metadata.windowStart
    const domainEnd = metadata.windowStart + windowCount * metadata.windowSize
    const watermarkRatio =
      domainEnd === domainStart
        ? 0
        : (metadata.watermarkValue - domainStart) / (domainEnd - domainStart)
    const watermarkX =
      area.plot.x + Math.max(0, Math.min(1, watermarkRatio)) * area.plot.width

    return (
      <svg
        aria-hidden="true"
        data-testid="event-drop-window-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none"
        }}
      >
        <rect
          x={area.plot.x}
          y={area.plot.y}
          width={area.plot.width}
          height={area.plot.height}
          fill="none"
          stroke="var(--semiotic-border, #d1d5db)"
          strokeOpacity={0.7}
          strokeWidth={1}
        />
        {Array.from({ length: windowCount }, (_, index) => {
          const row = rows[index]
          const x = area.plot.x + index * laneWidth
          const closed = index < metadata.closedWindowCount
          const late = row?.secondary ?? 0
          return (
            <g key={`window-${index}`}>
              <rect
                x={x}
                y={windowTop}
                width={laneWidth}
                height={yBottom - windowTop}
                fill={
                  closed
                    ? "var(--semiotic-negative, #e15759)"
                    : "var(--semiotic-accent, #4e79a7)"
                }
                fillOpacity={closed ? 0.08 : 0.06}
                stroke="var(--semiotic-border, #d1d5db)"
                strokeOpacity={0.68}
                strokeWidth={1}
              />
              {closed ? (
                <line
                  x1={x + 2}
                  x2={x + laneWidth - 2}
                  y1={windowTop}
                  y2={windowTop}
                  stroke="var(--semiotic-negative, #e15759)"
                  strokeOpacity={0.78}
                  strokeWidth={2}
                />
              ) : null}
              <text
                x={x + laneWidth / 2}
                y={windowTop - 8}
                textAnchor="middle"
                fill="var(--semiotic-text-secondary, #555)"
                fontSize={10}
                fontWeight={700}
              >
                {row?.value ?? 0}
                {late ? ` / ${late} late` : ""}
              </text>
              <text
                x={x + laneWidth / 2}
                y={Math.min(resolvedSize[1] - 8, yBottom + 16)}
                textAnchor="middle"
                fill="var(--semiotic-text-secondary, #555)"
                fontSize={10}
              >
                {row?.label ?? ""}
              </text>
            </g>
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
        <line
          data-testid="event-drop-watermark"
          x1={watermarkX}
          x2={watermarkX}
          y1={area.plot.y + 8}
          y2={yBottom}
          stroke="var(--semiotic-warning, #f28e2b)"
          strokeDasharray="5 4"
          strokeWidth={2}
        />
        <text
          x={Math.min(area.plot.x + area.plot.width - 4, watermarkX + 6)}
          y={area.plot.y + 16}
          fill="var(--semiotic-warning, #f28e2b)"
          fontSize={10}
          fontWeight={700}
        >
          watermark {Math.round(metadata.watermarkValue * 100) / 100}
        </text>
        {metadata.lateCount > 0 ? (
          <text
            x={area.plot.x + area.plot.width - 4}
            y={area.plot.y + 32}
            textAnchor="end"
            fill="var(--semiotic-negative, #e15759)"
            fontSize={10}
            fontWeight={700}
          >
            {metadata.lateCount} late
          </text>
        ) : null}
      </svg>
    )
  }
}

export const EventDropChart = forwardRef(function EventDropChart<
  TDatum extends Datum = Datum
>(props: EventDropChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const {
    arrivalAccessor = "arrivalTime" as ChartAccessor<TDatum, number>,
    ballRadius = 7,
    className,
    colorBy,
    data,
    emptyContent,
    frameProps,
    height,
    loading,
    loadingContent,
    paused,
    responsiveHeight,
    responsiveWidth,
    seed = 1,
    showProjection = true,
    size,
    timeAccessor = "time" as ChartAccessor<TDatum, number>,
    timeScale = 1,
    watermark,
    width,
    windows = { size: 10 }
  } = props
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const sizeWidth = size?.[0]
  const sizeHeight = size?.[1]
  const chartSize = useMemo(
    () =>
      sizeWidth != null && sizeHeight != null
        ? [sizeWidth, sizeHeight] as [number, number]
        : resolvePhysicsChartSize(undefined, width, height, [760, 360]),
    [height, sizeHeight, sizeWidth, width]
  )
  const chartData = useMemo(() => data ?? [], [data])
  const layout = useMemo(
    () =>
      buildEventDropPhysics({
        data: chartData,
        timeAccessor,
        arrivalAccessor,
        windows,
        watermark,
        ballRadius,
        seed,
        size: chartSize,
        timeScale
      }),
    [
      arrivalAccessor,
      ballRadius,
      chartSize,
      chartData,
      seed,
      timeAccessor,
      timeScale,
      watermark,
      windows
    ]
  )

  const metadata = layout.metadata as EventDropProjectionMetadata | undefined
  const spawnDatum = useCallback(
    (datum: Datum, index: number) => {
      // Place the pushed event onto the mounted board's live domain so it lands
      // in its true window (or the late gutter), not the center of a one-event
      // mini-domain. Falls back to a plot-left drop only if the domain or the
      // event time is missing.
      const placed = metadata
        ? placeEventDropSpawn(datum, index, metadata, {
            timeAccessor: timeAccessor as ChartAccessor<Datum, number>,
            arrivalAccessor: arrivalAccessor as ChartAccessor<Datum, number>,
            ballRadius
          })
        : null
      const spawn: PhysicsQueuedSpawn = placed ?? {
        id: String(datum.id ?? `event-push-${index}`),
        x: physicsChartArea(chartSize).plot.x,
        y: physicsChartArea(chartSize).plot.y,
        mass: 1,
        shape: { type: "circle" as const, radius: ballRadius },
        datum
      }
      return {
        datumId: String(datum.id ?? spawn.id),
        spawns: [spawn]
      }
    },
    [arrivalAccessor, ballRadius, chartSize, metadata, timeAccessor]
  )
  usePhysicsHocHandle(ref, { frameRef, spawnDatum })
  const bodyStyle = useMemo(
    () =>
      styleFromColorAccessor(
        colorBy as ChartAccessor<Datum, string> | undefined
      ),
    [colorBy]
  )
  const semanticItems = useMemo(
    () => projectionRowsToSemanticItems(layout.projectionRows, chartSize, "window"),
    [chartSize, layout.projectionRows]
  )

  const stateEl = renderPhysicsChartState({
    data,
    emptyContent,
    loading,
    loadingContent,
    size: chartSize
  })
  if (stateEl) return stateEl
  const projectionOverlay = eventDropOverlay(
    layout.projectionRows,
    layout.metadata as EventDropProjectionMetadata | undefined,
    showProjection
  )
  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
  const sharedFrameProps = resolvePhysicsFrameSharedProps(
    props,
    frameProps,
    semanticItems
  )

  return renderPhysicsFrame(
    "EventDropChart",
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
      title={props.title ?? "Event drop chart"}
      bodyStyle={bodyStyle}
    />
  )
})

export default EventDropChart
