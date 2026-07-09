/**
 * Canvas crosshair + line-highlight paint helpers for StreamXYFrame.
 * Pure drawing — no React / store dependency.
 */

import type { Datum } from "../charts/shared/datumTypes"
import type { HoverData, HoverAnnotationConfig, SceneNode } from "./types"
import type { FrameThemeColors } from "./frameThemeColors"
import { resolveNodeColor } from "./sceneUtils"

export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  hover: HoverData,
  width: number,
  height: number,
  config: HoverAnnotationConfig,
  hoveredNode: SceneNode | null,
  theme: FrameThemeColors
): void {
  const showCrosshair = config.crosshair !== false
  if (!showCrosshair) return

  const allSeries = hover.allSeries
  const isMulti = allSeries && allSeries.length > 0
  const xPx = hover.xPx ?? hover.x

  ctx.save()
  const crossStyle = typeof config.crosshair === "object" ? config.crosshair : {}
  ctx.strokeStyle = crossStyle.stroke || theme.crosshair
  ctx.lineWidth = crossStyle.strokeWidth || 1
  if (crossStyle.strokeDasharray) {
    ctx.setLineDash(crossStyle.strokeDasharray.split(/[\s,]+/).map(Number))
  } else {
    ctx.setLineDash([4, 4])
  }

  // Vertical crosshair line (always)
  ctx.beginPath()
  ctx.moveTo(isMulti ? xPx : hover.x, 0)
  ctx.lineTo(isMulti ? xPx : hover.x, height)
  ctx.stroke()

  // Horizontal crosshair line (single-point mode only)
  if (!isMulti) {
    ctx.beginPath()
    ctx.moveTo(0, hover.y)
    ctx.lineTo(width, hover.y)
    ctx.stroke()
  }

  ctx.restore()

  if (isMulti) {
    // Multi-point mode: draw a dot on each series at its interpolated Y
    ctx.lineWidth = 2
    ctx.strokeStyle = theme.pointRing
    for (const s of allSeries) {
      if (s.valuePx == null) continue
      ctx.beginPath()
      ctx.arc(xPx, s.valuePx, 4, 0, Math.PI * 2)
      ctx.fillStyle = s.color || theme.primary
      ctx.fill()
      ctx.stroke()
    }
  } else {
    // Single-point mode: one dot at the hovered datum.
    // `theme.primary` already resolves from `--semiotic-primary`.
    const pointColor =
      config.pointColor || resolveNodeColor(hoveredNode) || theme.primary
    ctx.beginPath()
    ctx.arc(hover.x, hover.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = pointColor
    ctx.fill()
    ctx.strokeStyle = theme.pointRing
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

export function drawLineHighlight(
  ctx: CanvasRenderingContext2D,
  scene: SceneNode[],
  hoveredNode: SceneNode | null,
  highlightConfig: { style?: Datum | ((d: Datum) => Datum) },
  theme: FrameThemeColors
): void {
  if (!hoveredNode) return

  const hoveredGroup = "group" in hoveredNode ? hoveredNode.group : undefined
  if (hoveredGroup === undefined) return

  for (const node of scene) {
    if (node.type !== "line") continue
    if (node.group !== hoveredGroup) continue
    if (node.path.length < 2) continue

    const rawStyle =
      typeof highlightConfig.style === "function"
        ? node.datum
          ? highlightConfig.style(node.datum)
          : {}
        : highlightConfig.style || {}

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(node.path[0][0], node.path[0][1])
    for (let i = 1; i < node.path.length; i++) {
      ctx.lineTo(node.path[i][0], node.path[i][1])
    }
    ctx.strokeStyle = rawStyle.stroke || node.style.stroke || theme.primary
    ctx.lineWidth = rawStyle.strokeWidth || (node.style.strokeWidth || 2) + 2
    ctx.globalAlpha = rawStyle.opacity ?? 1
    ctx.stroke()
    ctx.restore()
  }
}
