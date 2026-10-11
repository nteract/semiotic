// NOTE: no "use client" directive — this component is rendered by
// the server SVG serializer (semiotic/server via staticAnnotations) as well as
// the client overlay, so it must stay server-importable in RSC frameworks. It
// is a pure render function: no hooks, no browser APIs.
/**
 * Shared region-annotation label for browser and server rendering.
 * background selects a stroke halo, padded box, plain text, or a custom
 * treatment. Box geometry uses estimated text width in both renderers.
 */
import * as React from "react"
import { cssVarFallback, isCssVarPaint } from "./cssVarFallback"

export interface AnnotationLabelBackgroundConfig {
  /** Backdrop treatment. @default "halo" */
  type?: "halo" | "box"
  /**
   * Backdrop paint. For `"halo"` it is the outline color (defaults to the
   * plot background so the halo "erases" marks under the text). For `"box"`
   * it is the panel fill.
   * @default "var(--semiotic-bg, #ffffff)"
   */
  fill?: string
  /** Box fill opacity (box mode only). @default 0.85 */
  opacity?: number
  /** Box inner padding in px — number (uniform) or `{x,y}`. @default {x:6,y:3} */
  padding?: number | { x: number; y: number }
  /** Box corner radius in px. @default 3 */
  radius?: number
  /** Box border color (box mode only). */
  stroke?: string
  /** Box border width in px. @default 0 */
  strokeWidth?: number
  /** Halo stroke width in px (halo mode only). @default 3 */
  haloWidth?: number
}

export type AnnotationLabelBackground =
  boolean
  | "halo"
  | "box"
  | "none"
  | AnnotationLabelBackgroundConfig

export interface AnnotationLabelProps {
  x: number
  y: number
  text: string | number
  /** Text color. */
  fill: string
  fontSize?: number
  fontWeight?: string | number
  fontFamily?: string
  textAnchor?: "start" | "middle" | "end"
  dominantBaseline?: React.SVGAttributes<SVGTextElement>["dominantBaseline"]
  /**
   * Backdrop treatment. Defaults to `"halo"` (the legacy region-label look).
   * Pass `"box"` for a semitransparent panel, `"none"` for plain text, or a
   * config object for fine control.
   */
  background?: AnnotationLabelBackground
  className?: string
}

const DEFAULT_HALO_COLOR = "var(--semiotic-bg, #ffffff)"
const DEFAULT_BOX_OPACITY = 0.85

/**
 * Rough width of a rendered label. SVG offers no synchronous text metrics
 * (and the server has no DOM at all), so we estimate from character count.
 * ~0.6em per glyph is a reasonable average for the sans-serif UI faces this
 * library ships; the box carries padding, so a small error is invisible.
 */
export function estimateLabelWidth(text: string | number, fontSize: number): number {
  return String(text).length * fontSize * 0.6
}

/** Normalize the loose `background` prop into a resolved config (or null for plain text). */
function resolveBackground(
  background: AnnotationLabelBackground | undefined,
): (AnnotationLabelBackgroundConfig & { type: "halo" | "box" }) | null {
  if (background === undefined || background === true || background === "halo") {
    return { type: "halo" }
  }
  if (background === false || background === "none") return null
  if (background === "box") return { type: "box" }
  return { ...background, type: background.type ?? "halo" }
}

/**
 * Render an annotation's text label with an optional legibility backdrop.
 * Emits a bare `<text>` (halo/none) or a `<g>` with a backing `<rect>` + text
 * (box). Safe on both the client SVG overlay and the server static SVG path.
 */
export function AnnotationLabel(props: AnnotationLabelProps): React.ReactElement {
  const {
    x,
    y,
    text,
    fill,
    fontSize = 12,
    fontWeight,
    fontFamily,
    textAnchor = "start",
    dominantBaseline,
    background,
    className,
  } = props

  const bg = resolveBackground(background)

  const textEl = (haloProps?: { stroke: string; strokeWidth: number }) => (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline={dominantBaseline}
      fill={fill}
      fontSize={fontSize}
      fontWeight={fontWeight}
      fontFamily={fontFamily}
      className={className}
      // A CSS variable used as an SVG presentation attribute is not resolved
      // consistently by browser SVG paint paths. Put halo paint in the style
      // declaration so the CSS cascade resolves it before the text is drawn.
      {...(haloProps ? {
        style: {
          stroke: haloProps.stroke,
          strokeWidth: haloProps.strokeWidth,
          paintOrder: "stroke",
        },
      } : {})}
    >
      {text}
    </text>
  )

  if (!bg) return textEl()

  if (bg.type === "halo") {
    return textEl({
      stroke: bg.fill ?? DEFAULT_HALO_COLOR,
      strokeWidth: bg.haloWidth ?? 3,
    })
  }

  // Box backdrop — derive a padded rect from the estimated text extent and
  // the anchor/baseline so the panel sits behind the glyphs.
  const pad = bg.padding ?? { x: 6, y: 3 }
  const padX = typeof pad === "number" ? pad : pad.x
  const padY = typeof pad === "number" ? pad : pad.y
  const textW = estimateLabelWidth(text, fontSize)
  const boxW = textW + padX * 2
  const boxH = fontSize + padY * 2

  let rectX: number
  if (textAnchor === "middle") rectX = x - textW / 2 - padX
  else if (textAnchor === "end") rectX = x - textW - padX
  else rectX = x - padX

  // Vertical placement follows the baseline the caller asked for.
  let rectY: number
  if (dominantBaseline === "middle" || dominantBaseline === "central") {
    rectY = y - boxH / 2
  } else if (dominantBaseline === "hanging" || dominantBaseline === "text-before-edge") {
    rectY = y - padY
  } else {
    // Default alphabetic baseline: text ascends ~0.8em above `y`.
    rectY = y - fontSize * 0.8 - padY
  }

  // Same reasoning as the halo: a var() paint goes in `style`, where the CSS
  // cascade resolves it. The attribute keeps the literal fallback for
  // renderers that don't evaluate CSS.
  const boxFill = bg.fill ?? DEFAULT_HALO_COLOR
  const boxStyle: React.CSSProperties = {}
  if (isCssVarPaint(boxFill)) boxStyle.fill = boxFill
  if (isCssVarPaint(bg.stroke)) boxStyle.stroke = bg.stroke

  return (
    <g className={className}>
      <rect
        x={rectX}
        y={rectY}
        width={boxW}
        height={boxH}
        rx={bg.radius ?? 3}
        ry={bg.radius ?? 3}
        fill={isCssVarPaint(boxFill) ? cssVarFallback(boxFill) : boxFill}
        fillOpacity={bg.opacity ?? DEFAULT_BOX_OPACITY}
        stroke={isCssVarPaint(bg.stroke) ? cssVarFallback(bg.stroke) : bg.stroke}
        strokeWidth={bg.strokeWidth}
        {...(boxStyle.fill || boxStyle.stroke ? { style: boxStyle } : {})}
      />
      {textEl()}
    </g>
  )
}
