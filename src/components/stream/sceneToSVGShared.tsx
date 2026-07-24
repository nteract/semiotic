/**
 * Low-level SVG serialization helpers shared across SceneToSVG.tsx,
 * SceneToSVGNetwork.tsx, and SceneToSVGGeo.tsx. Split out so the three
 * scene-family serializers can import a common base without a circular
 * dependency between them.
 */

import * as React from "react"
import type { DefaultArcObject } from "d3-shape"
import { isHatchFill, type HatchFill } from "../charts/shared/hatchFill"
import { glyphFractionClipRect, glyphPlacement, resolveGlyphPaint } from "./glyphDef"
import type { GlyphDef } from "./glyphDef"
import type { RectSceneNode, Style, SymbolSceneNode } from "./types"
import { clampCornerRadii } from "./renderers/cornerRadii"
import { symbolPathString } from "./symbolPath"
import type { GradientStop } from "../charts/shared/gradient"

/**
 * Sentinel arg for d3-shape arc generators that have all four
 * accessors set to constants. The generator's call signature requires
 * a `DefaultArcObject` even though it never reads the argument when
 * accessors are non-functional. Typing this once avoids local unsafe casts at
 * the arc-emit sites in the network/ordinal serializers.
 */
export const ARC_NOOP: DefaultArcObject = {
  innerRadius: 0,
  outerRadius: 0,
  startAngle: 0,
  endAngle: 0,
}

// ── Fill helper (CanvasPattern → fallback for SVG) ─────────────────────

export function svgFill(fill: string | HatchFill | CanvasPattern | undefined, fallback = "#4e79a7"): string {
  // A HatchFill descriptor is only rendered as an SVG <pattern> by the rect
  // serializer (bars). Any other node degrades it to a solid color — the
  // descriptor's background if present, else the fallback.
  if (isHatchFill(fill)) return fill.background && fill.background !== "transparent" ? fill.background : fallback
  if (!fill || typeof fill !== "string") return fallback
  return fill
}

/**
 * Coerce a candidate SVG `id` value to the strict `[A-Za-z0-9_-]` charset.
 * Scene-node keys embed user-provided category/group strings, which can
 * contain spaces, colons, parentheses, or other characters that are either
 * invalid in an SVG id or break a `url(#id)` reference. Non-matching
 * characters are replaced with underscores; an empty/leading-digit result
 * is prefixed so the final id is a legal SVG identifier.
 */
export function safeSvgId(candidate: string): string {
  const cleaned = candidate.replace(/[^A-Za-z0-9_-]/g, "_")
  // SVG ids can't start with a digit; prepend a letter in that edge case.
  if (!cleaned || /^\d/.test(cleaned)) return `s_${cleaned}`
  return cleaned
}

/**
 * Shared SVG serializer for glyph nodes across all four pipelines — the
 * composite-pictogram sibling of `symbolSceneNodeToSVG`. Callers pass the
 * node's position explicitly (`x`/`y` for XY/ordinal/geo, `cx`/`cy` for
 * network) so one implementation matches `glyphCanvasRenderer` exactly:
 * anchor + scale transform, role-token paints, optional ghost silhouette,
 * and a deterministic `clipPath` for partial fills.
 */
