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
  usePhysicsChartMode,
  type PhysicsHocFrameProps,
  type PhysicsSharedChartProps,
  type TooltipProp
} from "./physicsHocUtils"

type ProjectionRow = {
  label: string
  secondary?: number
  value: number
}

export interface EventDropChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "margin">,
    PhysicsSharedChartProps {
  data?: TDatum[]
  size?: [number, number]
  timeAccessor?: ChartAccessor<TDatum, number>
  arrivalAccessor?: ChartAccessor<TDatum, number>
  windows?: EventDropWindowOptions
  watermark?: { delay?: number; value?: number } | ((latestEventTime: number) => number)
  ballRadius?: number
  colorBy?: ChartAccessor<TDatum, string>
  seed?: number
  timeExtent?: [number, number]
  timeScale?: number
  showProjection?: boolean
  tooltip?: TooltipProp
  paused?: boolean
  frameProps?: PhysicsHocFrameProps<"config">
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
    const plot = metadata.plot ?? area.plot
    const gutter = metadata.gutter ?? {
      x: plot.x,
      y: plot.y,
      width: 0,
      height: plot.height
    }
    const windowPlot = metadata.windowPlot ?? plot
    const laneWidth = windowPlot.width / windowCount
    const yBottom = plot.y + plot.height
    const windowTop = plot.y + plot.height * 0.48
    const gutterTop = metadata.lidSegments[0]?.y1 ?? windowTop
    const domainStart = metadata.windowStart
    const domainEnd = metadata.windowStart + windowCount * metadata.windowSize
    const watermarkRatio =
      domainEnd === domainStart
        ? 0
        : (metadata.watermarkValue - domainStart) / (domainEnd - domainStart)
    const watermarkX =
      windowPlot.x + Math.max(0, Math.min(1, watermarkRatio)) * windowPlot.width

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
          x={plot.x}
          y={plot.y}
          width={plot.width}
          height={plot.height}
          fill="none"
          stroke="var(--semiotic-border, #d1d5db)"
          strokeOpacity={0.7}
          strokeWidth={1}
        />
        {gutter.width > 0 ? (
          <g>
            <rect
              x={gutter.x}
              y={gutterTop}
              width={gutter.width}
              height={yBottom - gutterTop}
              fill="var(--semiotic-negative, #e15759)"
              fillOpacity={0.07}
              stroke="var(--semiotic-border, #d1d5db)"
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            <text
              x={gutter.x + gutter.width / 2}
              y={gutterTop - 8}
              textAnchor="middle"
              fill="var(--semiotic-negative, #e15759)"
              fontSize={10}
              fontWeight={700}
            >
              gutter
            </text>
          </g>
        ) : null}
        {Array.from({ length: windowCount }, (_, index) => {
          const row = rows[index]
          const x = windowPlot.x + index * laneWidth
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
                metadata.lidSegments
                  .filter((segment) => segment.windowIndex === index)
                  .map((segment) => (
                    <line
                      key={segment.id}
                      x1={segment.x1}
                      x2={segment.x2}
                      y1={segment.y1}
                      y2={segment.y2}
                      stroke="var(--semiotic-negative, #e15759)"
                      strokeOpacity={0.78}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  ))
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
        {metadata.lidSegments
          .filter((segment) => segment.windowIndex == null)
          .map((segment) => (
            <line
              key={segment.id}
              x1={segment.x1}
              x2={segment.x2}
              y1={segment.y1}
              y2={segment.y2}
              stroke="var(--semiotic-negative, #e15759)"
              strokeOpacity={0.62}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        <line
          x1={plot.x}
          x2={plot.x + plot.width}
          y1={yBottom}
          y2={yBottom}
          stroke="var(--semiotic-border, #d1d5db)"
          strokeWidth={1.5}
        />
        <line
          data-testid="event-drop-watermark"
          x1={watermarkX}
          x2={watermarkX}
          y1={plot.y + 8}
          y2={yBottom}
          stroke="var(--semiotic-warning, #f28e2b)"
          strokeDasharray="5 4"
          strokeWidth={2}
        />
        <text
          x={Math.min(plot.x + plot.width - 4, watermarkX + 6)}
          y={plot.y + 16}
          fill="var(--semiotic-warning, #f28e2b)"
          fontSize={10}
          fontWeight={700}
        >
          watermark {Math.round(metadata.watermarkValue * 100) / 100}
        </text>
        {metadata.lateCount > 0 ? (
          <text
            x={gutter.x + gutter.width / 2}
            y={plot.y + 32}
            textAnchor="middle"
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

function eventDropSemanticItems(
  rows: ProjectionRow[],
  metadata: EventDropProjectionMetadata | undefined,
  chartSize: [number, number]
) {
  if (!metadata) return projectionRowsToSemanticItems(rows, chartSize, "window")
  const laneWidth = metadata.windowPlot.width / Math.max(1, rows.length)
  const maxValue = Math.max(1, ...rows.map((row) => row.value + (row.secondary ?? 0)))
  const maxHeight = metadata.windowPlot.height * 0.62
  const yBottom = metadata.windowPlot.y + metadata.windowPlot.height

  return rows.map((row, index) => {
    const total = row.value + (row.secondary ?? 0)
    const barHeight = Math.max(8, (total / maxValue) * maxHeight)
    const x = metadata.windowPlot.x + (index + 0.5) * laneWidth
    const y = yBottom - barHeight / 2
    const late = row.secondary ? `, ${row.secondary} late` : ""
    const label = `window ${row.label}: ${row.value} on time${late}`
    return {
      id: `window-${row.label}`,
      label,
      description: label,
      datum: row,
      x,
      y,
      shape: "rect" as const,
      width: Math.max(12, laneWidth * 0.58),
      height: barHeight,
      group: "window"
    }
  })
}

/**
 * Physics-backed event drop chart for replaying arrivals against event-time windows and watermarks.
 *
 * @example
 * ```tsx
 * <EventDropChart
 *   data={[{ id: "a", time: 4, arrivalTime: 8 }, { id: "b", time: 18, arrivalTime: 12 }]}
 *   timeAccessor="time"
 *   arrivalAccessor="arrivalTime"
 *   windows={{ size: 10 }}
 *   watermark={{ delay: 5 }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <EventDropChart
 *   data={events}
 *   windows={{ size: 60_000 }}
 *   watermark={{ value: Date.now() - 120_000 }}
 *   timeScale={4}
 *   timeExtent={[start, end]}
 * />
 * ```
 */
export const EventDropChart = forwardRef(function EventDropChart<
  TDatum extends Datum = Datum
>(props: EventDropChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const {
    arrivalAccessor = "arrivalTime" as ChartAccessor<TDatum, number>,
    ballRadius = 7,
    colorBy,
    data,
    emptyContent,
    frameProps,
    loading,
    loadingContent,
    paused,
    responsiveHeight,
    responsiveWidth,
    seed = 1,
    timeAccessor = "time" as ChartAccessor<TDatum, number>,
    timeExtent,
    timeScale = 1,
    watermark,
    windows = { size: 10 }
  } = props
  const layoutMode = usePhysicsChartMode(props, [760, 360])
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
      buildEventDropPhysics({
        data: chartData,
        timeAccessor,
        arrivalAccessor,
        windows,
        watermark,
        ballRadius,
        seed,
        size: chartSize,
        timeExtent,
        timeScale
      }),
    [
      arrivalAccessor,
      ballRadius,
      chartSize,
      chartData,
      seed,
      timeAccessor,
      timeExtent,
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
  usePhysicsHocHandle(ref, {
    frameRef,
    spawnDatum,
    seedRows: chartData as Datum[],
    seedSpawns: layout.initialSpawns
  })
  const bodyStyle = useMemo(
    () =>
      styleFromColorAccessor(
        colorBy as ChartAccessor<Datum, string> | undefined
      ),
    [colorBy]
  )
  const semanticItems = useMemo(
    () => eventDropSemanticItems(layout.projectionRows, metadata, chartSize),
    [chartSize, layout.projectionRows, metadata]
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
    "EventDropChart",
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
      initialSpawnPacing={layout.initialSpawnPacing}
      paused={paused}
      responsiveHeight={responsiveHeight}
      responsiveWidth={responsiveWidth}
      size={chartSize}
      bodyStyle={bodyStyle}
    />
  )
})

export default EventDropChart
