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
}

export interface StreamPhysicsPopAnimation {
  body: PhysicsBodyState
  color: string
  durationMs: number
  radius: number
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
  const stroke = style.stroke
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
  if (mark === "halo") {
    ctx.beginPath()
    ctx.arc(body.x, body.y, radius * 1.35, 0, Math.PI * 2)
    ctx.strokeStyle = stroke ?? fill
    ctx.lineWidth = Math.max(1.5, strokeWidth || 1.5)
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
    const radius = animation.radius + 28 * easeOut
    const alpha = 1 - t

    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.strokeStyle = animation.color
    ctx.fillStyle = animation.color
    ctx.lineWidth = 2.4 * alpha + 0.4
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
    ctx.lineWidth = 1.8
    for (let index = 0; index < 8; index += 1) {
      const angle = index * (Math.PI / 4) + t * 1.4
      const inner = animation.radius + 5 + easeOut * 12
      const outer = animation.radius + 12 + easeOut * 34
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
