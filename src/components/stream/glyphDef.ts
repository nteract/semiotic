/**
 * Glyph definitions — the composite-pictogram sibling of `symbolPath.ts`.
 *
 * A `symbol` scene node is one path; a `glyph` scene node is a small
 * multi-part vector pictogram (an ISOTYPE sign: a server cabinet with accent
 * vents, a factory with windows) defined once in definition space and stamped
 * per datum with per-node color, accent, size, and partial fill. The same
 * `GlyphDef` renders identically on canvas (`drawGlyphParts`), in SVG/SSR
 * (`SceneToSVG`), and in any React chrome the host draws, because everything
 * reads these helpers.
 *
 * Paint roles, not colors: parts declare `fill: "color" | "accent"` (or a
 * literal CSS color) and the node supplies the actual paints — one definition
 * serves every category/status recoloring, exactly how classic pictogram
 * plates reused one cut in many inks.
 */

/** One drawable part of a glyph, in definition coordinates. */
export interface GlyphPart {
  /** SVG path data in definition (viewBox) coordinates. */
  d: string
  /**
   * Fill paint: `"color"` (the node's primary paint), `"accent"` (the node's
   * accent paint), `"none"`, or a literal CSS color. @default "color"
   */
  fill?: "color" | "accent" | "none" | (string & {})
  /** Stroke paint, same tokens as `fill`. @default "none" */
  stroke?: "color" | "accent" | "none" | (string & {})
  /** Stroke width in definition units — scales with the glyph. */
  strokeWidth?: number
  /** Part opacity, multiplied into the node's opacity. */
  opacity?: number
  strokeLinecap?: "butt" | "round" | "square"
  strokeLinejoin?: "miter" | "round" | "bevel"
}

/** A reusable multi-part pictogram definition. */
export interface GlyphDef {
  /** Definition-space box `[width, height]` the parts are drawn in. @default [40, 40] */
  viewBox?: [number, number]
  /**
   * Which point of the viewBox lands on the node's `(x, y)`, as fractions.
   * `[0.5, 0.5]` centers the glyph (the default); `[0.5, 1]` anchors its feet
   * — the "standing on a baseline/terrain" pictogram convention.
   */
  anchor?: [number, number]
  parts: GlyphPart[]
}

export const DEFAULT_GLYPH_VIEWBOX: [number, number] = [40, 40]
export const DEFAULT_GLYPH_ANCHOR: [number, number] = [0.5, 0.5]

/** Resolved placement of a glyph node: scale plus the top-left corner offset
 *  from the node's (x, y), honoring the definition's anchor. */
export interface GlyphPlacement {
  width: number
  height: number
  scale: number
  /** Add to the node's x to get the drawn top-left corner. */
  offsetX: number
  /** Add to the node's y to get the drawn top-left corner. */
  offsetY: number
}

/** Size is the rendered **height** in px; width follows the viewBox aspect.
 *  (Pictogram sizing is a height, unlike the d3-symbol area convention.) */
export function glyphPlacement(def: GlyphDef, size: number): GlyphPlacement {
  const [vbWidth, vbHeight] = def.viewBox ?? DEFAULT_GLYPH_VIEWBOX
  const [anchorX, anchorY] = def.anchor ?? DEFAULT_GLYPH_ANCHOR
  const safeVbHeight = vbHeight > 0 ? vbHeight : 1
  const scale = Math.max(0, size) / safeVbHeight
  const width = (vbWidth > 0 ? vbWidth : safeVbHeight) * scale
  const height = safeVbHeight * scale
  return {
    width,
    height,
    scale,
    offsetX: -anchorX * width,
    offsetY: -anchorY * height,
  }
}

/** Radius from the node's (x, y) that bounds the drawn glyph — used for hit
 *  testing and keyboard-navigation focus geometry. */
export function glyphExtent(def: GlyphDef, size: number): number {
  const placement = glyphPlacement(def, size)
  const corners = [
    [placement.offsetX, placement.offsetY],
    [placement.offsetX + placement.width, placement.offsetY],
    [placement.offsetX, placement.offsetY + placement.height],
    [placement.offsetX + placement.width, placement.offsetY + placement.height],
  ]
  let max = 0
  for (const [cx, cy] of corners) {
    const h = Math.sqrt(cx * cx + cy * cy)
    if (h > max) max = h
  }
  return max
}

/**
 * Resolve a part's paint token against the node's paints. Returns `undefined`
 * for `"none"`/absent so callers can skip the fill/stroke entirely.
 */
