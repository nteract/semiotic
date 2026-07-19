/**
 * Scene graph → SVG element converters.
 *
 * Shared module used by Stream Frames for SSR rendering and
 * by semiotic/server for static SVG export.
 *
 * Network, geo, and ordinal serializers live in sibling modules
 * (SceneToSVGNetwork.tsx / SceneToSVGGeo.tsx / SceneToSVGOrdinal.tsx) and are
 * re-exported below to keep this file under the file-size ratchet ceiling;
 * low-level helpers shared across them (svgFill, safeSvgId, glyphNodeToSVG,
 * buildRectSVGGradient, perCornerSvgPath, symbolSceneNodeToSVG, ARC_NOOP)
 * live in sceneToSVGShared.tsx.
 */

import * as React from "react"
import { area as d3Area, line as d3Line } from "d3-shape"
import { resolveCurveFactory } from "./renderers/canvasRenderHelpers"

import type {
  SceneNode,
  LineSceneNode,
  AreaSceneNode,
  PointSceneNode,
  SymbolSceneNode,
  GlyphSceneNode,
  RectSceneNode,
  HeatcellSceneNode,
  CandlestickSceneNode
} from "./types"

import { isHatchFill, hatchPatternDef } from "../charts/shared/hatchFill"

import {
  svgFill,
  safeSvgId,
  glyphNodeToSVG,
  colorStopElements,
  symbolSceneNodeToSVG
} from "./sceneToSVGShared"

export { networkSceneNodeToSVG, networkSceneEdgeToSVG, networkLabelToSVG } from "./SceneToSVGNetwork"
export { geoSceneNodeToSVG } from "./SceneToSVGGeo"
export { ordinalSceneNodeToSVG } from "./SceneToSVGOrdinal"

// ── Color parsing helper (for heatcell contrast text) ───────────────────

function parseHeatcellColor(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    let hex = color.slice(1)
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    if (hex.length === 6) {
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
    }
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) return [+m[1], +m[2], +m[3]]
  return [128, 128, 128]
}

/**
 * Build an area fill gradient using the same top-to-bottom geometry and
 * opacity semantics as `areaCanvasRenderer`. Area gradients span the visible
 * extrema rather than each datum's local segment, so the fill reads as one
 * continuous field in both SVG/SSR and canvas.
 */
function buildAreaSVGGradient(n: AreaSceneNode, id: string): React.ReactElement | null {
  const fg = n.fillGradient
  if (!fg || typeof fg !== "object") return null

  let topY = Infinity
  for (const [, y] of n.topPath) topY = Math.min(topY, y)
  let bottomY = -Infinity
  for (const [, y] of n.bottomPath) bottomY = Math.max(bottomY, y)
  if (!Number.isFinite(topY) || !Number.isFinite(bottomY)) return null

  const stops: React.ReactElement[] = []
  if ("colorStops" in fg) {
    const colorStops = colorStopElements(fg.colorStops)
    if (!colorStops) return null
    stops.push(...colorStops)
  } else {
    if (!Number.isFinite(fg.topOpacity) || !Number.isFinite(fg.bottomOpacity)) return null
    stops.push(<stop key="0" offset={0} stopColor={svgFill(n.style.fill)} stopOpacity={Math.max(0, Math.min(1, fg.topOpacity))} />)
    stops.push(<stop key="1" offset={1} stopColor={svgFill(n.style.fill)} stopOpacity={Math.max(0, Math.min(1, fg.bottomOpacity))} />)
  }

  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={0} y1={topY} x2={0} y2={bottomY}>
      {stops}
    </linearGradient>
  )
}

function buildStrokeSVGGradient(
  gradient: { colorStops: Array<{ offset: number; color: string }> } | undefined,
  path: Array<[number, number]>,
  id: string,
): React.ReactElement | null {
  if (!gradient || path.length < 2) return null
  const stops = colorStopElements(gradient.colorStops)
  if (!stops) return null
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={path[0][0]}
      y1={0}
      x2={path[path.length - 1][0]}
      y2={0}
    >
      {stops}
    </linearGradient>
  )
}

// ── XY Scene Nodes ───────────────────────────────────────────────────────

