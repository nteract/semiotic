import * as React from "react"
import type { GlyphDef } from "../stream/glyphDef"
import {
  DEFAULT_GLYPH_VIEWBOX,
  glyphFractionClipRect,
  resolveGlyphPaint,
} from "../stream/glyphDef"

/**
 * `<Glyph>` — render a {@link GlyphDef} as plain SVG.
 *
 * The React face of the composite-pictogram system: the same definition a
 * custom layout stamps as `glyph` scene nodes (canvas + SSR) renders here for
 * everything that lives in JSX — overlay chrome, `legendSwatches`-style keys,
 * recipe icon callbacks (e.g. `lineageDagLayout`'s `renderIcon`), and page
 * furniture. One definition, three surfaces, no drift.
 *
 * Positioning is deliberately chrome-shaped: the definition's **top-left**
 * corner lands at (`x`, `y`) and `size` is the rendered height (width follows
 * the viewBox aspect). The definition's `anchor` is a scene-node concern —
 * layouts use it to stand signs on baselines — and is ignored here, where the
 * caller owns placement.
 */
export interface GlyphProps {
  def: GlyphDef
  /** Rendered height in px; width follows the definition's viewBox aspect. @default 24 */
  size?: number
  /** Primary paint for parts declaring `"color"`. @default "currentColor" */
  color?: string
  /** Accent paint for parts declaring `"accent"`. @default "#ffffff" */
  accent?: string
  /** Partial fill 0–1 — pair with the `unitize` recipe's `fraction`. @default 1 */
  fraction?: number
  /** Where the partial fill begins, 0–1 (range boundary signs). @default 0 */
  fractionStart?: number
  /** Partial-fill axis. @default "horizontal" */
  fractionDirection?: "horizontal" | "vertical"
  /** Ghost paint drawn at full extent beneath a partial fill so the whole
   *  sign stays countable. */
  ghostColor?: string
  /** Top-left x of the definition box in the parent SVG. @default 0 */
  x?: number
  /** Top-left y of the definition box in the parent SVG. @default 0 */
  y?: number
  opacity?: number
  className?: string
}

function GlyphParts({
  def,
  color,
  accent,
  paintOverride,
}: {
  def: GlyphDef
  color: string
  accent: string
  paintOverride?: string
}): React.ReactElement {
  return (
    <>
      {def.parts.map((part, index) => {
        const fill = paintOverride
          ? part.fill === "none"
            ? undefined
            : paintOverride
          : resolveGlyphPaint(part.fill, color, accent)
        const stroke = paintOverride
          ? part.stroke && part.stroke !== "none"
            ? paintOverride
            : undefined
          : resolveGlyphPaint(part.stroke ?? "none", color, accent)
        if (!fill && !stroke) return null
        return (
          <path
            key={index}
            d={part.d}
            fill={fill ?? "none"}
            stroke={stroke}
            strokeWidth={stroke ? part.strokeWidth ?? 1 : undefined}
            strokeLinecap={part.strokeLinecap}
            strokeLinejoin={part.strokeLinejoin}
            opacity={part.opacity}
          />
        )
      })}
    </>
  )
}

export function Glyph({
  def,
  size = 24,
  color = "currentColor",
  accent = "#ffffff",
  fraction = 1,
  fractionStart = 0,
  fractionDirection = "horizontal",
  ghostColor,
  x = 0,
  y = 0,
  opacity,
  className,
}: GlyphProps): React.ReactElement | null {
  const reactId = React.useId()
  if (!def?.parts?.length) return null
  const [, vbHeight] = def.viewBox ?? DEFAULT_GLYPH_VIEWBOX
  const scale = size / (vbHeight > 0 ? vbHeight : 1)
  if (!(scale > 0)) return null
  const clip = glyphFractionClipRect(def, fraction, fractionStart, fractionDirection)
  const clipId = clip ? `glyph-clip${reactId.replace(/[^A-Za-z0-9_-]/g, "_")}` : undefined
  return (
    <g
      className={className}
      transform={`translate(${x} ${y}) scale(${scale})`}
      opacity={opacity}
      aria-hidden="true"
    >
      {clip && clipId && (
        <clipPath id={clipId}>
          <rect x={clip.x} y={clip.y} width={clip.width} height={clip.height} />
        </clipPath>
      )}
      {clip && ghostColor ? (
        <GlyphParts def={def} color={color} accent={accent} paintOverride={ghostColor} />
      ) : null}
      {clip && clipId ? (
        <g clipPath={`url(#${clipId})`}>
          <GlyphParts def={def} color={color} accent={accent} />
        </g>
      ) : (
        <GlyphParts def={def} color={color} accent={accent} />
      )}
    </g>
  )
}
