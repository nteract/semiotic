/**
 * Scene graph → SVG element converters.
 *
 * Shared module used by Stream Frames for SSR rendering and
 * by semiotic/server for static SVG export.
 *
 * Network and geo serializers live in sibling modules
 * (SceneToSVGNetwork.tsx / SceneToSVGGeo.tsx) and are re-exported below to
 * keep this file under the file-size ratchet ceiling; low-level helpers
 * shared across all three (svgFill, safeSvgId, glyphNodeToSVG, ARC_NOOP)
 * live in sceneToSVGShared.tsx.
 */

import * as React from "react"
import { arc as d3Arc, area as d3Area, line as d3Line } from "d3-shape"
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

import { symbolPathString } from "./symbolPath"
import { isHatchFill, hatchPatternDef } from "../charts/shared/hatchFill"

import { hasAnyCornerRadius, clampCornerRadii } from "./renderers/cornerRadii"
import { annularSectorPath, buildGaugeGradientGeometry } from "./renderers/wedgePathBuilder"

import type {
  OrdinalSceneNode,
  WedgeSceneNode,
  BoxplotSceneNode,
  ViolinSceneNode,
  ConnectorSceneNode,
  TrapezoidSceneNode
} from "./ordinalTypes"

import { ARC_NOOP, svgFill, safeSvgId, glyphNodeToSVG } from "./sceneToSVGShared"

export { networkSceneNodeToSVG, networkSceneEdgeToSVG, networkLabelToSVG } from "./SceneToSVGNetwork"
export { geoSceneNodeToSVG } from "./SceneToSVGGeo"

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
 * Shared SVG serializer for the XY/ordinal `SymbolSceneNode` (x/y-based) — the
 * sibling of the network symbol case in `networkSceneNodeToSVG` (cx/cy). Both
 * delegate glyph-path generation to `symbolPathString`, matching the canvas
 * renderer exactly (fill only when a fill is set, so stroke-only glyphs stay
 * unfilled in SSR too).
 */
function symbolSceneNodeToSVG(n: SymbolSceneNode, i: number, idPrefix?: string): React.ReactNode {
  const d = symbolPathString(n.symbolType, n.size, n.path)
  const transform = n.rotation
    ? `translate(${n.x},${n.y}) rotate(${(n.rotation * 180) / Math.PI})`
    : `translate(${n.x},${n.y})`
  return (
    <path
      key={`${idPrefix ?? ""}symbol-${i}`}
      d={d}
      transform={transform}
      fill={n.style.fill ? svgFill(n.style.fill) : "none"}
      fillOpacity={n.style.fillOpacity}
      opacity={n.style.opacity}
      stroke={n.style.stroke}
      strokeWidth={n.style.strokeWidth}
    />
  )
}

function colorStopElements(
  colorStops: Array<{ offset: number; color: string }>,
): React.ReactElement[] | null {
  const validStops = colorStops
    .filter(stop => Number.isFinite(stop.offset))
    .map(stop => ({
      offset: Math.max(0, Math.min(1, stop.offset)),
      color: stop.color,
    }))
  if (validStops.length < 2) return null
  return validStops.map((stop, index) => (
    <stop key={index} offset={stop.offset} stopColor={stop.color} />
  ))
}

/**
 * Emit an SVG path string for a rect with per-corner radii. Same trace
 * order as the canvas helper (CCW from top-left); shared shape utilities
 * (`hasAnyCornerRadius`, `clampCornerRadii`) live in
 * `./renderers/cornerRadii.ts` so both paint paths agree on geometry.
 */
function perCornerSvgPath(n: RectSceneNode): string {
  const { x, y, w, h } = n
  const { tl, tr, br, bl } = clampCornerRadii(n)
  let d = `M${x + tl},${y}`
  d += ` L${x + w - tr},${y}`
  if (tr > 0) d += ` A${tr},${tr} 0 0 1 ${x + w},${y + tr}`
  d += ` L${x + w},${y + h - br}`
  if (br > 0) d += ` A${br},${br} 0 0 1 ${x + w - br},${y + h}`
  d += ` L${x + bl},${y + h}`
  if (bl > 0) d += ` A${bl},${bl} 0 0 1 ${x},${y + h - bl}`
  d += ` L${x},${y + tl}`
  if (tl > 0) d += ` A${tl},${tl} 0 0 1 ${x + tl},${y}`
  d += " Z"
  return d
}

