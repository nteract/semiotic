import { clamp } from "../../../utils/clamp"
/**
 * Shared ProcessSankey background chrome (time axis, grid, quality readout,
 * optional lane rails). Used by the client HOC and the SSR config so both
 * paths paint identical theme-token chrome.
 */
import * as React from "react"
import { scaleLinear, scaleUtc } from "d3-scale"
import type { ProcessSankeyLayout } from "./algorithm"
import type { ProcessSankeyOrientation } from "./orientation"
import type { ProcessSankeyNormalizedNode } from "./buildScenes"
import { toProcessSankeyTime as toTime, isProcessSankeyDateDomain, type ProcessSankeyTimeLike } from "./time"

const CHROME_STROKE = "var(--semiotic-grid, #94a3b8)"
const CHROME_TEXT = "var(--semiotic-text-secondary, #475569)"
const CHROME_MUTED = "var(--semiotic-text-secondary, #94a3b8)"

export interface ProcessSankeyTickInput {
  date: number | Date | string
  label?: string | React.ReactNode
}

export interface BuildProcessSankeyBackgroundGraphicsInput {
  layout: ProcessSankeyLayout
  nodes: readonly ProcessSankeyNormalizedNode[]
  orientation: ProcessSankeyOrientation
  plotW: number
  plotH: number
  timelineExtent: number
  domain: readonly ProcessSankeyTimeLike[]
  axisTicks?: readonly ProcessSankeyTickInput[]
  showQualityReadout?: boolean
  showLaneRails?: boolean
  /** Non-fatal validation messages for the quality readout. */
  warnings?: readonly string[]
  timeFormat?: (d: number | Date) => string | React.ReactNode
  colorOf?: (id: string, idx: number) => string
  xScale: (t: number) => number
}