export function resolveGlyphPaint(
  token: string | undefined,
  color: string | undefined,
  accent: string | undefined,
  fallback?: string
): string | undefined {
  if (token === "none") return undefined
  if (token === "color" || token == null) return color ?? fallback
  if (token === "accent") return accent
  return token
}

// Path2D cache — glyph parts repeat heavily (a unit chart stamps one def
// hundreds of times), and Path2D parsing is the per-part cost worth skipping.
// Client-only: SSR renders through SceneToSVG and never touches this.
let PATH2D_CACHE: Map<string, Path2D> | null = null

export function getGlyphPath2D(d: string): Path2D | null {
  if (typeof Path2D === "undefined") return null
  if (!PATH2D_CACHE) PATH2D_CACHE = new Map()
  const cached = PATH2D_CACHE.get(d)
  if (cached) return cached
  const path = new Path2D(d)
  if (PATH2D_CACHE.size > 1024) PATH2D_CACHE.clear()
  PATH2D_CACHE.set(d, path)
  return path
}

/** The shared fraction geometry for partial glyph fills: the clip rect in
 *  definition space covering `[fractionStart, fraction]` of the glyph. */
export function glyphFractionClipRect(
  def: GlyphDef,
  fraction: number,
  fractionStart = 0,
  direction: "horizontal" | "vertical" = "horizontal"
): { x: number; y: number; width: number; height: number } | null {
  const [vbWidth, vbHeight] = def.viewBox ?? DEFAULT_GLYPH_VIEWBOX
  const from = Math.min(1, Math.max(0, fractionStart))
  const to = Math.min(1, Math.max(0, fraction))
  if (to <= from) return { x: 0, y: 0, width: 0, height: 0 }
  if (from <= 0 && to >= 1) return null // no clipping needed
  if (direction === "vertical") {
    // Vertical fills rise from the bottom (thermometers, gauges).
    return {
      x: 0,
      y: vbHeight * (1 - to),
      width: vbWidth,
      height: vbHeight * (to - from),
    }
  }
  return { x: vbWidth * from, y: 0, width: vbWidth * (to - from), height: vbHeight }
}

/** Hit/focus geometry of a glyph node: the drawn bounds' center offset from
 *  the node's (x, y) plus its half-extents — shared by the four hit testers
 *  and the keyboard-nav extractors so pointer and focus agree exactly. */
export function glyphHitGeometry(
  def: GlyphDef,
  size: number
): { centerDx: number; centerDy: number; halfWidth: number; halfHeight: number; radius: number } {
  const placement = glyphPlacement(def, size)
  return {
    centerDx: placement.offsetX + placement.width / 2,
    centerDy: placement.offsetY + placement.height / 2,
    halfWidth: placement.width / 2,
    halfHeight: placement.height / 2,
    radius: Math.max(placement.width, placement.height) / 2,
  }
}

/**
 * Paint a glyph's parts onto a canvas context. The caller has already
 * translated/scaled into definition space (via {@link glyphPlacement}) and
 * set global alpha; this draws parts with the node's paints. `paintOverride`
 * paints every part in one flat color — the ghost-silhouette pass under a
 * partial fill. `resolvePaint` maps a computed paint through the renderer's
 * CSS-var resolution before it hits the canvas.
 */
export function drawGlyphParts(
  ctx: CanvasRenderingContext2D,
  def: GlyphDef,
  color: string | undefined,
  accent: string | undefined,
  paintOverride?: string,
  resolvePaint: (paint: string) => string = (paint) => paint
): void {
  for (const part of def.parts) {
    const path = getGlyphPath2D(part.d)
    if (!path) continue
    const partAlpha = part.opacity ?? 1
    const priorAlpha = ctx.globalAlpha
    if (partAlpha !== 1) ctx.globalAlpha = priorAlpha * partAlpha
    const fill = paintOverride
      ? part.fill === "none"
        ? undefined
        : paintOverride
      : resolveGlyphPaint(part.fill, color, accent)
    if (fill) {
      ctx.fillStyle = resolvePaint(fill)
      ctx.fill(path)
    }
    const stroke = paintOverride
      ? part.stroke && part.stroke !== "none"
        ? paintOverride
        : undefined
      : resolveGlyphPaint(part.stroke ?? "none", color, accent)
    if (stroke) {
      ctx.strokeStyle = resolvePaint(stroke)
      ctx.lineWidth = part.strokeWidth ?? 1
      ctx.lineCap = part.strokeLinecap ?? "butt"
      ctx.lineJoin = part.strokeLinejoin ?? "miter"
      ctx.stroke(path)
    }
    if (partAlpha !== 1) ctx.globalAlpha = priorAlpha
  }
}
