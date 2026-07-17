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
import type { Style } from "./types"

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