export function buildProcessSankeyBackgroundGraphics(
  input: BuildProcessSankeyBackgroundGraphicsInput,
): React.ReactElement {
  const layout = input.layout
  const nodes = input.nodes
  const orientation = input.orientation
  const plotW = input.plotW
  const plotH = input.plotH
  const timelineExtent = input.timelineExtent
  const showQualityReadout = input.showQualityReadout ?? false
  const showLaneRails = input.showLaneRails ?? false
  const warningLines = (input.warnings ?? []).slice(0, 3)
  const timeFormat = input.timeFormat
  const colorOf = input.colorOf
  const xScale = input.xScale
  const dateDomain = isProcessSankeyDateDomain(input.domain)
  const {
    centerlines, laneLifetime, nodeData, valueScale: S, compressedPadding,
    crossingsBefore, crossingsAfter, layoutQualityBefore, layoutQuality,
  } = layout

  let minTime = Infinity
  let maxTime = -Infinity
  for (const node of nodes) {
    const lifetime = laneLifetime[node.id]
    if (lifetime?.start == null || lifetime.end == null) continue
    minTime = Math.min(minTime, lifetime.start)
    maxTime = Math.max(maxTime, lifetime.end)
  }
  const clampTimeCoord = (time: number) => clamp(xScale(time), 0, timelineExtent)
  const axisStart = Number.isFinite(minTime) ? clampTimeCoord(minTime) : 0
  const axisEnd = Number.isFinite(maxTime) ? Math.max(axisStart, clampTimeCoord(maxTime)) : timelineExtent
  const tickDomain: [number, number] = [
    Math.max(toTime(input.domain[0]), minTime),
    Math.min(toTime(input.domain[1]), maxTime)
  ]
  const tickCount = Math.max(2, Math.min(8, Math.floor(timelineExtent / 90)))
  const dateScale = scaleUtc().domain(tickDomain)
  const axisTicks = input.axisTicks ?? (Number.isFinite(tickDomain[0]) && Number.isFinite(tickDomain[1])
    ? (dateDomain ? dateScale.ticks(tickCount) : scaleLinear().domain(tickDomain).ticks(tickCount))
      .map(date => ({ date }))
    : [])
  const tickLabel = (tick: ProcessSankeyTickInput): React.ReactNode => {
    if (tick.label != null) return tick.label
    const time = toTime(tick.date)
    const value = dateDomain ? new Date(time) : time
    return timeFormat ? timeFormat(value) : dateDomain ? dateScale.tickFormat()(value as Date) : String(time)
  }
  const visibleTicks = axisTicks.map((tick, index) => ({
    tick,
    index,
    coordinate: xScale(toTime(tick.date)),
  })).filter(({ coordinate }) => coordinate >= axisStart - 0.5 && coordinate <= axisEnd + 0.5)

  const hasMetrics = crossingsAfter != null &&
    layoutQualityBefore != null && layoutQuality != null
  const qualityReadout = showQualityReadout && (hasMetrics || warningLines.length > 0) ? (
    <g fill={CHROME_MUTED} fontSize={10} textAnchor="end">
      {hasMetrics && (
        <>
          <text x={plotW} y={-14}>
            crossings: {crossingsBefore} → {crossingsAfter}
            {"   "}pixel length: {Math.round(layoutQualityBefore.pixelLength)} → {Math.round(layoutQuality.pixelLength)}
          </text>
          <text x={plotW} y={-3}>
            transit: {layoutQualityBefore.transitOcclusion.toFixed(1)} → {layoutQuality.transitOcclusion.toFixed(1)}
            {"   "}lane use: {Math.round(layoutQuality.verticalUtilization * 100)}%
          </text>
        </>
      )}
      {warningLines.map((line, index) => (
        <text
          key={`warn-${index}`}
          x={plotW}
          y={hasMetrics ? 10 + index * 11 : -3 + index * 11}
          fill="var(--semiotic-warning, #b45309)"
        >
          warn: {line}
        </text>
      ))}
    </g>
  ) : null

  const denseReadout = showQualityReadout && compressedPadding ? (
    <text
      x={plotW}
      y={orientation === "vertical" ? -3 : 2}
      fontSize={10}
      fill={CHROME_MUTED}
      textAnchor="end"
    >
      dense layout: lane gaps compressed
    </text>
  ) : null

  const vertical = orientation === "vertical"
  const axisOffset = vertical ? -4 : plotH + 4
  const segment = (time1: number, lane1: number, time2: number, lane2: number) => vertical
    ? { x1: lane1, y1: time1, x2: lane2, y2: time2 }
    : { x1: time1, y1: lane1, x2: time2, y2: lane2 }

  return (
    <g>
      {qualityReadout}
      {denseReadout}
      {visibleTicks.map(({ index, coordinate }) => (
        <line key={`grid-${index}`} {...segment(coordinate, 0, coordinate, vertical ? plotW : plotH)}
          stroke={CHROME_STROKE} strokeOpacity={0.15} strokeDasharray="2 4" />
      ))}
      {showLaneRails && nodes.map((node, index) => {
        const lifetime = laneLifetime[node.id]
        if (!lifetime || lifetime.start === null) return null
        const data = nodeData[node.id]
        const middle = centerlines[node.id] + (data ? (data.botPeak - data.topPeak) * S / 2 : 0)
        const start = xScale(lifetime.start)
        const end = xScale(lifetime.end as number)
        const color = colorOf ? colorOf(node.id, index) : CHROME_STROKE
        return (
          <g key={`lane-${node.id}`}>
            <line {...segment(start, middle, end, middle)} stroke={color} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 3" />
            {[start, end].map((time, endpoint) => <line key={endpoint}
              {...segment(time, middle - 4, time, middle + 4)} stroke={color} strokeOpacity={0.5} />)}
          </g>
        )
      })}
      <line {...segment(axisStart, axisOffset, axisEnd, axisOffset)} stroke={CHROME_STROKE} />
      {visibleTicks.map(({ tick, index, coordinate }) => (
        <g key={index} transform={vertical ? `translate(-4,${coordinate})` : `translate(${coordinate},${axisOffset})`}>
          <line {...(vertical ? { x2: -6 } : { y2: 6 })} stroke={CHROME_STROKE} />
          <text x={vertical ? -10 : undefined} y={vertical ? 4 : 20} textAnchor={vertical ? "end" : "middle"}
            fontSize={11} fill={CHROME_TEXT}>{tickLabel(tick)}</text>
        </g>
      ))}
    </g>
  )
}
