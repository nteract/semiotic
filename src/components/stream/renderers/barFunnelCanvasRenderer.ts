import type { RectSceneNode } from "../ordinalTypes"
import type { OrdinalLayout, OrdinalScales, OrdinalSceneNode } from "../ordinalTypes"
import { createHatchPattern } from "../../charts/shared/hatchPattern"

/**
 * Canvas renderer that applies diagonal-line hatching to bar-funnel dropoff bars.
 *
 * Runs AFTER the default barCanvasRenderer. It redraws only the dropoff rects
 * (those with datum.__barFunnelIsDropoff === true) using a hatch pattern whose
 * background matches the bar's solid fill color.
 */

// Cache hatch patterns by base color to avoid re-creating them every frame
const hatchCache = new Map<string, CanvasPattern | null>()

function getHatchForColor(
  baseColor: string,
  ctx: CanvasRenderingContext2D
): CanvasPattern | null {
  const cached = hatchCache.get(baseColor)
  if (cached !== undefined) return cached
  const pattern = createHatchPattern(
    {
      background: baseColor,
      stroke: "rgba(255,255,255,0.5)",
      lineWidth: 1.5,
      spacing: 6,
      angle: 45,
    },
    ctx
  )
  hatchCache.set(baseColor, pattern)
  return pattern
}

export const barFunnelHatchRenderer = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  _scales: OrdinalScales,
  _layout: OrdinalLayout
): void => {
  const dropoffRects = nodes.filter(
    (n): n is RectSceneNode =>
      n.type === "rect" && n.datum?.__barFunnelIsDropoff === true
  )

  for (const node of dropoffRects) {
    const baseColor =
      typeof node.style.fill === "string" ? node.style.fill : "#999"
    const hatch = getHatchForColor(baseColor, ctx)

    ctx.globalAlpha = node.style.opacity ?? 1
    ctx.beginPath()
    ctx.rect(node.x, node.y, node.w, node.h)

    if (hatch) {
      ctx.fillStyle = hatch
    } else {
      // Fallback: lighter version of the base color
      ctx.fillStyle = baseColor
      ctx.globalAlpha = (node.style.opacity ?? 1) * 0.4
    }
    ctx.fill()

    ctx.globalAlpha = 1
  }
}

/**
 * Canvas renderer for bar-funnel labels.
 *
 * Draws a floating label above each bar (or bar group) showing:
 *  - Bold percentage (of first step)
 *  - Raw value below it
 *
 * Labels appear on a white rounded-rect background (matching the reference images).
 */
export const barFunnelLabelRenderer = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  _scales: OrdinalScales,
  _layout: OrdinalLayout
): void => {
  // Only draw labels for non-dropoff rects that have label metadata
  const labelRects = nodes.filter(
    (n): n is RectSceneNode =>
      n.type === "rect" &&
      n.datum?.__barFunnelIsDropoff !== true &&
      n.datum?.__barFunnelLabelX != null
  )

  if (labelRects.length === 0) return

  const pctFontSize = 13
  const valFontSize = 11
  const padH = 6
  const padV = 3
  const lineGap = 2
  const cornerRadius = 4

  // Minimum bar width (px) before label is suppressed entirely
  const MIN_LABEL_BAR_WIDTH = 25

  for (const node of labelRects) {
    const d = node.datum
    const value = d.__barFunnelValue
    if (value == null) continue

    // Suppress label if bar is too narrow
    if (node.w < MIN_LABEL_BAR_WIDTH) continue

    const pct = d.__barFunnelPercent
    const isFirst = d.__barFunnelIsFirstStep === true

    // First step: show only the value (it's always 100%, no need to state it)
    const showPct = !isFirst && pct != null
    const pctStr = showPct ? formatPercent(pct) : ""
    const valStr = formatNumber(value)

    // Measure text widths
    ctx.font = `bold ${pctFontSize}px sans-serif`
    const pctW = showPct ? ctx.measureText(pctStr).width : 0
    ctx.font = `${valFontSize}px sans-serif`
    const valW = ctx.measureText(valStr).width

    // Compute label box dimensions — single line for first step, two lines otherwise
    const contentW = Math.max(pctW, valW)
    const labelW = contentW + padH * 2
    const labelH = showPct
      ? pctFontSize + valFontSize + lineGap + padV * 2
      : valFontSize + padV * 2

    const lx = d.__barFunnelLabelX
    const ly = d.__barFunnelLabelY

    // Position label above the bar, centered
    const boxX = lx - labelW / 2
    const boxY = ly - labelH - 4

    // White background with subtle shadow
    ctx.save()
    ctx.shadowColor = "rgba(0,0,0,0.15)"
    ctx.shadowBlur = 4
    ctx.shadowOffsetY = 1
    ctx.fillStyle = "rgba(255,255,255,0.95)"
    ctx.beginPath()
    roundedRect(ctx, boxX, boxY, labelW, labelH, cornerRadius)
    ctx.fill()
    ctx.restore()

    // Subtle border
    ctx.strokeStyle = "rgba(0,0,0,0.12)"
    ctx.lineWidth = 0.5
    ctx.beginPath()
    roundedRect(ctx, boxX, boxY, labelW, labelH, cornerRadius)
    ctx.stroke()

    ctx.textAlign = "center"
    ctx.textBaseline = "top"

    if (showPct) {
      // Two-line label: bold percentage + value
      ctx.font = `bold ${pctFontSize}px sans-serif`
      ctx.fillStyle = "#333"
      ctx.fillText(pctStr, lx, boxY + padV)

      ctx.font = `${valFontSize}px sans-serif`
      ctx.fillStyle = "#666"
      ctx.fillText(valStr, lx, boxY + padV + pctFontSize + lineGap)
    } else {
      // Single-line label: just value
      ctx.font = `bold ${valFontSize}px sans-serif`
      ctx.fillStyle = "#333"
      ctx.fillText(valStr, lx, boxY + padV)
    }
  }

  ctx.lineWidth = 1
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 10000) return `${(n / 1000).toFixed(0)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(Math.round(n))
}

function formatPercent(pct: number): string {
  if (Math.abs(pct - Math.round(pct)) < 0.05) {
    return `${Math.round(pct)}%`
  }
  return `${pct.toFixed(1)}%`
}
