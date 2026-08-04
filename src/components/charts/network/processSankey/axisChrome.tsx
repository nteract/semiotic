/**
 * Shared ProcessSankey background chrome (time axis, grid, quality readout,
 * optional lane rails). Used by the client HOC and the SSR config so both
 * paths paint identical theme-token chrome.
 */
import * as React from "react"
import type { ProcessSankeyLayout } from "./algorithm"
import type { ProcessSankeyOrientation } from "./orientation"
import type { ProcessSankeyNormalizedNode } from "./buildScenes"

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
  axisTicks: readonly ProcessSankeyTickInput[]
  showQualityReadout?: boolean
  showLaneRails?: boolean
  /** Non-fatal validation messages for the quality readout (M6). */
  warnings?: readonly string[]
  timeFormat?: (d: Date) => string | React.ReactNode
  colorOf?: (id: string, idx: number) => string
  toTime: (value: number | Date | string | undefined | null) => number
  xScale: (t: number) => number
}

export function buildProcessSankeyBackgroundGraphics(
  input: BuildProcessSankeyBackgroundGraphicsInput,
): React.ReactElement {
  // Destructure only from `input` (never an outer `opts` alias) so HMR cannot
  // resurrect a stale ReferenceError from intermediate refactors.
  const layout = input.layout
  const nodes = input.nodes
  const orientation = input.orientation
  const plotW = input.plotW
  const plotH = input.plotH
  const timelineExtent = input.timelineExtent
  const axisTicks = input.axisTicks
  const showQualityReadout = input.showQualityReadout ?? false
  const showLaneRails = input.showLaneRails ?? false
  const warningLines = (input.warnings ?? []).slice(0, 3)
  const timeFormat = input.timeFormat
  const colorOf = input.colorOf
  const toTime = input.toTime
  const xScale = input.xScale
  const {
    centerlines, laneLifetime, nodeData, valueScale: S, compressedPadding,
    crossingsBefore, crossingsAfter, layoutQualityBefore, layoutQuality,
  } = layout

  let dataMinTime: number | null = null
  let dataMaxTime: number | null = null
  for (const n of nodes) {
    const lt = laneLifetime[n.id]
    if (!lt || lt.start === null || lt.end === null) continue
    const start = xScale(lt.start as number)
    const end = xScale(lt.end as number)
    if (dataMinTime === null || start < dataMinTime) dataMinTime = start
    if (dataMaxTime === null || end > dataMaxTime) dataMaxTime = end
  }
  const clampTimeCoord = (value: number): number => Math.max(0, Math.min(timelineExtent, value))
  const axisStart = clampTimeCoord(dataMinTime ?? 0)
  const axisEnd = Math.max(axisStart, clampTimeCoord(dataMaxTime ?? timelineExtent))
  const visibleTicks = axisTicks.map((tick, index) => ({
    tick,
    index,
    coordinate: xScale(toTime(tick.date)),
  })).filter(({ coordinate }) => coordinate >= axisStart - 0.5 && coordinate <= axisEnd + 0.5)

  const hasMetrics = (crossingsAfter ?? null) !== null &&
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

  const denseReadout = compressedPadding ? (
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

  const railColor = (id: string, idx: number) =>
    colorOf ? colorOf(id, idx) : CHROME_STROKE

  if (orientation === "vertical") {
    return (
      <g>
        {qualityReadout}
        {denseReadout}
        {visibleTicks.map(({ index, coordinate }) => (
          <line
            key={`grid-${index}`}
            x1={0} y1={coordinate} x2={plotW} y2={coordinate}
            stroke={CHROME_STROKE} strokeOpacity={0.15} strokeDasharray="2 4"
          />
        ))}
        {showLaneRails && nodes.map((n, idx) => {
          const lt = laneLifetime[n.id]
          if (!lt || lt.start === null) return null
          const cl = centerlines[n.id]
          const data = nodeData[n.id]
          const peak = data ? { topPeak: data.topPeak, botPeak: data.botPeak } : { topPeak: 0, botPeak: 0 }
          const visualMid = cl + ((peak.botPeak - peak.topPeak) * S) / 2
          const y0 = xScale(lt.start as number)
          const y1 = xScale(lt.end as number)
          const c = railColor(n.id, idx)
          return (
            <g key={`lane-${n.id}`}>
              <line x1={visualMid} y1={y0} x2={visualMid} y2={y1}
                stroke={c} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 3" />
              <line x1={visualMid - 4} y1={y0} x2={visualMid + 4} y2={y0} stroke={c} strokeOpacity={0.5} />
              <line x1={visualMid - 4} y1={y1} x2={visualMid + 4} y2={y1} stroke={c} strokeOpacity={0.5} />
            </g>
          )
        })}
        <line x1={-4} y1={axisStart} x2={-4} y2={axisEnd} stroke={CHROME_STROKE} />
        {visibleTicks.map(({ tick, index, coordinate }) => {
          const t = toTime(tick.date)
          const label = tick.label != null
            ? tick.label
            : (timeFormat ? timeFormat(new Date(t)) : "")
          return (
            <g key={index} transform={`translate(-4,${coordinate})`}>
              <line x2={-6} stroke={CHROME_STROKE} />
              <text x={-10} y={4} textAnchor="end" fontSize={11} fill={CHROME_TEXT}>{label as React.ReactNode}</text>
            </g>
          )
        })}
      </g>
    )
  }

  return (
    <g>
      {qualityReadout}
      {denseReadout}
      {visibleTicks.map(({ index, coordinate }) => (
        <line
          key={`grid-${index}`}
          x1={coordinate} y1={0} x2={coordinate} y2={plotH}
          stroke={CHROME_STROKE} strokeOpacity={0.15} strokeDasharray="2 4"
        />
      ))}
      {showLaneRails && nodes.map((n, idx) => {
        const lt = laneLifetime[n.id]
        if (!lt || lt.start === null) return null
        const cl = centerlines[n.id]
        const data = nodeData[n.id]
        const peak = data ? { topPeak: data.topPeak, botPeak: data.botPeak } : { topPeak: 0, botPeak: 0 }
        const visualMid = cl + ((peak.botPeak - peak.topPeak) * S) / 2
        const x0 = xScale(lt.start as number)
        const x1 = xScale(lt.end as number)
        const c = railColor(n.id, idx)
        return (
          <g key={`lane-${n.id}`}>
            <line x1={x0} y1={visualMid} x2={x1} y2={visualMid}
              stroke={c} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 3" />
            <line x1={x0} y1={visualMid - 4} x2={x0} y2={visualMid + 4} stroke={c} strokeOpacity={0.5} />
            <line x1={x1} y1={visualMid - 4} x2={x1} y2={visualMid + 4} stroke={c} strokeOpacity={0.5} />
          </g>
        )
      })}
      <line x1={axisStart} y1={plotH + 4} x2={axisEnd} y2={plotH + 4} stroke={CHROME_STROKE} />
      {visibleTicks.map(({ tick, index, coordinate }) => {
        const t = toTime(tick.date)
        const label = tick.label != null
          ? tick.label
          : (timeFormat ? timeFormat(new Date(t)) : "")
        return (
          <g key={index} transform={`translate(${coordinate},${plotH + 4})`}>
            <line y2={6} stroke={CHROME_STROKE} />
            <text y={20} textAnchor="middle" fontSize={11} fill={CHROME_TEXT}>{label as React.ReactNode}</text>
          </g>
        )
      })}
    </g>
  )
}
