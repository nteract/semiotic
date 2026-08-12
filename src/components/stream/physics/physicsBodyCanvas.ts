/**
 * Canvas body drawing + pop animations for StreamPhysicsFrame.
 * Pure paint helpers — no React / store dependency.
 */

import type { Style } from "../types"
import type { PhysicsBodyState } from "./PhysicsKernel"
import { coerceCanvasFill } from "../renderers/canvasRenderHelpers"

/**
 * Body mark kinds for process identity without custom renderBody.
 * Set via bodyStyle.mark or datum.__physicsMark / datum.mark.
 */
export type PhysicsBodyMark =
  | "circle"
  | "halo"
  | "faceted"
  | "pill"
  | "diamond"
  | "square"

export interface StreamPhysicsPopOptions {
  color?: string
  durationMs?: number
  radius?: number
  /**
   * Uniform multiplier on the whole burst geometry (ring + sparks). Defaults to
   * 1. Shrink it for small charts — a sparkline can't hold a context-scale
   * burst — without changing the removed body's `radius`.
   */
  scale?: number
}

export interface StreamPhysicsPopAnimation {
  body: PhysicsBodyState
  color: string
  durationMs: number
  radius: number
  scale: number
  startedAt: number
}

export function resolveBodyMark(
  body: PhysicsBodyState,
  style: Style
): PhysicsBodyMark {
  const fromStyle = (style as Style & { mark?: PhysicsBodyMark }).mark
  if (fromStyle) return fromStyle
  const datum = body.datum as Record<string, unknown> | undefined
  const fromDatum = datum?.__physicsMark ?? datum?.mark
  if (
    fromDatum === "circle" ||
    fromDatum === "halo" ||
    fromDatum === "faceted" ||
    fromDatum === "pill" ||
    fromDatum === "diamond" ||
    fromDatum === "square"
  ) {
    return fromDatum
  }
  return body.shape.type === "circle" ? "circle" : "square"
}

export function drawBody(
  ctx: CanvasRenderingContext2D,
  body: PhysicsBodyState,
  style: Style
): void {
  const fill = coerceCanvasFill(ctx, style.fill) ?? "#4e79a7"
  const resolvedStroke = coerceCanvasFill(ctx, style.stroke)
  // `"none"` is truthy: without this guard canvas rejects `strokeStyle =
  // "none"`, silently keeps the default black, and still strokes — drawing a
  // black ring where SVG (stroke="none") paints nothing.
  const stroke = resolvedStroke !== "none" ? resolvedStroke : undefined
  const strokeWidth = style.strokeWidth ?? 0
  const opacity = style.opacity ?? 1
  const fillOpacity = style.fillOpacity ?? 1
  const mark = resolveBodyMark(body, style)
  const radius =
    body.shape.type === "circle"
      ? (style.r ?? body.shape.radius)
      : Math.max(body.shape.width, body.shape.height) / 2

  ctx.save()
  ctx.globalAlpha *= opacity
  ctx.beginPath()
  if (mark === "pill" || mark === "square" || body.shape.type === "aabb") {
    const w =
      mark === "pill"
        ? radius * 2.4
        : body.shape.type === "aabb"
          ? body.shape.width
          : radius * 1.7
    const h =
      mark === "pill"
        ? radius * 1.35
        : body.shape.type === "aabb"
          ? body.shape.height
          : radius * 1.7
    const x = body.x - w / 2
    const y = body.y - h / 2
    const rr = mark === "pill" ? h / 2 : Math.min(4, w / 4)
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
  } else if (mark === "diamond") {
    ctx.moveTo(body.x, body.y - radius)
    ctx.lineTo(body.x + radius, body.y)
    ctx.lineTo(body.x, body.y + radius)
    ctx.lineTo(body.x - radius, body.y)
    ctx.closePath()
  } else if (mark === "faceted") {
    const n = 6
    for (let i = 0; i < n; i += 1) {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2
      const px = body.x + Math.cos(a) * radius
      const py = body.y + Math.sin(a) * radius
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  } else {
    // circle + halo
    ctx.arc(body.x, body.y, radius, 0, Math.PI * 2)
  }

  if (fill) {
    ctx.save()
    ctx.globalAlpha *= fillOpacity
    ctx.fillStyle = fill
    ctx.fill()
    ctx.restore()
  }
  if (mark === "halo" && (strokeWidth ?? 1.5) > 0) {
    ctx.beginPath()
    ctx.arc(body.x, body.y, radius * 1.35, 0, Math.PI * 2)
    ctx.strokeStyle = stroke ?? fill
    ctx.lineWidth = Math.max(1.5, strokeWidth ?? 1.5)
    ctx.globalAlpha *= 0.55
    ctx.stroke()
    ctx.globalAlpha /= 0.55
  }
  if (stroke && strokeWidth > 0) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = strokeWidth
    if (style.strokeDasharray) {
      ctx.setLineDash(
        style.strokeDasharray
          .split(/[,\s]+/)
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
      )
    }
    ctx.stroke()
  }
  ctx.restore()
}

export function physicsBodyRadius(body: PhysicsBodyState): number {
  if (body.shape.type === "circle") return body.shape.radius
  return Math.max(body.shape.width, body.shape.height) / 2
}

function bodyDrawRadius(body: PhysicsBodyState, style: Style): number {
  return body.shape.type === "circle"
    ? (style.r ?? body.shape.radius)
    : Math.max(body.shape.width, body.shape.height) / 2
}

function bodyStrokePadding(style: Style): number {
  return style.stroke && style.stroke !== "none" && (style.strokeWidth ?? 0) > 0
    ? (style.strokeWidth ?? 0) / 2
    : 0
}

