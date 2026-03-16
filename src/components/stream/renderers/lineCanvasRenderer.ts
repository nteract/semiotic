import type { SceneNode, LineSceneNode, LineColorThreshold, CurveType } from "../types"
import type { StreamRendererFn } from "./types"
import { line as d3Line } from "d3-shape"
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

function resolveColor(
  value: number,
  thresholds: LineColorThreshold[],
  baseColor: string
): string {
  let color = baseColor
  for (const t of thresholds) {
    if (t.thresholdType === "lesser") {
      if (value < t.value) color = t.color
    } else {
      if (value > t.value) color = t.color
    }
  }
  return color
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

    const baseColor = node.style.stroke || "#007bff"
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
      ctx.strokeStyle = baseColor

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
      let prevX: number | null = null
      let prevY: number | null = null
      let prevValue: number | null = null
      let prevColor: string | null = null
      let pathStarted = false

      function startSegment(color: string, x: number, y: number) {
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.moveTo(x, y)
        pathStarted = true
      }

      function endSegment() {
        if (pathStarted) {
          ctx.stroke()
          pathStarted = false
        }
      }

      for (let i = 0; i < node.path.length; i++) {
        const [x, y] = node.path[i]
        const v = rawValues![i]
        const currColor = resolveColor(v, thresholds!, baseColor)

        if (prevX === null || prevColor === null || prevValue === null) {
          startSegment(currColor, x, y)
          prevX = x
          prevY = y
          prevValue = v
          prevColor = currColor
          continue
        }

        if (currColor === prevColor) {
          ctx.lineTo(x, y)
        } else {
          // Find threshold crossings between prevValue and v
          const crossings: Array<{ t: number }> = []

          for (const threshold of thresholds!) {
            const tv = threshold.value
            if ((prevValue <= tv && v >= tv) || (prevValue >= tv && v <= tv)) {
              if (prevValue !== tv && v !== tv) {
                const interpT = (tv - prevValue) / (v - prevValue)
                crossings.push({ t: interpT })
              }
            }
          }

          crossings.sort((a, b) => a.t - b.t)

          for (const crossing of crossings) {
            const midX = prevX + (x - prevX) * crossing.t
            const midY = prevY! + (y - prevY!) * crossing.t

            const nudgedValue = prevValue + (v - prevValue) * Math.min(crossing.t + 0.0001, 1)
            const nextColor = resolveColor(nudgedValue, thresholds!, baseColor)

            ctx.lineTo(midX, midY)
            endSegment()
            startSegment(nextColor, midX, midY)
          }

          ctx.lineTo(x, y)
        }

        prevX = x
        prevY = y
        prevValue = v
        prevColor = currColor
      }

      endSegment()
    }

    // Fill area under line if fillOpacity is set
    if (node.style.fill && node.style.fillOpacity && node.style.fillOpacity > 0) {
      ctx.beginPath()
      ctx.globalAlpha = node.style.fillOpacity
      ctx.fillStyle = node.style.fill

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

    ctx.globalAlpha = 1
    ctx.setLineDash([])
    ctx.lineCap = "butt"
  }
}
