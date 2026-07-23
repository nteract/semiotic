import type { AreaSceneNode } from "../types"
import { resolveCSSColor } from "./resolveCSSColor"
import type { StreamRendererFn } from "./types"
import { renderPathPulse } from "./renderPulse"
import { area as d3Area, line as d3Line } from "d3-shape"
import {
  buildColorStopGradient,
  buildLinearFillGradient,
  resolveCanvasFill,
  resolveCurveFactory,
} from "./canvasRenderHelpers"
import { buildThresholdLineSegments } from "./thresholdLineSegments"

/**
 * Canvas area renderer.
 * Renders AreaSceneNode as filled regions between topPath and bottomPath.
 * Supports both overlapping areas and stacked areas.
 * Supports d3-shape curve interpolation when node.curve is set.
 */

/** Trace the closed area path (top forward + bottom backward) onto the current context. */
function traceAreaPath(ctx: CanvasRenderingContext2D, node: AreaSceneNode): void {
  const curveFactory = resolveCurveFactory(node.curve)

  if (curveFactory && node.topPath.length >= 2 && node.bottomPath.length >= 2) {
    // Use d3-shape area generator for curved interpolation.
    // Pass topPath as data; derive bottom y via index into bottomPath.
    const areaGenerator = d3Area<[number, number]>()
      .x(d => d[0])
      .y0((_d, i) => node.bottomPath[i][1])
      .y1(d => d[1])
      .curve(curveFactory)
      .context(ctx)

    ctx.beginPath()
    areaGenerator(node.topPath)
  } else {
    // Linear fallback: manual moveTo/lineTo
    ctx.beginPath()
    ctx.moveTo(node.topPath[0][0], node.topPath[0][1])
    for (let i = 1; i < node.topPath.length; i++) {
      ctx.lineTo(node.topPath[i][0], node.topPath[i][1])
    }
    for (let i = node.bottomPath.length - 1; i >= 0; i--) {
      ctx.lineTo(node.bottomPath[i][0], node.bottomPath[i][1])
    }
    ctx.closePath()
  }
}

/** Trace only the area's top edge, using the same curve as its fill. */
function traceAreaTopPath(ctx: CanvasRenderingContext2D, node: AreaSceneNode): void {
  const curveFactory = resolveCurveFactory(node.curve)
  ctx.beginPath()
  if (curveFactory) {
    const lineGenerator = d3Line<[number, number]>()
      .x(d => d[0])
      .y(d => d[1])
      .curve(curveFactory)
      .context(ctx)
    lineGenerator(node.topPath)
  } else {
    ctx.moveTo(node.topPath[0][0], node.topPath[0][1])
    for (let i = 1; i < node.topPath.length; i++) {
      ctx.lineTo(node.topPath[i][0], node.topPath[i][1])
    }
  }
}

