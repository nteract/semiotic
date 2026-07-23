import type { LineSceneNode } from "../types"
import { resolveCSSColor } from "./resolveCSSColor"
import type { StreamRendererFn } from "./types"
import { line as d3Line } from "d3-shape"
import { buildColorStopGradient, resolveCanvasFill, resolveCurveFactory } from "./canvasRenderHelpers"
import { buildThresholdLineSegments } from "./thresholdLineSegments"

/**
 * Render a line segment with edge-fade effect.
 * The first and last portions of the path fade from full opacity to transparent,
 * giving the visual impression that the line disappears at the projection edge
 * (used for anti-meridian split segments in geo charts).
 */
function renderEdgeFadeLine(
  ctx: CanvasRenderingContext2D,
  path: [number, number][],
  baseColor: string,
  lineWidth: number,
  baseOpacity: number,
  linecap: CanvasLineCap
): void {
  if (path.length < 2) return

  // Compute cumulative distances along the path
  const cumDist: number[] = [0]
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i - 1][0]
    const dy = path[i][1] - path[i - 1][1]
    cumDist.push(cumDist[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  const totalLen = cumDist[cumDist.length - 1]
  if (totalLen === 0) return

  // Fade distance: 20% of total length on each end, capped at 40px
  const fadeLen = Math.min(totalLen * 0.2, 40)

  ctx.strokeStyle = baseColor
  ctx.lineWidth = lineWidth
  ctx.lineCap = linecap

  // Render segment-by-segment with per-segment opacity
  for (let i = 0; i < path.length - 1; i++) {
    const midDist = (cumDist[i] + cumDist[i + 1]) / 2
    let alpha = baseOpacity

    // Fade at the start
    if (midDist < fadeLen) {
      alpha *= midDist / fadeLen
    }
    // Fade at the end
    if (totalLen - midDist < fadeLen) {
      alpha *= (totalLen - midDist) / fadeLen
    }

    ctx.globalAlpha = Math.max(0, alpha)
    ctx.beginPath()
    ctx.moveTo(path[i][0], path[i][1])
    ctx.lineTo(path[i + 1][0], path[i + 1][1])
    ctx.stroke()
  }
}

/**
 * Canvas line renderer.
 * Renders LineSceneNode paths using moveTo/lineTo.
 * Supports threshold-based segment coloring when colorThresholds + rawValues
 * are present on the node.
 * Supports d3-shape curve interpolation when node.curve is set.
 */
export const lineCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const lineNodes = nodes.filter((n): n is LineSceneNode => n.type === "line")

  for (const node of lineNodes) {
    if (node.path.length < 2) continue

    // Intro clip: reveal line from left to right
    const clipFrac = node._introClipFraction
    if (clipFrac !== undefined && clipFrac < 1) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, layout.width * clipFrac, layout.height)
      ctx.clip()
    }

    // Resolve CSS variable-valued strokes (e.g. `stroke="var(--semiotic-primary)"`)
    // via getComputedStyle on the canvas element. Without this, canvas silently
    // rejects `var(...)` strings and falls back to #000000.
    const rawStroke = node.style.stroke || "#007bff"
    const baseColor = resolveCSSColor(ctx, rawStroke) || rawStroke
    const lineWidth = node.style.strokeWidth || 2
    const thresholds = node.colorThresholds
    const rawValues = node.rawValues

    if (node.style.strokeDasharray) {
      ctx.setLineDash(node.style.strokeDasharray.split(/[\s,]+/).map(Number))
    } else {
      ctx.setLineDash([])
    }

    if (node.style.opacity != null) {
      ctx.globalAlpha = node.style.opacity
    }

    ctx.lineWidth = lineWidth
    ctx.lineCap = (node.style.strokeLinecap as CanvasLineCap) || "butt"

    // Edge-fade for anti-meridian split segments
    if (node.style._edgeFade) {
      const baseOpacity = node.style.opacity ?? 1
      renderEdgeFadeLine(
        ctx,
        node.path,
        baseColor,
        lineWidth,
        baseOpacity,
        (node.style.strokeLinecap as CanvasLineCap) || "butt"
      )
      ctx.globalAlpha = 1
      ctx.setLineDash([])
      ctx.lineCap = "butt"
      continue
    }

    const curveFactory = resolveCurveFactory(node.curve)
    const hasThresholds = thresholds && thresholds.length > 0 && rawValues && rawValues.length === node.path.length
    const decayOpacities = node._decayOpacities

    // Decay path: per-segment rendering with varying globalAlpha
    if (decayOpacities && decayOpacities.length === node.path.length && !hasThresholds) {
      ctx.strokeStyle = baseColor
      const baseOpacity = node.style.opacity ?? 1
      for (let i = 0; i < node.path.length - 1; i++) {
        const segAlpha = (decayOpacities[i] + decayOpacities[i + 1]) * 0.5 * baseOpacity
        ctx.globalAlpha = segAlpha
        ctx.beginPath()
        ctx.moveTo(node.path[i][0], node.path[i][1])
        ctx.lineTo(node.path[i + 1][0], node.path[i + 1][1])
        ctx.stroke()
      }
    // Fast path: no color thresholds — single-path draw
    } else if (!hasThresholds) {
      ctx.beginPath()

      const strokeGrad = node.strokeGradient && node.path.length >= 2
        ? buildColorStopGradient(
            ctx,
            node.strokeGradient,
            baseColor,
            node.path[0][0], 0,
            node.path[node.path.length - 1][0], 0,
          )
        : null
      ctx.strokeStyle = strokeGrad || baseColor

      if (curveFactory) {
        // Use d3-shape line generator with curve interpolation
        const lineGenerator = d3Line<[number, number]>()
          .x(d => d[0])
          .y(d => d[1])
          .curve(curveFactory)
          .context(ctx)
        lineGenerator(node.path)
      } else {
        const [startX, startY] = node.path[0]
        ctx.moveTo(startX, startY)
        for (let i = 1; i < node.path.length; i++) {
          ctx.lineTo(node.path[i][0], node.path[i][1])
        }
      }
      ctx.stroke()
    } else {
      // Threshold mode: segment-based drawing with interpolated crossings
      // Curves are not applied in threshold mode — fall back to linear segments
      const segments = buildThresholdLineSegments(node.path, rawValues!, thresholds!, baseColor)
      for (const segment of segments) {
        ctx.beginPath()
        ctx.strokeStyle = resolveCSSColor(ctx, segment.color) || segment.color
        ctx.moveTo(segment.path[0][0], segment.path[0][1])
        for (let i = 1; i < segment.path.length; i++) {
          ctx.lineTo(segment.path[i][0], segment.path[i][1])
        }
        ctx.stroke()
      }
    }

    // Fill area under line if fillOpacity is set
    if (node.style.fill && node.style.fillOpacity && node.style.fillOpacity > 0) {
      ctx.beginPath()
      ctx.globalAlpha = node.style.fillOpacity
      // `LineSceneNode.style.fill` is `string | CanvasPattern`, so the
      // string-typed fallback can't accept it without a narrowing
      // assertion. Falsy patterns can't reach this branch (the
      // `node.style.fill &&` guard above filters them), and a
      // CanvasPattern resolved by `resolveCanvasFill` won't trigger
      // this fallback path either, so the cast is safe in practice.
      ctx.fillStyle = resolveCanvasFill(ctx, node.style.fill, node.style.fill as string)

      if (curveFactory && !hasThresholds) {
        // Use d3-shape line generator for the curved top edge, then close with straight bottom
        const lineGenerator = d3Line<[number, number]>()
          .x(d => d[0])
          .y(d => d[1])
          .curve(curveFactory)
          .context(ctx)
        lineGenerator(node.path)
      } else {
        const [startX, startY] = node.path[0]
        ctx.moveTo(startX, startY)
        for (let i = 1; i < node.path.length; i++) {
          ctx.lineTo(node.path[i][0], node.path[i][1])
        }
      }

      const lastX = node.path[node.path.length - 1][0]
      const firstX = node.path[0][0]
      ctx.lineTo(lastX, layout.height)
      ctx.lineTo(firstX, layout.height)
      ctx.closePath()
      ctx.fill()
    }

    // Restore after intro clip
    if (clipFrac !== undefined && clipFrac < 1) {
      ctx.restore()
    }

    ctx.globalAlpha = 1
    ctx.setLineDash([])
    ctx.lineCap = "butt"
  }
}
