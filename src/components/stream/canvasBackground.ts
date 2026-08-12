/**
 * Shared canvas background fill for Stream Frames.
 *
 * Resolves CSS variables via `resolveCSSColor` so `background="var(--token)"`
 * does not leave a stale fillStyle (palette-flashing on continuous frames).
 */
import { resolveCSSColor } from "./renderers/resolveCSSColor"

export interface PaintCanvasBackgroundOptions {
  /** Explicit chart background color (or CSS var). */
  background?: string
  /**
   * When true, skip the fill so an SVG backgroundGraphics layer shows through.
   * Equivalent to frames' `backgroundGraphics` prop being set.
   */
  hasBackgroundGraphics?: boolean
  /**
   * Theme fallback when `background` is unset (e.g. `--semiotic-bg`).
   * Empty / transparent values are ignored.
   */
  themeBackground?: string
  /** Fill origin (plot-local or canvas-local depending on frame transform). */
  x?: number
  y?: number
  width: number
  height: number
}

export type CanvasBackgroundOptions = Pick<
  PaintCanvasBackgroundOptions,
  "background" | "hasBackgroundGraphics" | "themeBackground"
>

/**
 * Resolve the full-frame surface that sits below a canvas and any custom
 * background graphics.
 *
 * Unlike the canvas painter, this surface keeps an explicit `background`
 * when `backgroundGraphics` are present so the requested solid is composed
 * beneath the custom SVG. The implicit theme surface remains suppressed in
 * that mode, preserving transparent custom-background composition.
 */
export function resolveFrameSurfaceBackground(
  options: CanvasBackgroundOptions
): string | null {
  const {
    background,
    hasBackgroundGraphics = false,
    themeBackground = ""
  } = options

  if (background === "transparent") return null
  if (hasBackgroundGraphics) return background || null
  const theme =
    themeBackground && themeBackground !== "transparent" ? themeBackground : ""
  return background || theme || null
}

/**
 * Select the background token a canvas will attempt to paint. This is kept
 * separate from the drawing operation so SVG layer composition can use the
 * exact same visibility decision as the canvas renderer.
 */
export function resolveCanvasBackground(
  options: CanvasBackgroundOptions
): string | null {
  const {
    background,
    hasBackgroundGraphics = false,
    themeBackground = "",
  } = options

  if (background === "transparent" || hasBackgroundGraphics) return null
  const theme =
    themeBackground && themeBackground !== "transparent" ? themeBackground : ""
  return background || theme || null
}

/**
 * Paint an opaque chart background when appropriate.
 * Returns true if a fill was applied.
 */
export function paintCanvasBackground(
  ctx: CanvasRenderingContext2D,
  options: PaintCanvasBackgroundOptions
): boolean {
  const {
    background,
    hasBackgroundGraphics = false,
    themeBackground = "",
    x = 0,
    y = 0,
    width,
    height
  } = options

  const effective = resolveCanvasBackground({
    background,
    hasBackgroundGraphics,
    themeBackground,
  })
  if (!effective) return false

  const resolved = resolveCSSColor(ctx, effective)
  if (!resolved || resolved.trim().toLowerCase() === "transparent") return false

  ctx.fillStyle = resolved
  ctx.fillRect(x, y, width, height)
  return true
}
