/**
 * Create a diagonal-line hatch CanvasPattern for use as a fill style.
 *
 * Returns a CanvasPattern that can be passed as `fill` in any pieceStyle,
 * nodeStyle, or edgeStyle function. Works with all canvas-rendered charts.
 *
 * @example
 * ```tsx
 * const hatch = createHatchPattern({ background: "#4e79a7", stroke: "#fff" })
 * <BarChart
 *   pieceStyle={(d) => ({ fill: d.projected ? hatch : "#4e79a7" })}
 * />
 * ```
 */
import type { HatchFill } from "./hatchFill"

export interface HatchPatternOptions {
  /** Background color of the pattern tile */
  background?: string
  /** Color of the diagonal lines */
  stroke?: string
  /** Width of the diagonal lines in pixels @default 1.5 */
  lineWidth?: number
  /** Perpendicular distance between line centers in pixels @default 6 */
  spacing?: number
  /**
   * Angle of the lines in degrees. 0 is horizontal; positive angles turn
   * clockwise on screen, so 45 draws `\` and -45 draws `/`. @default 45
   */
  angle?: number
  /** Opacity of the hatch lines (the background stays opaque). @default 1 */
  lineOpacity?: number
}

/**
 * The hatch tile both backends draw: one horizontal line centered in a tile
 * `spacing` tall, repeated and then rotated by `angle` (canvas
 * `CanvasPattern.setTransform`, SVG `patternTransform`). Because the tile is
 * axis-aligned and only the pattern is rotated, every angle tiles without
 * seams and `spacing` is the perpendicular gap at every angle.
 */
export function hatchTileGeometry(spacing: number): {
  width: number
  height: number
  lineY: number
} {
  const period = Number.isFinite(spacing) && spacing > 0 ? spacing : 6
  return { width: Math.max(8, period), height: period, lineY: period / 2 }
}

/**
 * The serializable `HatchFill` equivalent of the requested pattern. Returned
 * when no canvas is available (SSR/test) so a `pieceStyle`/`nodeStyle` doing
 * `createHatchPattern(...) ?? color` still yields a hatch that the SVG path
 * renders as a `<pattern>` — instead of silently collapsing to the solid
 * fallback. On canvas the real `CanvasPattern` is returned as before.
 */
function hatchFillDescriptor(o: Required<HatchPatternOptions>): HatchFill {
  return {
    type: "hatch",
    background: o.background,
    stroke: o.stroke,
    lineWidth: o.lineWidth,
    spacing: o.spacing,
    angle: o.angle,
    ...(o.lineOpacity !== 1 ? { lineOpacity: o.lineOpacity } : {}),
  }
}

let _offscreen: HTMLCanvasElement | null = null

function getOffscreenCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height)
  }
  if (!_offscreen) {
    _offscreen = document.createElement("canvas")
  }
  _offscreen.width = width
  _offscreen.height = height
  return _offscreen
}

type HatchTileContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

function tileRasterScale(): number {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  return Math.min(3, Math.max(1, dpr))
}

function paintTileBackground(ctx: HatchTileContext, background: string, width: number, height: number): void {
  if (background && background !== "transparent" && background !== "none") {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
  } else {
    ctx.clearRect(0, 0, width, height)
  }
}

/**
 * Create a repeating diagonal-line hatch pattern for canvas fills.
 *
 * In a browser (canvas available) returns a `CanvasPattern`. In server/test
 * environments — where canvas is unavailable — returns the equivalent
 * serializable {@link HatchFill} descriptor instead of `null`, so the same
 * `pieceStyle`/`nodeStyle` renders a hatch through the SVG path rather than
 * collapsing to the solid fallback. Use {@link isHatchFill} to distinguish the
 * two forms; both are valid as a `style.fill`.
 *
 * The canvas pattern and the SVG `<pattern>` from `hatchPatternDef` share one
 * tile (`hatchTileGeometry`), so the same options draw the same angle,
 * spacing, and line opacity in the browser and in static SVG.
 */
export function createHatchPattern(
  options: HatchPatternOptions = {},
  /** Optional target canvas to create the pattern on */
  targetCtx?: CanvasRenderingContext2D
): CanvasPattern | HatchFill | null {
  const {
    background = "transparent",
    stroke = "#000",
    lineWidth = 1.5,
    spacing = 6,
    angle = 45,
    lineOpacity = 1,
  } = options
  const resolved = { background, stroke, lineWidth, spacing, angle, lineOpacity }
  const tile = hatchTileGeometry(spacing)

  // Bake the tile at device resolution; the pattern transform scales it back
  // to CSS pixels, so a 2x canvas gets crisp lines.
  const scale = tileRasterScale()
  const tileWidth = Math.max(1, Math.round(tile.width * scale))
  const tileHeight = Math.max(1, Math.round(tile.height * scale))

  let tileCanvas: HTMLCanvasElement | OffscreenCanvas
  try {
    tileCanvas = getOffscreenCanvas(tileWidth, tileHeight)
  } catch {
    return hatchFillDescriptor(resolved) // SSR or test environment
  }

  const ctx = tileCanvas.getContext("2d") as HatchTileContext | null
  if (!ctx) return hatchFillDescriptor(resolved)

  paintTileBackground(ctx, background, tileWidth, tileHeight)
  const pxPerUnitY = tileHeight / tile.height
  const bandHeight = Math.max(0, lineWidth) * pxPerUnitY
  ctx.save()
  ctx.globalAlpha = Math.min(1, Math.max(0, lineOpacity))
  ctx.fillStyle = stroke
  ctx.fillRect(0, tile.lineY * pxPerUnitY - bandHeight / 2, tileWidth, bandHeight)
  ctx.restore()

  // Create the pattern on the target context if provided, otherwise use the tile's own context
  const patternCtx = targetCtx || ctx
  const pattern = patternCtx.createPattern(tileCanvas, "repeat")
  if (!pattern) return pattern

  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const sx = tile.width / tileWidth
  const sy = tile.height / tileHeight
  // rotate(angle) · scale(sx, sy) — the same transform the SVG pattern
  // applies with `patternTransform="rotate(angle)"` on a CSS-pixel tile.
  // (`setTransform` is in every supported browser; a stub context without it
  // keeps the untransformed tile.)
  pattern.setTransform?.({ a: cos * sx, b: sin * sx, c: -sin * sy, d: cos * sy, e: 0, f: 0 })
  return pattern
}
