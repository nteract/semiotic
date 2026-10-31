import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { SceneAccessibilityMetadata, Style } from "./types"
import {
  resolveCanvasFill,
  isNoneCanvasPaint
} from "./renderers/canvasRenderHelpers"

/** Native retained text geometry, with the same anchor/baseline on Canvas and SVG. */
export interface TextSceneNode extends SceneAccessibilityMetadata {
  type: "text"
  id: string
  text: string
  x: number
  y: number
  /** Rotated, anchor-relative occupied bounds. */
  x0: number
  y0: number
  x1: number
  y1: number
  fontFamily: string
  fontSize: number
  fontStyle?: string
  fontWeight?: string | number
  /** Clockwise degrees. */
  rotate?: number
  style: Style
  datum: Datum | null
  interactive?: boolean
  group?: string
  /** @internal Shared intro/transition bookkeeping. Text placement stays discrete. */
  _targetOpacity?: number
  /** @internal */
  _transitionKey?: string
}

/** Paint precomputed text nodes; never measure or place text during rendering. */
export function renderCanvasText(
  ctx: CanvasRenderingContext2D,
  nodes: readonly TextSceneNode[]
): void {
  for (const node of nodes) {
    ctx.save()
    try {
      ctx.translate(node.x, node.y)
      ctx.rotate(((node.rotate ?? 0) * Math.PI) / 180)
      ctx.font = `${node.fontStyle ?? "normal"} ${node.fontWeight ?? "normal"} ${node.fontSize}px ${node.fontFamily}`
      ctx.textAlign = "center"
      ctx.textBaseline = "alphabetic"
      const alpha = ctx.globalAlpha * (node.style.opacity ?? 1)
      ctx.globalAlpha = alpha * (node.style.fillOpacity ?? 1)
      if (!isNoneCanvasPaint(node.style.fill)) {
        ctx.fillStyle = resolveCanvasFill(ctx, node.style.fill, "#333")
        ctx.fillText(node.text, 0, 0)
      }
      if (
        node.style.stroke &&
        node.style.stroke !== "none" &&
        (node.style.strokeWidth ?? 1) > 0
      ) {
        ctx.globalAlpha = alpha * (node.style.strokeOpacity ?? 1)
        ctx.strokeStyle = resolveCanvasFill(ctx, node.style.stroke, "#333")
        ctx.lineWidth = node.style.strokeWidth ?? 1
        ctx.strokeText(node.text, 0, 0)
      }
    } finally {
      ctx.restore()
    }
  }
}

/** SVG uses the exact placement, font, and baseline used for sprite collision. */
export function textSceneNodeToSVG(
  node: TextSceneNode,
  key: React.Key = node.id
): React.ReactElement {
  return (
    <text
      key={key}
      data-word-id={node.id}
      transform={`translate(${node.x},${node.y}) rotate(${node.rotate ?? 0})`}
      textAnchor="middle"
      dominantBaseline="alphabetic"
      fontFamily={node.fontFamily}
      fontSize={node.fontSize}
      fontStyle={node.fontStyle}
      fontWeight={node.fontWeight}
      fill={typeof node.style.fill === "string" ? node.style.fill : "#333"}
      opacity={node.style.opacity}
      fillOpacity={node.style.fillOpacity}
      stroke={node.style.stroke}
      strokeOpacity={node.style.strokeOpacity}
      strokeWidth={node.style.strokeWidth}
      style={node.style.cursor ? { cursor: node.style.cursor } : undefined}
    >
      {node.text}
    </text>
  )
}

/** Bounding-box interaction is intentionally distinct from glyph-pixel collision. */
export function hitTestText(
  node: TextSceneNode,
  x: number,
  y: number
): boolean {
  return (
    node.interactive !== false &&
    node.datum !== null &&
    x >= node.x + node.x0 &&
    x <= node.x + node.x1 &&
    y >= node.y + node.y0 &&
    y <= node.y + node.y1
  )
}
