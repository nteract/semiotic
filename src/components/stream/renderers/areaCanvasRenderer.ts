import type { SceneNode, AreaSceneNode, CurveType } from "../types"
import type { StreamRendererFn } from "./types"
import { renderPathPulse } from "./renderPulse"
import { area as d3Area, line as d3Line } from "d3-shape"
import {
  curveMonotoneX,
  curveMonotoneY,
  curveCardinal,
  curveCatmullRom,
  curveStep,
  curveStepBefore,
  curveStepAfter,
  curveBasis,
  curveNatural
} from "d3-shape"
import type { CurveFactory } from "d3-shape"

/** Map CurveType strings to d3-shape curve factories. */
function resolveCurveFactory(curve: CurveType | undefined): CurveFactory | null {
  switch (curve) {
    case "monotoneX": return curveMonotoneX
    case "monotoneY": return curveMonotoneY
    case "cardinal": return curveCardinal
    case "catmullRom": return curveCatmullRom
    case "step": return curveStep
    case "stepBefore": return curveStepBefore
    case "stepAfter": return curveStepAfter
    case "basis": return curveBasis
    case "natural": return curveNatural
    case "linear":
    case undefined:
      return null
    default:
      return null
  }
}

/** Parse a CSS color string to [r, g, b]. Handles #hex and rgb(). */
function parseColor(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    const hex = color.length === 4
      ? color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
      : color.slice(1, 7)
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }
  const m = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) return [+m[1], +m[2], +m[3]]
  return [78, 121, 167] // fallback: #4e79a7
}

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

export const areaCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  const areaNodes = nodes.filter((n): n is AreaSceneNode => n.type === "area")

  for (const node of areaNodes) {
    if (node.topPath.length < 2) continue

    const fillColor = node.style.fill || "#4e79a7"
    const decayOpacities = node._decayOpacities

    // Decay path: render area as vertical strips with per-strip opacity
    if (decayOpacities && decayOpacities.length === node.topPath.length) {
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
        ctx.strokeStyle = node.style.stroke
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
    if (node.fillGradient) {
      // Vertical gradient: topOpacity at the line, bottomOpacity at the baseline
      let topY = Infinity
      for (const p of node.topPath) { if (p[1] < topY) topY = p[1] }
      let bottomY = -Infinity
      for (const p of node.bottomPath) { if (p[1] > bottomY) bottomY = p[1] }
      // Use rgba color stops to vary opacity across the gradient
      const parsed = parseColor(typeof fillColor === "string" ? fillColor : "#4e79a7")
      const topAlpha = node.fillGradient.topOpacity
      const bottomAlpha = node.fillGradient.bottomOpacity
      const grad = ctx.createLinearGradient(0, topY, 0, bottomY)
      grad.addColorStop(0, `rgba(${parsed[0]},${parsed[1]},${parsed[2]},${topAlpha})`)
      grad.addColorStop(1, `rgba(${parsed[0]},${parsed[1]},${parsed[2]},${bottomAlpha})`)
      ctx.fillStyle = grad
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
      ctx.strokeStyle = node.style.stroke
      ctx.lineWidth = node.style.strokeWidth || 2
      ctx.setLineDash([])

      const curveFactory = resolveCurveFactory(node.curve)

      ctx.beginPath()
      if (curveFactory) {
        // Use d3-shape line generator for curved top edge stroke
        const lineGenerator = d3Line<[number, number]>()
          .x(d => d[0])
          .y(d => d[1])
          .curve(curveFactory)
          .context(ctx)
        lineGenerator(node.topPath)
      } else {
        // Only stroke the top path (not the baseline)
        ctx.moveTo(node.topPath[0][0], node.topPath[0][1])
        for (let i = 1; i < node.topPath.length; i++) {
          ctx.lineTo(node.topPath[i][0], node.topPath[i][1])
        }
      }
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }
}