export function xySceneNodeToSVG(node: SceneNode, i: number, idPrefix?: string): React.ReactNode {
  switch (node.type) {
    case "line": {
      const n = node as LineSceneNode
      if (n.path.length === 0) return null
      // The SVG serializer is also the SSR renderer. Use the same d3 curve
      // factory as canvas instead of flattening every scene path to `L`
      // commands, otherwise a curved client line becomes a straight SSR line.
      const curveFactory = resolveCurveFactory(n.curve)
      const d = curveFactory
        ? d3Line<[number, number]>()
            .x(([x]) => x)
            .y(([, y]) => y)
            .curve(curveFactory)(n.path) ?? ""
        : "M" + n.path.map(([x, y]) => `${x},${y}`).join("L")
      const gradientId = safeSvgId(`${idPrefix ? `${idPrefix}-` : ""}line-${i}-stroke-gradient`)
      const strokeGradient = buildStrokeSVGGradient(n.strokeGradient, n.path, gradientId)
      return (
        <React.Fragment key={`line-${i}`}>
          {strokeGradient && <defs>{strokeGradient}</defs>}
          <path
            d={d}
            fill="none"
            stroke={strokeGradient ? `url(#${gradientId})` : n.style.stroke || "#4e79a7"}
            strokeWidth={n.style.strokeWidth || 2}
            strokeDasharray={n.style.strokeDasharray}
            opacity={n.style.opacity}
          />
        </React.Fragment>
      )
    }
    case "area": {
      const n = node as AreaSceneNode
      if (n.topPath.length === 0) return null
      // Match `traceAreaPath` in the canvas renderer: d3 interpolates both
      // the top and baseline edges, then closes the filled region.
      const curveFactory = resolveCurveFactory(n.curve)
      const d = curveFactory && n.topPath.length >= 2 && n.bottomPath.length >= 2
        ? d3Area<[number, number]>()
            .x(([x]) => x)
            .y0((_point, index) => n.bottomPath[index][1])
            .y1(([, y]) => y)
            .curve(curveFactory)(n.topPath) ?? ""
        : (() => {
            const top = n.topPath.map(([x, y]) => `${x},${y}`).join("L")
            const bottom = [...n.bottomPath].reverse().map(([x, y]) => `${x},${y}`).join("L")
            return `M${top}L${bottom}Z`
          })()
      // HatchFill → inline <pattern>, referenced instead of the flat fill.
      const areaHatchId = `${idPrefix ? `${idPrefix}-` : ""}area-${i}-hatch`
      const areaHatch = isHatchFill(n.style.fill) ? hatchPatternDef(n.style.fill, areaHatchId) : undefined
      const areaGradientId = safeSvgId(`${idPrefix ? `${idPrefix}-` : ""}area-${i}-gradient`)
      const areaGradient = buildAreaSVGGradient(n, areaGradientId)
      const areaFill = areaGradient
        ? `url(#${areaGradientId})`
        : areaHatch ? `url(#${areaHatchId})` : svgFill(n.style.fill)
      // Canvas applies `style.opacity` to a gradient as a whole, while the
      // gradient's stops control its internal alpha. Do not additionally
      // apply the flat-area `fillOpacity`, which would dim stop opacities.
      const areaFillOpacity = areaGradient
        ? undefined
        : n.style.fillOpacity ?? n.style.opacity ?? 0.7
      // Canvas fills the closed area, then strokes only its top edge. SVG's
      // `stroke` on the closed fill path outlines the baseline and vertical
      // ends too, producing the conspicuous SSR-only border.
      const topStrokePath = curveFactory
        ? d3Line<[number, number]>()
            .x(([x]) => x)
            .y(([, y]) => y)
            .curve(curveFactory)(n.topPath) ?? ""
        : "M" + n.topPath.map(([x, y]) => `${x},${y}`).join("L")
      const strokeGradientId = safeSvgId(`${idPrefix ? `${idPrefix}-` : ""}area-${i}-stroke-gradient`)
      const strokeGradient = buildStrokeSVGGradient(n.strokeGradient, n.topPath, strokeGradientId)
      const topStroke = n.style.stroke && n.style.stroke !== "none" ? (
        <path
          d={topStrokePath}
          fill="none"
          stroke={strokeGradient ? `url(#${strokeGradientId})` : svgFill(n.style.stroke)}
          strokeWidth={n.style.strokeWidth || 2}
          opacity={n.style.opacity}
        />
      ) : null
      // User-supplied clipRect — hard-clips the area to a rect (used by
      // custom layouts for partial reveals, banding, highlight regions).
      // Inline the clipPath alongside the path so the SSR output is a
      // single self-contained group.
      if (n.clipRect) {
        // idPrefix namespaces the clipPath id so multiple charts on the same
        // page don't collide (e.g. two horizon charts both emitting `area-clip-0`).
        const cid = `${idPrefix ? `${idPrefix}-` : ""}area-clip-${i}`
        return (
          <g key={`area-${i}`}>
            <defs>
              {areaGradient}{!areaGradient && areaHatch}{strokeGradient}
              <clipPath id={cid}>
                <rect
                  x={n.clipRect.x}
                  y={n.clipRect.y}
                  width={n.clipRect.width}
                  height={n.clipRect.height}
                />
              </clipPath>
            </defs>
            <g clipPath={`url(#${cid})`}>
              <path
                d={d}
                fill={areaFill}
                fillOpacity={areaFillOpacity}
                opacity={areaGradient ? n.style.opacity : undefined}
                stroke="none"
              />
              {topStroke}
            </g>
          </g>
        )
      }
      return (
        <React.Fragment key={`area-${i}`}>
          {(areaGradient || areaHatch || strokeGradient) && <defs>{areaGradient}{!areaGradient && areaHatch}{strokeGradient}</defs>}
          <path
            d={d}
            fill={areaFill}
            fillOpacity={areaFillOpacity}
            opacity={areaGradient ? n.style.opacity : undefined}
            stroke="none"
          />
          {topStroke}
        </React.Fragment>
      )
    }
    case "point": {
      const n = node as PointSceneNode
      // A HatchFill descriptor becomes an inline <pattern> (SSR parity with canvas).
      const pointHatchId = `${idPrefix ? `${idPrefix}-` : ""}point-${i}-hatch`
      const pointHatch = isHatchFill(n.style.fill) ? hatchPatternDef(n.style.fill, pointHatchId) : undefined
      return (
        <React.Fragment key={`point-${i}`}>
          {pointHatch && <defs>{pointHatch}</defs>}
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={pointHatch ? `url(#${pointHatchId})` : svgFill(n.style.fill)}
            opacity={n.style.opacity ?? n.style.fillOpacity ?? 0.8}
            stroke={n.style.stroke}
            strokeWidth={n.style.strokeWidth}
          />
        </React.Fragment>
      )
    }
    case "symbol":
      return symbolSceneNodeToSVG(node as SymbolSceneNode, i)
    case "glyph": {
      const n = node as GlyphSceneNode
      return glyphNodeToSVG(n, n.x, n.y, `${idPrefix ?? ""}glyph-${n.pointId ?? i}`)
    }
    case "rect": {
      const n = node as RectSceneNode
      // HatchFill (styleRules on physics bodies / custom XY rects) → <pattern>.
      const rectHatchId = `${idPrefix ? `${idPrefix}-` : ""}xyrect-${i}-hatch`
      const rectHatch = isHatchFill(n.style.fill) ? hatchPatternDef(n.style.fill, rectHatchId) : undefined
      return (
        <React.Fragment key={`rect-${i}`}>
          {rectHatch && <defs>{rectHatch}</defs>}
          <rect
            x={n.x}
            y={n.y}
            width={n.w}
            height={n.h}
            fill={rectHatch ? `url(#${rectHatchId})` : svgFill(n.style.fill)}
            opacity={n.style.opacity}
            stroke={n.style.stroke}
            strokeWidth={n.style.strokeWidth}
          />
        </React.Fragment>
      )
    }
    case "heatcell": {
      const n = node as HeatcellSceneNode
      if (n.showValues && n.value != null && n.w >= 20 && n.h >= 20) {
        const formatted = n.valueFormat
          ? n.valueFormat(n.value)
          : Number.isInteger(n.value) ? String(n.value)
            : Math.abs(n.value) >= 100 ? n.value.toFixed(0)
            : Math.abs(n.value) >= 1 ? n.value.toFixed(1)
            : n.value.toPrecision(3)
        const [r, g, b] = parseHeatcellColor(n.fill)
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b
        const textColor = luminance > 128 ? "#000" : "#fff"
        const fontSize = Math.max(10, Math.min(16, Math.min(n.w, n.h) * 0.3))
        return (
          <g key={`heatcell-${i}`}>
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={n.h}
              fill={n.fill}
              stroke={n.style?.stroke}
              strokeWidth={n.style?.strokeWidth}
            />
            <text
              x={n.x + n.w / 2}
              y={n.y + n.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={textColor}
              fontSize={`${fontSize}px`}
            >
              {formatted}
            </text>
          </g>
        )
      }
      return (
        <rect
          key={`heatcell-${i}`}
          x={n.x}
          y={n.y}
          width={n.w}
          height={n.h}
          fill={n.fill}
          stroke={n.style?.stroke}
          strokeWidth={n.style?.strokeWidth}
        />
      )
    }
    case "candlestick": {
      const n = node as CandlestickSceneNode
      if (n.isRange) {
        // Range/dumbbell mode: high→low line + endpoint bulbs, matching the
        // canvas renderer. Previously this fell through to the body rect below,
        // so SSR painted a filled bar where CSR drew a dumbbell.
        const dotRadius = n.dotRadius ?? Math.max(2, n.bodyWidth / 2)
        return (
          <g key={`candle-${i}`}>
            <line
              x1={n.x} y1={n.highY} x2={n.x} y2={n.lowY}
              stroke={n.wickColor} strokeWidth={n.wickWidth}
            />
            <circle cx={n.x} cy={n.highY} r={dotRadius} fill={n.wickColor} />
            <circle cx={n.x} cy={n.lowY} r={dotRadius} fill={n.wickColor} />
          </g>
        )
      }
      const bodyTop = Math.min(n.openY, n.closeY)
      const bodyHeight = Math.max(Math.abs(n.openY - n.closeY), 1)
      const bodyColor = n.isUp ? n.upColor : n.downColor
      return (
        <g key={`candle-${i}`}>
          <line
            x1={n.x} y1={n.highY} x2={n.x} y2={n.lowY}
            stroke={n.wickColor} strokeWidth={n.wickWidth}
          />
          <rect
            x={n.x - n.bodyWidth / 2} y={bodyTop}
            width={n.bodyWidth} height={bodyHeight}
            fill={bodyColor} stroke={bodyColor} strokeWidth={1}
          />
        </g>
      )
    }
    default:
      return null
  }
}

// ── Server detection ─────────────────────────────────────────────────────

/**
 * Returns true when running in a true server/Node.js context where
 * window and document are not available.
 */
export const isServerEnvironment: boolean =
  typeof window === "undefined" || typeof document === "undefined"
