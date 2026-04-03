"use client"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import type { BaseChartProps } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { useChartMode } from "../shared/hooks"
import type { RealtimeFrameHandle } from "../../realtime/types"

// ── Types ─────────────────────────────────────────────────────────────────

export interface GaugeThreshold {
  /** Upper bound of this zone (value, not percentage) */
  value: number
  /** Color for this threshold zone */
  color: string
  /** Optional label for the zone */
  label?: string
}

export interface GaugeChartProps extends BaseChartProps {
  /** Current gauge value */
  value: number
  /** Minimum scale value (default 0) */
  min?: number
  /** Maximum scale value (default 100) */
  max?: number
  /** Threshold zones — ordered list of { value, color, label? }. Last threshold's value should equal max. */
  thresholds?: GaugeThreshold[]
  /** Color of the value arc when no thresholds defined (default: theme primary) */
  color?: string
  /** Background arc color (default: var(--semiotic-grid, #e0e0e0)) */
  backgroundColor?: string
  /** Arc thickness as fraction of radius (0–1, default 0.3) */
  arcWidth?: number
  /** Show needle indicator (default true) */
  showNeedle?: boolean
  /** Needle color (default: var(--semiotic-text, #333)) */
  needleColor?: string
  /** Center content — ReactNode rendered at the gauge center. If not provided, shows the value. */
  centerContent?: React.ReactNode | ((value: number, min: number, max: number) => React.ReactNode)
  /** Format function for the default center value label */
  valueFormat?: (value: number) => string
  /** Show scale tick labels at min, max, and threshold boundaries (default true) */
  showScaleLabels?: boolean
  /** Arc sweep angle in degrees (default 240 — leaves a 120° gap at the bottom) */
  sweep?: number
  /** Enable tooltip on arc segments */
  tooltip?: TooltipProp
  /** Annotations — supports threshold markers via standard annotation system */
  annotations?: Record<string, any>[]
  /** Enable hover interaction (default true) */
  enableHover?: boolean
  /** frameProps escape hatch */
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

// ── Component ─────────────────────────────────────────────────────────────

export const GaugeChart = forwardRef(function GaugeChart(props: GaugeChartProps, ref: React.Ref<RealtimeFrameHandle>) {
  const resolved = useChartMode(props.mode, {
    width: props.width ?? 300,
    height: props.height ?? 250,
    enableHover: props.enableHover ?? true,
    showLegend: false,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
  })

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)

  const {
    value,
    min = 0,
    max = 100,
    thresholds,
    color: fillColor,
    backgroundColor = "var(--semiotic-grid, #e0e0e0)",
    arcWidth = 0.3,
    showNeedle = true,
    needleColor = "var(--semiotic-text, #333)",
    centerContent,
    valueFormat,
    showScaleLabels = true,
    sweep = 240,
    tooltip,
    annotations,
    frameProps = {},
    className,
  } = props

  const width = resolved.width
  const height = resolved.height
  const title = resolved.title
  const description = resolved.description
  const summary = resolved.summary
  const accessibleTable = resolved.accessibleTable

  // Clamp value to [min, max]
  const clampedValue = Math.max(min, Math.min(max, value))
  const range = max - min || 1
  const pct = (clampedValue - min) / range

  // ── Build synthetic ordinal data ──────────────────────────────────────
  // Each threshold zone becomes a category with its proportional arc size.
  // The "remaining" (unfilled) portion of each zone is a separate category.

  const { gaugeData, pieceStyle, gaugeAnnotations } = useMemo(() => {
    const data: Array<{ category: string; value: number; _zone?: string; _isFill: boolean }> = []
    const styles = new Map<string, { fill: string; opacity?: number }>()
    const scaleAnnotations: Record<string, any>[] = []

    // Normalize thresholds: sort by value, clamp to [min, max], ensure last zone reaches max
    let zones = thresholds && thresholds.length > 0
      ? [...thresholds].sort((a, b) => a.value - b.value)
      : [{ value: max, color: fillColor || "var(--semiotic-primary, #007bff)" }]
    // Clamp zone values to [min, max]
    zones = zones.map(z => ({ ...z, value: Math.max(min, Math.min(max, z.value)) }))
    // Ensure the last zone reaches max
    if (zones[zones.length - 1].value < max) {
      zones.push({ value: max, color: zones[zones.length - 1].color })
    }

    // Data values sum to 1.0. pieScene uses sweepAngle to limit the arc.
    // No gap segment needed — the gap is the empty space after the arc ends.
    let prevBound = min
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i]
      const zonePct = (zone.value - prevBound) / range
      const zoneStart = (prevBound - min) / range
      const zoneEnd = (zone.value - min) / range

      const fillEnd = Math.min(pct, zoneEnd)
      const fillPct = Math.max(0, fillEnd - zoneStart)
      const bgPct = zonePct - fillPct

      if (fillPct > 0) {
        const fillKey = `fill-${i}`
        data.push({ category: fillKey, value: fillPct, _zone: zone.label || `Zone ${i + 1}`, _isFill: true })
        styles.set(fillKey, { fill: zone.color })
      }
      if (bgPct > 0) {
        const bgKey = `bg-${i}`
        data.push({ category: bgKey, value: bgPct, _zone: zone.label || `Zone ${i + 1}`, _isFill: false })
        styles.set(bgKey, { fill: backgroundColor, opacity: 0.4 })
      }

      prevBound = zone.value
    }

    // Scale label annotations at threshold boundaries
    if (showScaleLabels && thresholds && thresholds.length > 0) {
      for (const t of thresholds) {
        if (t.value > min && t.value < max) {
          scaleAnnotations.push({
            type: "gauge-label",
            value: t.value,
            label: t.label || String(t.value),
          })
        }
      }
    }

    const styleFn = (d: Record<string, any>, category?: string) => {
      const key = category || d.category
      return styles.get(key) || { fill: backgroundColor }
    }

    return { gaugeData: data, pieceStyle: styleFn, gaugeAnnotations: scaleAnnotations }
  }, [value, min, max, thresholds, fillColor, backgroundColor, pct, range, showScaleLabels])

  // ── Start angle ─────────────────────────────────────────────────────────
  // pieScene.ts: 0° = 12 o'clock, positive = clockwise. Adds startAngle (degrees→radians).
  // Gap centered at 6 o'clock (180°). Gap half-width = (360 - sweep) / 2.
  // Arc starts where the gap ends: 180° + gapHalf = 180° + (360 - sweep) / 2.
  // For 240° sweep: 180 + 60 = 240° (≡ -120° from 12 o'clock = 8 o'clock position).
  const sweepRad = (sweep * Math.PI) / 180
  const gapDeg = 360 - sweep
  const startAngleDegFinal = 180 + gapDeg / 2

  // ── Compute margins to maximize gauge size within widget ──────────────
  // pieScene: outerRadius = min(layoutW, layoutH) / 2 - 4
  // We compute the max R that fits both the arc bounding box AND the square layout.

  const offsetRad = -Math.PI / 2 + (startAngleDegFinal * Math.PI) / 180
  const arcPoints: [number, number][] = [
    [Math.cos(offsetRad), Math.sin(offsetRad)],
    [Math.cos(offsetRad + sweepRad), Math.sin(offsetRad + sweepRad)],
  ]
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
    const norm = ((a - offsetRad) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
    if (norm <= sweepRad + 0.001) arcPoints.push([Math.cos(a), Math.sin(a)])
  }
  arcPoints.push([0, 0])

  const minX = Math.min(...arcPoints.map(p => p[0]))
  const maxX = Math.max(...arcPoints.map(p => p[0]))
  const minY = Math.min(...arcPoints.map(p => p[1]))
  const maxY = Math.max(...arcPoints.map(p => p[1]))
  const arcW = maxX - minX
  const arcH = maxY - minY
  const arcCX = (minX + maxX) / 2
  const arcCY = (minY + maxY) / 2

  const PAD = 10
  // R must satisfy: arc fits in widget AND layout square fits when shifted
  const constraints = [
    (width - 2 * PAD) / arcW,
    (height - 2 * PAD) / arcH,
  ]
  if (1 + arcCY !== 0) constraints.push((height / 2 - 4) / Math.abs(1 + arcCY))
  if (1 - arcCY !== 0) constraints.push((height / 2 - 4) / Math.abs(1 - arcCY))
  if (1 + arcCX !== 0) constraints.push((width / 2 - 4) / Math.abs(1 + arcCX))
  if (1 - arcCX !== 0) constraints.push((width / 2 - 4) / Math.abs(1 - arcCX))

  const radius = Math.min(...constraints)
  const innerRadius = Math.max(10, radius * (1 - arcWidth))
  const S = 2 * (radius + 4)

  const layoutCX = width / 2 - arcCX * radius
  const layoutCY = height / 2 - arcCY * radius
  const marginLeft = Math.max(0, layoutCX - S / 2)
  const marginTop = Math.max(0, layoutCY - S / 2)
  const marginRight = Math.max(0, width - layoutCX - S / 2)
  const marginBottom = Math.max(0, height - layoutCY - S / 2)

  // ── Center content ──────────────────────────────────────────────────────
  const centerEl = useMemo(() => {
    if (centerContent != null) {
      return typeof centerContent === "function" ? centerContent(clampedValue, min, max) : centerContent
    }
    // Default: show value prominently
    const formatted = valueFormat ? valueFormat(clampedValue) : String(Math.round(clampedValue))
    return (
      <div style={{ textAlign: "center", lineHeight: 1.2 }}>
        <div style={{ fontSize: Math.max(16, radius * 0.3), fontWeight: 700, color: "var(--semiotic-text, #333)" }}>
          {formatted}
        </div>
        {showScaleLabels && (
          <div style={{ fontSize: 11, color: "var(--semiotic-text-secondary, #666)" }}>
            {min} – {max}
          </div>
        )}
      </div>
    )
  }, [centerContent, clampedValue, min, max, valueFormat, showScaleLabels, radius])

  // ── Needle SVG ──────────────────────────────────────────────────────────
  const needleAnnotation = useMemo(() => {
    if (!showNeedle) return null
    // pieScene coordinate system: -π/2 = 12 o'clock, then + startAngle (in radians)
    // Needle maps pct [0,1] to [startAngle, startAngle + sweep] in the same frame
    const startRad = -Math.PI / 2 + (startAngleDegFinal * Math.PI) / 180
    const needleAngle = startRad + pct * sweepRad
    const needleLength = innerRadius - 8
    const tipX = Math.cos(needleAngle) * needleLength
    const tipY = Math.sin(needleAngle) * needleLength
    return { type: "gauge-needle", tipX, tipY, color: needleColor }
  }, [showNeedle, pct, startAngleDegFinal, sweepRad, innerRadius, needleColor])

  // Custom SVG annotation rule for gauge-specific annotations
  const svgAnnotationRules = useMemo(() => {
    return (ann: any, index: number, context: any) => {
      if (ann.type === "gauge-needle") {
        const cx = (context.width || width) / 2
        const cy = (context.height || height) / 2
        return (
          <g key={`gauge-needle-${index}`} transform={`translate(${cx},${cy})`}>
            <line x1={0} y1={0} x2={ann.tipX} y2={ann.tipY}
              stroke={ann.color} strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={0} cy={0} r={5} fill={ann.color} />
          </g>
        )
      }
      if (ann.type === "gauge-label") {
        const labelPct = (ann.value - min) / range
        const startRad = -Math.PI / 2 + (startAngleDegFinal * Math.PI) / 180
        const labelAngle = startRad + labelPct * sweepRad
        const labelR = innerRadius - 14
        const cx = (context.width || width) / 2
        const cy = (context.height || height) / 2
        const lx = Math.cos(labelAngle) * labelR
        const ly = Math.sin(labelAngle) * labelR
        return (
          <text key={`gauge-label-${index}`}
            x={cx + lx} y={cy + ly}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fill="var(--semiotic-text-secondary, #666)"
            style={{ userSelect: "none" }}
          >
            {ann.label}
          </text>
        )
      }
      return null
    }
  }, [width, height, min, range, startAngleDegFinal, sweepRad, innerRadius])

  // Combine annotations
  const allAnnotations = useMemo(() => {
    const anns = [...gaugeAnnotations, ...(annotations || [])]
    if (needleAnnotation) anns.push(needleAnnotation)
    return anns
  }, [gaugeAnnotations, annotations, needleAnnotation])

  // ── Default tooltip ──────────────────────────────────────────────────────
  const defaultTooltipContent = useMemo(() => {
    return (d: Record<string, any>) => {
      const datum = d?.data?.[0] || d?.data || d
      const zone = datum?._zone || ""
      const isFill = datum?._isFill
      return (
        <div className="semiotic-tooltip" style={{ padding: "6px 10px", background: "var(--semiotic-tooltip-bg, white)", borderRadius: "var(--semiotic-tooltip-radius, 6px)", boxShadow: "var(--semiotic-tooltip-shadow, 0 2px 8px rgba(0,0,0,0.15))" }}>
          <div style={{ fontWeight: 600 }}>{zone}</div>
          <div style={{ fontSize: "0.85em", color: "var(--semiotic-text-secondary, #666)" }}>
            {isFill ? `Current: ${Math.round(clampedValue)}` : "Remaining"}
          </div>
        </div>
      )
    }
  }, [clampedValue])

  if (gaugeData.length === 0) {
    return <ChartError componentName="GaugeChart" message="No data to display" width={width} height={height} />
  }

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "donut",
    data: gaugeData,
    oAccessor: "category",
    rAccessor: "value",
    projection: "radial",
    pieceStyle,
    innerRadius,
    startAngle: startAngleDegFinal,
    sweepAngle: sweep,
    centerContent: centerEl,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight },
    enableHover: resolved.enableHover,
    showAxes: false,
    showCategoryTicks: false,
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    svgAnnotationRules,
    ...(allAnnotations.length > 0 && { annotations: allAnnotations }),
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    ...frameProps,
  }

  return (
    <SafeRender componentName="GaugeChart" width={width} height={height}>
      <StreamOrdinalFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  (props: GaugeChartProps & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
GaugeChart.displayName = "GaugeChart"