export function glyphNodeToSVG(
  g: {
    size: number
    glyph: GlyphDef
    color?: string
    accent?: string
    fraction?: number
    fractionStart?: number
    fractionDirection?: "horizontal" | "vertical"
    ghostColor?: string
    rotation?: number
    style: Style
    pointId?: string
    _decayOpacity?: number
  },
  x: number,
  y: number,
  key: string
): React.ReactNode {
  const def = g.glyph
  if (!def?.parts?.length || g.size <= 0) return null
  const placement = glyphPlacement(def, g.size)
  if (placement.scale <= 0) return null
  const rotate = g.rotation ? ` rotate(${(g.rotation * 180) / Math.PI})` : ""
  const transform = `translate(${x},${y})${rotate} translate(${placement.offsetX},${placement.offsetY}) scale(${placement.scale})`
  const color = g.color ?? (typeof g.style.fill === "string" ? g.style.fill : undefined)
  const clip = glyphFractionClipRect(
    def,
    g.fraction ?? 1,
    g.fractionStart ?? 0,
    g.fractionDirection ?? "horizontal"
  )
  const clipId = clip ? safeSvgId(`${key}-clip`) : undefined
  // Mirror glyphCanvasRenderer, which folds fillOpacity into the node alpha —
  // otherwise SSR/SVG output is more opaque than canvas when fillOpacity is set.
  const opacity =
    (g.style.opacity ?? 1) * (g._decayOpacity ?? 1) * (g.style.fillOpacity ?? 1)

  const parts = (paintOverride?: string) =>
    def.parts.map((part, partIndex) => {
      const fill = paintOverride
        ? part.fill === "none"
          ? undefined
          : paintOverride
        : resolveGlyphPaint(part.fill, color, g.accent)
      const stroke = paintOverride
        ? part.stroke && part.stroke !== "none"
          ? paintOverride
          : undefined
        : resolveGlyphPaint(part.stroke ?? "none", color, g.accent)
      if (!fill && !stroke) return null
      return (
        <path
          key={partIndex}
          d={part.d}
          fill={fill ?? "none"}
          stroke={stroke}
          strokeWidth={stroke ? part.strokeWidth ?? 1 : undefined}
          strokeLinecap={part.strokeLinecap}
          strokeLinejoin={part.strokeLinejoin}
          opacity={part.opacity}
        />
      )
    })

  return (
    <g key={key} transform={transform} opacity={opacity === 1 ? undefined : opacity}>
      {clip && clipId && (
        <clipPath id={clipId}>
          <rect x={clip.x} y={clip.y} width={clip.width} height={clip.height} />
        </clipPath>
      )}
      {clip && g.ghostColor ? <g>{parts(g.ghostColor)}</g> : null}
      {clip && clipId ? <g clipPath={`url(#${clipId})`}>{parts()}</g> : parts()}
    </g>
  )
}

// ── Shared between XY and ordinal serializers ───────────────────────────

export function colorStopElements(
  stops: GradientStop[],
  baseColor: string,
): React.ReactElement[] | null {
  const validStops = stops
    .filter(stop =>
      Number.isFinite(stop.offset)
      && (stop.opacity == null || Number.isFinite(stop.opacity)),
    )
    .map(stop => ({
      offset: Math.max(0, Math.min(1, stop.offset)),
      color: stop.color ?? baseColor,
      opacity: stop.opacity == null
        ? undefined
        : Math.max(0, Math.min(1, stop.opacity)),
    }))
  if (validStops.length < 2) return null
  return validStops.map((stop, index) => (
    <stop
      key={index}
      offset={stop.offset}
      stopColor={stop.color}
      stopOpacity={stop.opacity}
    />
  ))
}

/**
 * Build `<defs><linearGradient>` for a bar's fillGradient, mirroring the
 * tip→base direction the canvas renderer uses (inferred from roundedEdge).
 * Returns null when the config has fewer than two usable stops, so the
 * caller falls back to a solid fill — same parity with the canvas path.
 *
 * Using `gradientUnits="userSpaceOnUse"` with absolute coords keeps each bar's
 * gradient aligned to its own rect independent of the parent viewBox.
 */
export function buildRectSVGGradient(n: RectSceneNode, id: string): React.ReactElement | null {
  const fg = n.fillGradient
  if (!fg || typeof fg !== "object") return null

  // Tip → base coords by orientation. Default top-to-bottom for positive
  // vertical bars (and anything without roundedEdge).
  let x1 = n.x, y1 = n.y, x2 = n.x, y2 = n.y + n.h
  if (n.roundedEdge === "bottom") { y1 = n.y + n.h; y2 = n.y }
  else if (n.roundedEdge === "right") { x1 = n.x + n.w; y1 = n.y; x2 = n.x; y2 = n.y }
  else if (n.roundedEdge === "left")  { x1 = n.x; y1 = n.y; x2 = n.x + n.w; y2 = n.y }

  const stops = colorStopElements(fg.stops, svgFill(n.style.fill))
  if (!stops) return null

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
 * Emit an SVG path string for a rect with per-corner radii. Same trace
 * order as the canvas helper (CCW from top-left); shared shape utilities
 * (`hasAnyCornerRadius`, `clampCornerRadii`) live in
 * `./renderers/cornerRadii.ts` so both paint paths agree on geometry.
 */
export function perCornerSvgPath(n: RectSceneNode): string {
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
 * Shared SVG serializer for the XY/ordinal `SymbolSceneNode` (x/y-based) — the
 * sibling of the network symbol case in `networkSceneNodeToSVG` (cx/cy). Both
 * delegate glyph-path generation to `symbolPathString`, matching the canvas
 * renderer exactly (fill only when a fill is set, so stroke-only glyphs stay
 * unfilled in SSR too).
 */
export function symbolSceneNodeToSVG(n: SymbolSceneNode, i: number, idPrefix?: string): React.ReactNode {
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
