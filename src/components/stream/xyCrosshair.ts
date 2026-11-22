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
  const xPx = isMulti ? hover.xPx ?? hover.x : hover.x

  ctx.save()
  const crossStyle = typeof config.crosshair === "object" ? config.crosshair : {}
  ctx.strokeStyle = crossStyle.stroke || theme.crosshair
  const crosshairStrokeWidth = crossStyle.strokeWidth ?? 1
  if (crossStyle.strokeDasharray) {
    ctx.setLineDash(crossStyle.strokeDasharray.split(/[\s,]+/).map(Number))
  } else {
    ctx.setLineDash([4, 4])
  }

  if (crosshairStrokeWidth > 0) {
    ctx.lineWidth = crosshairStrokeWidth
    const strokeLine = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    strokeLine(xPx, 0, xPx, height)
    if (!isMulti) strokeLine(0, hover.y, width, hover.y)
  }

  ctx.restore()

  ctx.lineWidth = 2
  ctx.strokeStyle = theme.pointRing
  const drawDot = (y: number, color: string) => {
    ctx.beginPath()
    ctx.arc(xPx, y, 4, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.stroke()
  }
  if (isMulti) {
    for (const row of allSeries) {
      if (row.valuePx != null) drawDot(row.valuePx, row.color || theme.primary)
    }
  } else {
    drawDot(hover.y, config.pointColor || resolveNodeColor(hoveredNode) || theme.primary)
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
    const lineWidth = rawStyle.strokeWidth ?? (node.style.strokeWidth ?? 2) + 2
    if (lineWidth <= 0) {
      ctx.restore()
      continue
    }
    ctx.lineWidth = lineWidth
    ctx.globalAlpha = rawStyle.opacity ?? 1
    ctx.stroke()
    ctx.restore()
  }
}