export const areaCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const areaNodes = nodes.filter((n): n is AreaSceneNode => n.type === "area")

  for (const node of areaNodes) {
    if (node.topPath.length < 2) continue

    // User-supplied clipRect: hard-clip the area to a rect. Used by custom
    // layouts that want partial reveals, banded highlights, or focus
    // regions. Combined save/restore matches the intro clip's pattern; we
    // track the guard so they nest cleanly.
    let savedForClip = false
    if (node.clipRect) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(node.clipRect.x, node.clipRect.y, node.clipRect.width, node.clipRect.height)
      ctx.clip()
      savedForClip = true
    }

    // Intro clip: reveal area from left to right
    const clipFrac = node._introClipFraction
    if (clipFrac !== undefined && clipFrac < 1) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, layout.width * clipFrac, layout.height)
      ctx.clip()
    }

    // Resolve CSS variables and declarative hatch fills before painting.
    const fillColor = resolveCanvasFill(ctx, node.style.fill, "#4e79a7")
    const decayOpacities = node._decayOpacities
    const hasThresholds = Boolean(
      node.colorThresholds?.length
      && node.rawValues
      && node.rawValues.length === node.topPath.length
    )
    const hasStrokeColorBands = Boolean(node.strokeColorBands?.length)

    // Decay path: render area as vertical strips with per-strip opacity
    if (decayOpacities && decayOpacities.length === node.topPath.length && !hasThresholds && !hasStrokeColorBands) {
      const baseFillOpacity = node.style.fillOpacity ?? 0.7
      ctx.fillStyle = fillColor

      for (let i = 0; i < node.topPath.length - 1; i++) {
        const stripAlpha = (decayOpacities[i] + decayOpacities[i + 1]) * 0.5 * baseFillOpacity
        ctx.globalAlpha = stripAlpha
        ctx.beginPath()
        ctx.moveTo(node.topPath[i][0], node.topPath[i][1])
        ctx.lineTo(node.topPath[i + 1][0], node.topPath[i + 1][1])
        ctx.lineTo(node.bottomPath[i + 1][0], node.bottomPath[i + 1][1])
        ctx.lineTo(node.bottomPath[i][0], node.bottomPath[i][1])
        ctx.closePath()
        ctx.fill()
      }

      // Stroke on top with per-segment decay
      if (node.style.stroke && node.style.stroke !== "none") {
        ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
        ctx.lineWidth = node.style.strokeWidth || 2
        ctx.setLineDash([])
        for (let i = 0; i < node.topPath.length - 1; i++) {
          const segAlpha = (decayOpacities[i] + decayOpacities[i + 1]) * 0.5
          ctx.globalAlpha = segAlpha
          ctx.beginPath()
          ctx.moveTo(node.topPath[i][0], node.topPath[i][1])
          ctx.lineTo(node.topPath[i + 1][0], node.topPath[i + 1][1])
          ctx.stroke()
        }
      }

      ctx.globalAlpha = 1
      continue
    }

    // Standard path (no decay): single filled area
    const nodeOpacity = node.style.opacity ?? 1

    traceAreaPath(ctx, node)

    // Fill
    const useGradient = node.fillGradient && node.fillGradient.stops.length >= 2

    if (useGradient && node.fillGradient) {
      let topY = Infinity
      for (const p of node.topPath) { if (p[1] < topY) topY = p[1] }
      let bottomY = -Infinity
      for (const p of node.bottomPath) { if (p[1] > bottomY) bottomY = p[1] }
      const baseFill = typeof fillColor === "string" ? fillColor : "#4e79a7"
      const grad = buildLinearFillGradient(ctx, node.fillGradient, baseFill, 0, topY, 0, bottomY)
      if (grad) ctx.fillStyle = grad
      else ctx.fillStyle = fillColor
      ctx.globalAlpha = nodeOpacity
    } else {
      const fillOpacity = node.style.fillOpacity ?? 0.7
      ctx.globalAlpha = fillOpacity * nodeOpacity
      ctx.fillStyle = fillColor
    }
    ctx.fill()

    // Pulse overlay — brightened fill flash when aggregated value changes
    if (node._pulseIntensity && node._pulseIntensity > 0) {
      traceAreaPath(ctx, node)
      renderPathPulse(ctx, node)
    }

    // Stroke on top
    if (node.style.stroke && node.style.stroke !== "none") {
      ctx.globalAlpha = nodeOpacity
      const baseStroke = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
      const strokeGrad = !hasThresholds && !hasStrokeColorBands && node.strokeGradient && node.topPath.length >= 2
        ? buildColorStopGradient(
            ctx,
            node.strokeGradient,
            baseStroke,
            node.topPath[0][0], 0,
            node.topPath[node.topPath.length - 1][0], 0,
          )
        : null
      ctx.lineWidth = node.style.strokeWidth || 2
      ctx.setLineDash([])

      if (hasStrokeColorBands) {
        let minX = Infinity
        let maxX = -Infinity
        for (const [x] of node.topPath) {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
        }
        const clipPadding = ctx.lineWidth
        for (const band of node.strokeColorBands!) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(
            minX - clipPadding,
            band.y,
            maxX - minX + clipPadding * 2,
            band.height,
          )
          ctx.clip()
          const bandColor = band.color ?? baseStroke
          ctx.strokeStyle = resolveCSSColor(ctx, bandColor) || bandColor
          traceAreaTopPath(ctx, node)
          ctx.stroke()
          ctx.restore()
        }
      } else if (hasThresholds) {
        const segments = buildThresholdLineSegments(
          node.topPath,
          node.rawValues!,
          node.colorThresholds!,
          baseStroke,
        )
        for (const segment of segments) {
          ctx.beginPath()
          ctx.strokeStyle = resolveCSSColor(ctx, segment.color) || segment.color
          ctx.moveTo(segment.path[0][0], segment.path[0][1])
          for (let i = 1; i < segment.path.length; i++) {
            ctx.lineTo(segment.path[i][0], segment.path[i][1])
          }
          ctx.stroke()
        }
      } else {
        ctx.strokeStyle = strokeGrad || baseStroke
        traceAreaTopPath(ctx, node)
        ctx.stroke()
      }
    }

    // Restore after intro clip
    if (clipFrac !== undefined && clipFrac < 1) {
      ctx.restore()
    }
    // Restore after user clipRect
    if (savedForClip) {
      ctx.restore()
    }

    ctx.globalAlpha = 1
  }
}
