"use client"

import * as React from "react"
import { forwardRef, useCallback, useMemo, useRef } from "react"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import {
  buildEventDropPhysics,
  composePhysicsBodyStyle,
  physicsChartArea,
  placeEventDropSpawn,
  projectionRowsToSemanticItems,
  styleFromColorAccessor,
  type EventDropProjectionMetadata,
  type EventDropWindowOptions
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
import { eventDropOverlay } from "./physicsProjectionOverlays"

type ProjectionRow = {
  label: string
  secondary?: number
  value: number
}

export interface EventDropChartProps<TDatum extends Datum = Datum>
  extends
    Omit<BaseChartProps, "margin" | "selection">,
    PhysicsSharedChartProps {
  data?: TDatum[]
  size?: [number, number]
  timeAccessor?: ChartAccessor<TDatum, number>
  arrivalAccessor?: ChartAccessor<TDatum, number>
  windows?: EventDropWindowOptions
  watermark?:
    { delay?: number; value?: number } | ((latestEventTime: number) => number)
  ballRadius?: number
  colorBy?: ChartAccessor<TDatum, string>
  /**
   * Declarative, threshold-aware drop styling. Ordered `{ when, style }`
   * rules; last applicable rule wins. `ctx` = `{ value, category }` (value =
   * the event time). A rule `fill` may be a color or a HatchFill.
   */
  styleRules?: StyleRule[]
  seed?: number
  timeExtent?: [number, number]
  timeScale?: number
  showProjection?: boolean
  tooltip?: TooltipProp
  /**
   * Replay the seeded simulation this many milliseconds after it settles.
   * Omit or pass `null` for a single run; `0` replays on the next timer turn.
   */
  rerunMS?: PhysicsRerunMS
  paused?: boolean
  frameProps?: PhysicsHocFrameProps<"config">
}

function eventDropSemanticItems(
  rows: ProjectionRow[],
  metadata: EventDropProjectionMetadata | undefined,
  chartSize: [number, number]
) {
  if (!metadata) return projectionRowsToSemanticItems(rows, chartSize, "window")
  const laneWidth = metadata.windowPlot.width / Math.max(1, rows.length)
  const maxValue = Math.max(
    1,
    ...rows.map((row) => row.value + (row.secondary ?? 0))
  )
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
>(props: EventDropChartProps<TDatum>, ref: React.Ref<PhysicsFrameHandle>) {
  const {
    arrivalAccessor = "arrivalTime" as ChartAccessor<TDatum, number>,
    ballRadius = 7,
    colorBy,
    styleRules,
    data,
    emptyContent,
    frameProps,
    loading,
    loadingContent,
    paused,
    rerunMS,
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
  const rerun = usePhysicsRerun(
    layout.config,
    rerunMS,
    paused,
    undefined,
    props.onSimulationStateChange
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
  const generatedBodyStyle = useMemo(
    () =>
      styleFromColorAccessor(
        colorBy as ChartAccessor<Datum, string> | undefined,
        "#4e79a7",
        {
          styleRules,
          valueAccessor: timeAccessor as string | ((d: Datum) => unknown)
        }
      ),
    [colorBy, styleRules, timeAccessor]
  )
  const bodyStyle = useMemo(
    () => composePhysicsBodyStyle(generatedBodyStyle, frameProps?.bodyStyle),
    [generatedBodyStyle, frameProps?.bodyStyle]
  )
  const semanticItems = useMemo(
    () => eventDropSemanticItems(layout.projectionRows, metadata, chartSize),
    [chartSize, layout.projectionRows, metadata]
  )

  const { selection: bodySelection, onBodyHover } = usePhysicsSelection({
    selection: props.selection,
    linkedHover: props.linkedHover,
    colorBy,
    chartType: "EventDropChart",
    chartId: props.chartId,
    onObservation: props.onObservation,
    onClick: props.onClick,
    onBodyHover: frameProps?.onBodyHover,
    fallbackFields:
      typeof timeAccessor === "string" ? [timeAccessor] : undefined
  })

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
    "EventDropChart",
    chartSize,
    <StreamPhysicsFrame
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      ref={frameRef}
      onBodyHover={onBodyHover}
      key={`${chartSize[0]}x${chartSize[1]}:${rerun.rerunKey}`}
      config={rerun.config}
      foregroundGraphics={composePhysicsFrameGraphics(
        projectionOverlay,
        frameProps?.foregroundGraphics
      )}
      initialSpawns={layout.initialSpawns}
      initialSpawnPacing={layout.initialSpawnPacing}
      paused={paused}
      responsiveHeight={false}
      responsiveWidth={false}
      size={chartSize}
      bodyStyle={bodyStyle}
    />,
    layoutMode
  )
})

export default EventDropChart
