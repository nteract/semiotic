import type { TrapezoidSceneNode, RectSceneNode } from "../ordinalTypes"
import type { OrdinalLayout, OrdinalScales, OrdinalSceneNode } from "../ordinalTypes"

/**
 * Canvas renderer for trapezoid (funnel connector) nodes.
 * Draws filled quadrilaterals connecting consecutive funnel steps.
 */
export const trapezoidCanvasRenderer = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  _scales: OrdinalScales,
  _layout: OrdinalLayout
): void => {
  const trapNodes = nodes.filter((n): n is TrapezoidSceneNode => n.type === "trapezoid")

  for (const node of trapNodes) {
    const pts = node.points
    if (pts.length < 4) continue

    ctx.globalAlpha = node.style?.opacity ?? 1

    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1])
    }
    ctx.closePath()

    ctx.fillStyle = node.style?.fill || "#999"
    ctx.fill()

    if (node.style?.stroke) {
      ctx.strokeStyle = node.style.stroke
      ctx.lineWidth = node.style.strokeWidth || 1
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }
}

// Minimum bar width in pixels before we suppress that bar's value label.
// Also used as a baseline — actual suppression also measures text width vs bar width.
const MIN_VALUE_LABEL_BAR_WIDTH = 60

// Padding (px) inside bar edges — label must fit within bar minus this padding
const LABEL_INSET = 8

/**
 * Canvas renderer for funnel labels.
 *
 * Renders white text with dark outline (matching reference images):
 *  - Step name: bold, centered at row top, shown once per step
 *  - Value (percent): bold, centered in each bar. Suppressed if text overflows bar.
 *    First step suppresses "(100%)" since it's always 100%.
 */
export const funnelLabelRenderer = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  _scales: OrdinalScales,
  _layout: OrdinalLayout
): void => {
  const rects = nodes.filter(
    (n): n is RectSceneNode => n.type === "rect" && n.datum != null
  )

  // Check if any rect has label metadata (showLabels was on)
  if (rects.length === 0 || !rects.some(r => r.datum.__funnelStepLabel != null || r.datum.__funnelValueLabelX != null)) {
    return
  }

  const stepFontSize = 14
  const valueFontSize = 13
  ctx.textBaseline = "top"
  ctx.lineJoin = "round"

  // Pass 1: Step name labels (one per step row)
  // Collect the total row width per step to decide if step name fits
  ctx.textAlign = "center"
  ctx.font = `bold ${stepFontSize}px sans-serif`
  for (const node of rects) {
    const d = node.datum
    if (!d.__funnelStepLabel) continue

    // Measure text vs available row width (sum of all bars in this step row)
    const labelText = d.__funnelStepLabel
    const textW = ctx.measureText(labelText).width
    const rowW = d.__funnelRowWidth ?? d.__funnelBarW ?? 0
    // Suppress step label if text would overflow the widest bar in the row
    if (textW + LABEL_INSET * 2 > rowW) continue

    const lx = d.__funnelStepLabelX
    const ly = d.__funnelStepLabelY + 3

    // Dark outline
    ctx.strokeStyle = "rgba(0,0,0,0.6)"
    ctx.lineWidth = 3
    ctx.strokeText(labelText, lx, ly)

    // White fill
    ctx.fillStyle = "#fff"
    ctx.fillText(labelText, lx, ly)
  }

  // Pass 2: Value labels (one per bar)
  ctx.font = `bold ${valueFontSize}px sans-serif`
  for (const node of rects) {
    const d = node.datum
    if (d.__funnelValueLabelX == null) continue

    const barW = d.__funnelBarW ?? 0
    // Hard minimum — don't even try on very narrow bars
    if (barW < MIN_VALUE_LABEL_BAR_WIDTH) continue

    const value = d.__funnelValue
    if (value == null || value === 0) continue

    const pct = d.__funnelPercent
    const isFirstStep = d.__funnelIsFirstStep === true

    // First step: just show value (suppress "100%")
    // Other steps: "value (XX%)"
    let valueStr: string
    if (isFirstStep) {
      valueStr = formatNumber(value)
    } else if (pct != null) {
      valueStr = `${formatNumber(value)} (${formatPercent(pct)})`
    } else {
      valueStr = formatNumber(value)
    }

    // Measure text width — suppress if it would overflow the bar
    const textW = ctx.measureText(valueStr).width
    if (textW + LABEL_INSET * 2 > barW) {
      // Try shorter form: just the value without percent
      if (!isFirstStep && pct != null) {
        valueStr = formatNumber(value)
        const shortW = ctx.measureText(valueStr).width
        if (shortW + LABEL_INSET * 2 > barW) continue
      } else {
        continue
      }
    }

    const lx = d.__funnelValueLabelX
    const ly = (d.__funnelValueLabelY ?? node.y) + stepFontSize + 5

    ctx.textAlign = "center"

    // Dark outline
    ctx.strokeStyle = "rgba(0,0,0,0.5)"
    ctx.lineWidth = 3
    ctx.strokeText(valueStr, lx, ly)

    // White fill
    ctx.fillStyle = "#fff"
    ctx.fillText(valueStr, lx, ly)
  }

  // Reset
  ctx.lineWidth = 1
  ctx.lineJoin = "miter"
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 10000) return `${(n / 1000).toFixed(0)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function formatPercent(pct: number): string {
  // Whole number if close to integer, otherwise one decimal
  if (Math.abs(pct - Math.round(pct)) < 0.05) {
    return `${Math.round(pct)}%`
  }
  return `${pct.toFixed(1)}%`
}