function roundedRectContains(
  body: PhysicsBodyState,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  padding: number
): boolean {
  const halfWidth = width / 2 + padding
  const halfHeight = height / 2 + padding
  const dx = Math.abs(x - body.x)
  const dy = Math.abs(y - body.y)
  if (dx > halfWidth || dy > halfHeight) return false
  const corner = Math.min(radius + padding, halfWidth, halfHeight)
  if (dx <= halfWidth - corner || dy <= halfHeight - corner) return true
  const cornerDx = dx - (halfWidth - corner)
  const cornerDy = dy - (halfHeight - corner)
  return cornerDx * cornerDx + cornerDy * cornerDy <= corner * corner
}

function regularHexagonContains(
  body: PhysicsBodyState,
  x: number,
  y: number,
  radius: number
): boolean {
  const dx = Math.abs(x - body.x)
  const dy = Math.abs(y - body.y)
  // The drawn point-up regular hexagon has vertical radius r and horizontal
  // radius sqrt(3)r/2.
  const halfWidth = (Math.sqrt(3) * radius) / 2
  if (dx > halfWidth || dy > radius) return false
  return dy <= radius - dx / Math.sqrt(3)
}

/** Circumscribed center radius for the built-in canvas mark. */
export function physicsBodyVisualSearchRadius(
  body: PhysicsBodyState,
  style: Style
): number {
  const mark = resolveBodyMark(body, style)
  const radius = bodyDrawRadius(body, style)
  const padding = bodyStrokePadding(style)
  if (mark === "pill" || mark === "square" || body.shape.type === "aabb") {
    const width =
      mark === "pill"
        ? radius * 2.4
        : body.shape.type === "aabb"
          ? body.shape.width
          : radius * 1.7
    const height =
      mark === "pill"
        ? radius * 1.35
        : body.shape.type === "aabb"
          ? body.shape.height
          : radius * 1.7
    return Math.hypot(width / 2 + padding, height / 2 + padding)
  }
  if (mark === "halo" && (style.strokeWidth ?? 0) > 0) {
    return radius * 1.35 + Math.max(1.5, style.strokeWidth ?? 1.5) / 2
  }
  return radius + padding
}

/** Exact built-in canvas mark hit, including authored radius/shape. */
export function physicsBodyVisualHitDistanceSquared(
  body: PhysicsBodyState,
  style: Style,
  x: number,
  y: number
): number | null {
  const mark = resolveBodyMark(body, style)
  const radius = bodyDrawRadius(body, style)
  const padding = bodyStrokePadding(style)
  const dx = x - body.x
  const dy = y - body.y
  let hit = false

  if (mark === "pill" || mark === "square" || body.shape.type === "aabb") {
    const width =
      mark === "pill"
        ? radius * 2.4
        : body.shape.type === "aabb"
          ? body.shape.width
          : radius * 1.7
    const height =
      mark === "pill"
        ? radius * 1.35
        : body.shape.type === "aabb"
          ? body.shape.height
          : radius * 1.7
    const corner = mark === "pill" ? height / 2 : Math.min(4, width / 4)
    hit = roundedRectContains(body, x, y, width, height, corner, padding)
  } else if (mark === "diamond") {
    hit = Math.abs(dx) + Math.abs(dy) <= radius + padding * Math.SQRT2
  } else if (mark === "faceted") {
    hit = regularHexagonContains(body, x, y, radius + padding)
  } else {
    const hitRadius =
      mark === "halo" && (style.strokeWidth ?? 0) > 0
        ? radius * 1.35 + Math.max(1.5, style.strokeWidth ?? 1.5) / 2
        : radius + padding
    hit = dx * dx + dy * dy <= hitRadius * hitRadius
  }

  return hit ? dx * dx + dy * dy : null
}

export function drawPopAnimations(
  ctx: CanvasRenderingContext2D,
  animations: Map<string, StreamPhysicsPopAnimation>,
  now: number
): boolean {
  let active = false
  for (const [id, animation] of animations) {
    const t = Math.min(
      1,
      Math.max(0, (now - animation.startedAt) / animation.durationMs)
    )
    if (t >= 1) {
      animations.delete(id)
      continue
    }
    active = true
    const easeOut = 1 - Math.pow(1 - t, 3)
    const { body } = animation
    // One multiplier scales the entire burst so it stays proportional in a
    // sparkline; default 1 leaves context/primary bursts unchanged.
    const scale = animation.scale > 0 ? animation.scale : 1
    const radius = (animation.radius + 28 * easeOut) * scale
    const alpha = 1 - t

    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.strokeStyle = animation.color
    ctx.fillStyle = animation.color
    ctx.lineWidth = Math.max(0.5, (2.4 * alpha + 0.4) * scale)
    ctx.beginPath()
    ctx.arc(body.x, body.y, radius, 0, Math.PI * 2)
    ctx.stroke()

    ctx.globalAlpha *= 0.18
    ctx.beginPath()
    ctx.arc(body.x, body.y, radius * 0.52, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.strokeStyle = animation.color
    ctx.lineWidth = Math.max(0.5, 1.8 * scale)
    for (let index = 0; index < 8; index += 1) {
      const angle = index * (Math.PI / 4) + t * 1.4
      const inner = (animation.radius + 5 + easeOut * 12) * scale
      const outer = (animation.radius + 12 + easeOut * 34) * scale
      ctx.beginPath()
      ctx.moveTo(
        body.x + Math.cos(angle) * inner,
        body.y + Math.sin(angle) * inner
      )
      ctx.lineTo(
        body.x + Math.cos(angle) * outer,
        body.y + Math.sin(angle) * outer
      )
      ctx.stroke()
    }
    ctx.restore()
  }
  return active
}
