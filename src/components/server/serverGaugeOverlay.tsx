import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { ServerChartOverlayContext } from "./serverChartConfigShared"

export interface ServerGaugeDescriptor {
  gMin: number
  gMax: number
  sweep: number
  value?: number
  startAngleDeg: number
  thresholds?: Array<{ value: number; color: string; label?: string }>
  centerX: number
  centerY: number
  radius: number
  innerRadius: number
  showScaleLabels: boolean
  needleLength: number
  showNeedle: boolean
  needleColor?: string
  contextValue?: string
  contextValueY?: number
  valueFontSize?: number
}

/** Gauge-owned chrome rendered outside the ordinal scene (needle/readout/ticks). */
export function renderServerGaugeOverlay(
  frameProps: Datum,
  { theme }: ServerChartOverlayContext,
): React.ReactNode {
  const g = frameProps.__gauge as ServerGaugeDescriptor | undefined
  if (!g) return null

  const gaugeValue = Math.max(g.gMin, Math.min(g.gMax, g.value ?? g.gMin))
  const valueFraction = g.gMax === g.gMin ? 0 : (gaugeValue - g.gMin) / (g.gMax - g.gMin)
  const needleAngleRad = (g.startAngleDeg + valueFraction * g.sweep - 90) * Math.PI / 180
  const needleColor = g.needleColor || theme.colors.text
  const scaleLabels = g.showScaleLabels
    ? (g.thresholds || []).filter(t => t.value > g.gMin && t.value < g.gMax)
    : []

  return (
    <>
      {g.showNeedle && <>
        <line
          x1={g.centerX} y1={g.centerY}
          x2={g.centerX + g.needleLength * Math.cos(needleAngleRad)}
          y2={g.centerY + g.needleLength * Math.sin(needleAngleRad)}
          stroke={needleColor} strokeWidth={2.5} strokeLinecap="round"
        />
        <circle cx={g.centerX} cy={g.centerY} r={4} fill={needleColor} />
      </>}
      {g.contextValue != null && (
        <text x={g.centerX} y={g.contextValueY} textAnchor="middle" dominantBaseline="middle"
          fontSize={g.valueFontSize} fontWeight={700} fill={needleColor}>
          {g.contextValue}
        </text>
      )}
      {scaleLabels.map((threshold, index) => {
        const fraction = g.gMax === g.gMin ? 0 : (threshold.value - g.gMin) / (g.gMax - g.gMin)
        const angle = (g.startAngleDeg + fraction * g.sweep - 90) * Math.PI / 180
        const inner = g.innerRadius - 1
        const outer = g.radius + 1
        const labelRadius = g.radius + 10
        const hour = (((angle + Math.PI / 2) / (2 * Math.PI)) * 12 + 12) % 12
        const textAnchor = hour >= 11 || hour < 1 ? "middle" : hour < 5 ? "start" : hour < 7 ? "middle" : "end"
        const dominantBaseline = hour >= 11 || hour < 1 ? "auto" : hour < 5 ? "middle" : hour < 7 ? "hanging" : "middle"
        return <g key={`gauge-label-${index}`}>
          <line
            x1={g.centerX + Math.cos(angle) * inner}
            y1={g.centerY + Math.sin(angle) * inner}
            x2={g.centerX + Math.cos(angle) * outer}
            y2={g.centerY + Math.sin(angle) * outer}
            stroke={theme.colors.border}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <text
            x={g.centerX + Math.cos(angle) * labelRadius}
            y={g.centerY + Math.sin(angle) * labelRadius}
            textAnchor={textAnchor}
            dominantBaseline={dominantBaseline}
            fill={theme.colors.textSecondary}
            fontSize={10}
          >
            {threshold.label || String(threshold.value)}
          </text>
        </g>
      })}
    </>
  )
}