/**
 * Build `<defs><linearGradient>` for a bar's fillGradient, mirroring the
 * tip→base direction the canvas renderer uses (inferred from roundedEdge).
 * Returns null when the config can't resolve (e.g. colorStops < 2), so the
 * caller falls back to a solid fill — same parity with the canvas path.
 *
 * Using `gradientUnits="userSpaceOnUse"` with absolute coords keeps each bar's
 * gradient aligned to its own rect independent of the parent viewBox.
 */
function buildRectSVGGradient(n: RectSceneNode, id: string): React.ReactElement | null {
  const fg = n.fillGradient
  if (!fg || typeof fg !== "object") return null

  // Tip → base coords by orientation. Default top-to-bottom for positive
  // vertical bars (and anything without roundedEdge).
  let x1 = n.x, y1 = n.y, x2 = n.x, y2 = n.y + n.h
  if (n.roundedEdge === "bottom") { y1 = n.y + n.h; y2 = n.y }
  else if (n.roundedEdge === "right") { x1 = n.x + n.w; y1 = n.y; x2 = n.x; y2 = n.y }
  else if (n.roundedEdge === "left")  { x1 = n.x; y1 = n.y; x2 = n.x + n.w; y2 = n.y }

  const stops: React.ReactElement[] = []
  if ("colorStops" in fg) {
    // Mirror the canvas path: filter non-finite offsets first, then require
    // ≥2 valid stops. Without the filter a NaN offset would emit offset="NaN",
    // which is invalid SVG and breaks the whole gradient.
    const colorStops = colorStopElements(fg.colorStops)
    if (!colorStops) return null
    stops.push(...colorStops)
  } else {
    // Opacity form — use the resolved fill as the base color and let SVG's
    // stop-opacity do the work. Matches the canvas path's rgba() stops.
    const base = svgFill(n.style.fill)
    stops.push(<stop key="0" offset={0} stopColor={base} stopOpacity={fg.topOpacity} />)
    stops.push(<stop key="1" offset={1} stopColor={base} stopOpacity={fg.bottomOpacity} />)
  }

  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={x1} y1={y1} x2={x2} y2={y2}
    >
      {stops}
    </linearGradient>
  )
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
            <rect x={n.x} y={n.y} width={n.w} height={n.h} fill={n.fill} />
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
        />
      )
    }
    case "candlestick": {
      const n = node as CandlestickSceneNode
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

// ── Ordinal Scene Nodes ──────────────────────────────────────────────────

function formatFunnelNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${(value / 1_000).toFixed(0)}K`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

/**
 * Funnel builders store their canvas-label geometry on the rect datum. Keep
 * those labels in the scene-to-SVG backend as well so server SVG is not a
 * marks-only variant of the canvas chart.
 */
function funnelRectLabels(node: RectSceneNode, key: string): React.ReactNode {
  const datum = node.datum as Record<string, unknown> | undefined
  if (!datum) return null
  const labels: React.ReactNode[] = []
  const step = datum.__funnelStepLabel
  const stepX = Number(datum.__funnelStepLabelX)
  const stepY = Number(datum.__funnelStepLabelY)
  const rowWidth = Number(datum.__funnelRowWidth)
  if (typeof step === "string" && Number.isFinite(stepX) && Number.isFinite(stepY) &&
      (!Number.isFinite(rowWidth) || step.length * 8.4 + 16 <= rowWidth)) {
    labels.push(
      <text key={`${key}-funnel-step`} x={stepX} y={stepY + 3} textAnchor="middle"
        dominantBaseline="hanging" fontSize={14} fontWeight="bold" fill="#fff"
        stroke="rgba(0,0,0,0.6)" strokeWidth={3} paintOrder="stroke">
        {step}
      </text>,
    )
  }

  const value = Number(datum.__funnelValue)
  const valueX = Number(datum.__funnelValueLabelX)
  const valueY = Number(datum.__funnelValueLabelY)
  const barWidth = Number(datum.__funnelBarW)
  if (Number.isFinite(value) && value !== 0 && Number.isFinite(valueX) && Number.isFinite(valueY) && barWidth >= 60) {
    const percent = Number(datum.__funnelPercent)
    const isFirst = datum.__funnelIsFirstStep === true
    let text = !isFirst && Number.isFinite(percent)
      ? `${formatFunnelNumber(value)} (${Math.abs(percent - Math.round(percent)) < 0.05 ? Math.round(percent) : percent.toFixed(1)}%)`
      : formatFunnelNumber(value)
    if (text.length * 7.8 + 16 > barWidth) text = formatFunnelNumber(value)
    if (text.length * 7.8 + 16 <= barWidth) {
      labels.push(
        <text key={`${key}-funnel-value`} x={valueX} y={valueY + 22} textAnchor="middle"
          dominantBaseline="hanging" fontSize={13} fontWeight="bold" fill="#fff"
          stroke="rgba(0,0,0,0.5)" strokeWidth={3} paintOrder="stroke">
          {text}
        </text>,
      )
    }
  }
  return labels.length ? <g key={`${key}-funnel-labels`}>{labels}</g> : null
}

export function ordinalSceneNodeToSVG(node: OrdinalSceneNode, i: number, idPrefix?: string): React.ReactNode {
  // Build a unique key combining node type, category (or group), and index
  // to avoid duplicate key warnings when multiple nodes share the same index
  // within stacked/grouped ordinal charts. `idPrefix` (when provided) is
  // also threaded into any SVG `id` attributes this node emits — required
  // for multi-chart pages where two ordinal frames could otherwise pick
  // the same `clipPath` id and produce cross-chart `url(#…)` references.
  const category = ("category" in node ? node.category : undefined) || ("group" in node ? node.group : undefined) || ""
  const nodeKey = (suffix: string) => `ord-${node.type}-${category}-${i}-${suffix}`
  const baseKey = `ord-${node.type}-${category}-${i}`

  switch (node.type) {
    case "rect": {
      const n = node as RectSceneNode
      // If the scene node carries a gradient, build the SVG defs entry and
      // reference it via `fill="url(#id)"`. buildRectSVGGradient returns null
      // for invalid configs (e.g. < 2 colorStops) so we fall back to solid.
      // baseKey embeds the category/group from user data — sanitize to the
      // strict ID charset so spaces or punctuation in category names can't
      // produce invalid markup or break the url(#...) reference.
      const gradientId = `${safeSvgId(baseKey)}-grad`
      const gradientDefs = buildRectSVGGradient(n, gradientId)
      // A HatchFill descriptor becomes an inline `<pattern>` def referenced
      // via url(#…) — the SVG counterpart to the canvas CanvasPattern, so a
      // hatched bar reads identically in SSR. Gradient takes precedence when
      // both are somehow set.
      let hatchDefEl: React.ReactElement | undefined
      let fillValue: string
      if (gradientDefs) {
        fillValue = `url(#${gradientId})`
      } else if (isHatchFill(n.style.fill)) {
        const hatchId = `${safeSvgId(baseKey)}-hatch`
        hatchDefEl = hatchPatternDef(n.style.fill, hatchId)
        fillValue = `url(#${hatchId})`
      } else {
        fillValue = svgFill(n.style.fill)
      }
      const rectDefs = gradientDefs || hatchDefEl ? <defs>{gradientDefs}{hatchDefEl}</defs> : null
      if (n.cornerRadii && hasAnyCornerRadius(n.cornerRadii)) {
        const d = perCornerSvgPath(n)
        return (
          <React.Fragment key={baseKey}>
            {rectDefs}
            <path
              d={d}
              fill={fillValue}
              opacity={n.style.opacity}
              stroke={n.style.stroke}
              strokeWidth={n.style.strokeWidth}
            />
          </React.Fragment>
        )
      }
      if (n.roundedTop && n.roundedTop > 0) {
        const r = Math.min(n.roundedTop, n.w / 2, n.h / 2)
        const { x, y, w, h } = n
        let d: string
        switch (n.roundedEdge) {
          case "right":
            d = `M${x},${y} L${x+w-r},${y} A${r},${r} 0 0 1 ${x+w},${y+r} L${x+w},${y+h-r} A${r},${r} 0 0 1 ${x+w-r},${y+h} L${x},${y+h} Z`
            break
          case "left":
            d = `M${x+w},${y} L${x+r},${y} A${r},${r} 0 0 0 ${x},${y+r} L${x},${y+h-r} A${r},${r} 0 0 0 ${x+r},${y+h} L${x+w},${y+h} Z`
            break
          case "bottom":
            d = `M${x},${y} L${x+w},${y} L${x+w},${y+h-r} A${r},${r} 0 0 1 ${x+w-r},${y+h} L${x+r},${y+h} A${r},${r} 0 0 1 ${x},${y+h-r} Z`
            break
          default: // "top"
            d = `M${x},${y+h} L${x},${y+r} A${r},${r} 0 0 1 ${x+r},${y} L${x+w-r},${y} A${r},${r} 0 0 1 ${x+w},${y+r} L${x+w},${y+h} Z`
        }
        return (
          <React.Fragment key={baseKey}>
            {rectDefs}
            <path
              d={d}
              fill={fillValue}
              opacity={n.style.opacity}
              stroke={n.style.stroke}
              strokeWidth={n.style.strokeWidth}
            />
          </React.Fragment>
        )
      }
      return (
        <React.Fragment key={baseKey}>
          {rectDefs}
          <rect
            x={n.x} y={n.y} width={n.w} height={n.h}
            fill={fillValue}
            opacity={n.style.opacity}
            stroke={n.style.stroke}
            strokeWidth={n.style.strokeWidth}
          />
          {funnelRectLabels(n, baseKey)}
        </React.Fragment>
      )
    }
    case "point": {
      const n = node as PointSceneNode
      return (
        <circle
          key={baseKey}
          cx={n.x} cy={n.y} r={n.r}
          fill={svgFill(n.style.fill)}
          opacity={n.style.opacity ?? n.style.fillOpacity ?? 0.8}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    case "symbol":
      return symbolSceneNodeToSVG(node as SymbolSceneNode, i, idPrefix)
    case "glyph": {
      const n = node as GlyphSceneNode
      return glyphNodeToSVG(n, n.x, n.y, `${idPrefix ?? ""}ord-glyph-${n.pointId ?? i}`)
    }
    case "wedge": {
      const n = node as WedgeSceneNode
      // Scene stores angles in canvas convention (0 = 3 o'clock).
      // d3-shape arc expects 0 = 12 o'clock; the manual path builder
      // accepts canvas convention directly. Pick the builder when the
      // node opts into per-end rounding (gauge endpoints), fall back to
      // d3-arc for uniform all-corner rounding and the unrounded fast
      // path.
      if (n._gradientBand && n._gradientBand.colors.length > 0) {
        // Gradient band: rounded outline drives a clipPath, N unrounded
        // slices inside paint the gradient. Shared geometry with the
        // canvas renderer via `buildGaugeGradientGeometry`. An empty
        // colors array falls through to the standard wedge fill below so
        // the node still renders something rather than disappearing.
        const clipId = safeSvgId(`${idPrefix ? `${idPrefix}-` : ""}gauge-grad-${n.category || baseKey}-${i}`)
        const { clipPath: clipD, slices } = buildGaugeGradientGeometry({
          innerRadius: n.innerRadius,
          outerRadius: n.outerRadius,
          startAngle: n.startAngle,
          endAngle: n.endAngle,
          cornerRadius: n.cornerRadius,
          roundStart: n.roundedEnds?.start ?? true,
          roundEnd: n.roundedEnds?.end ?? true,
          colors: n._gradientBand.colors,
        })
        return (
          <g
            key={baseKey}
            transform={`translate(${n.cx},${n.cy})`}
            opacity={n.style.opacity}
            fillOpacity={n.style.fillOpacity}
          >
            <defs>
              <clipPath id={clipId}>
                <path d={clipD} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              {slices.map((slice, idx) => (
                <path key={idx} d={slice.d} fill={svgFill(slice.color)} />
              ))}
            </g>
            {n.style.stroke && n.style.stroke !== "none" && (
              // Stroke the rounded outline OUTSIDE the clipped group so
              // the stroke isn't itself clipped (half the stroke width
              // sits outside the band's filled region). Matches the
              // non-gradient wedge branches and the canvas renderer.
              <path
                d={clipD}
                fill="none"
                stroke={n.style.stroke}
                strokeWidth={n.style.strokeWidth}
              />
            )}
          </g>
        )
      }
      let arcPath: string
      if (n.roundedEnds) {
        // Per-end rounding opted in. The `roundedEnds` object — even
        // when BOTH flags are false — is the authoritative signal: the
        // caller has explicitly chosen which sides round. Middle
        // wedges in a multi-zone gauge fall here with both flags false
        // and short-circuit to a square sector; without this they'd
        // inherit d3-arc's uniform all-corner rounding via the
        // fallback branch.
        arcPath = annularSectorPath({
          innerRadius: n.innerRadius,
          outerRadius: n.outerRadius,
          startAngle: n.startAngle,
          endAngle: n.endAngle,
          cornerRadius: n.cornerRadius,
          roundStart: n.roundedEnds.start,
          roundEnd: n.roundedEnds.end,
        })
      } else {
        // Uniform all-corner rounding (regular donut) or unrounded.
        const arcGen = d3Arc()
          .innerRadius(n.innerRadius)
          .outerRadius(n.outerRadius)
          .startAngle(n.startAngle + Math.PI / 2)
          .endAngle(n.endAngle + Math.PI / 2)
        if (n.cornerRadius) arcGen.cornerRadius(n.cornerRadius)
        arcPath = arcGen(ARC_NOOP) || ""
      }
      return (
        <path
          key={baseKey}
          d={arcPath}
          transform={`translate(${n.cx},${n.cy})`}
          fill={svgFill(n.style.fill)}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
          opacity={n.style.opacity}
        />
      )
    }
    case "boxplot": {
      const n = node as BoxplotSceneNode
      const halfW = n.columnWidth / 2
      if (n.projection === "vertical") {
        return (
          <g key={baseKey}>
            <line x1={n.x} y1={n.minPos} x2={n.x} y2={n.maxPos} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <rect
              x={n.x - halfW} y={Math.min(n.q1Pos, n.q3Pos)}
              width={n.columnWidth} height={Math.abs(n.q3Pos - n.q1Pos)}
              fill={svgFill(n.style.fill)} fillOpacity={n.style.fillOpacity ?? 0.6}
              stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
            <line x1={n.x - halfW} y1={n.medianPos} x2={n.x + halfW} y2={n.medianPos} stroke={n.style.stroke || "#333"} strokeWidth={2} />
            <line x1={n.x - halfW * 0.5} y1={n.minPos} x2={n.x + halfW * 0.5} y2={n.minPos} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <line x1={n.x - halfW * 0.5} y1={n.maxPos} x2={n.x + halfW * 0.5} y2={n.maxPos} stroke={n.style.stroke || "#333"} strokeWidth={1} />
          </g>
        )
      } else {
        return (
          <g key={baseKey}>
            <line x1={n.minPos} y1={n.y} x2={n.maxPos} y2={n.y} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <rect
              x={Math.min(n.q1Pos, n.q3Pos)} y={n.y - halfW}
              width={Math.abs(n.q3Pos - n.q1Pos)} height={n.columnWidth}
              fill={svgFill(n.style.fill)} fillOpacity={n.style.fillOpacity ?? 0.6}
              stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
            <line x1={n.medianPos} y1={n.y - halfW} x2={n.medianPos} y2={n.y + halfW} stroke={n.style.stroke || "#333"} strokeWidth={2} />
            <line x1={n.minPos} y1={n.y - halfW * 0.5} x2={n.minPos} y2={n.y + halfW * 0.5} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <line x1={n.maxPos} y1={n.y - halfW * 0.5} x2={n.maxPos} y2={n.y + halfW * 0.5} stroke={n.style.stroke || "#333"} strokeWidth={1} />
          </g>
        )
      }
    }
    case "violin": {
      const n = node as ViolinSceneNode
      const elements: React.ReactNode[] = [
        <path
          key={nodeKey("path")}
          d={n.pathString}
          transform={n.translateX || n.translateY ? `translate(${n.translateX},${n.translateY})` : undefined}
          fill={svgFill(n.style.fill)}
          fillOpacity={n.style.fillOpacity ?? 0.6}
          stroke={n.style.stroke || "#333"}
          strokeWidth={n.style.strokeWidth || 1}
        />
      ]
      if (n.iqrLine && n.bounds) {
        const b = n.bounds
        const midX = b.x + b.width / 2
        const midY = b.y + b.height / 2
        // The scene builder already records the projection used to generate
        // both the violin path and its IQR. Aspect-ratio inference breaks for
        // short/wide vertical violins, causing the SVG IQR to rotate while
        // the body remains vertical; canvas correctly reads this field.
        const isVertical = n.iqrLine.isVertical
        if (isVertical) {
          elements.push(
            <line key={nodeKey("iqr")}
              x1={midX} y1={n.iqrLine.q1Pos} x2={midX} y2={n.iqrLine.q3Pos}
              stroke={n.style.stroke || "#333"} strokeWidth={2}
            />,
            <circle key={nodeKey("med")}
              cx={midX} cy={n.iqrLine.medianPos} r={3}
              fill="white" stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
          )
        } else {
          elements.push(
            <line key={nodeKey("iqr")}
              x1={n.iqrLine.q1Pos} y1={midY} x2={n.iqrLine.q3Pos} y2={midY}
              stroke={n.style.stroke || "#333"} strokeWidth={2}
            />,
            <circle key={nodeKey("med")}
              cx={n.iqrLine.medianPos} cy={midY} r={3}
              fill="white" stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
          )
        }
      }
      return <g key={baseKey}>{elements}</g>
    }
    case "connector": {
      const n = node as ConnectorSceneNode
      return (
        <line
          key={baseKey}
          x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2}
          stroke={n.style.stroke || "#999"}
          strokeWidth={n.style.strokeWidth || 1}
          opacity={n.style.opacity ?? 0.5}
        />
      )
    }
    case "trapezoid": {
      const n = node as TrapezoidSceneNode
      const pts = n.points.map(p => `${p[0]},${p[1]}`).join(" ")
      return (
        <polygon
          key={baseKey}
          points={pts}
          fill={svgFill(n.style.fill, "#999")}
          opacity={n.style.opacity}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
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
