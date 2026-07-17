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
export interface HatchPatternOptions {
  /** Background color of the pattern tile */
  background?: string
  /** Color of the diagonal lines */
  stroke?: string
  /** Width of the diagonal lines in pixels @default 1.5 */
  lineWidth?: number
  /** Spacing between lines in pixels @default 6 */
  spacing?: number
  /** Angle of the lines in degrees (0 = horizontal, 45 = diagonal) @default 45 */
  angle?: number
}

/**
 * Create a repeating diagonal-line hatch pattern for canvas fills.
 *
 * Must be called in a browser environment (needs canvas). Returns null
 * in server/test environments where canvas is unavailable.
 *
 * **Never throws.** A zero-size target chart canvas (first layout, hidden
 * tab, collapsed panel) used to make `createPattern` throw
 * `"The canvas height is 0"` and take down the chart error boundary.
 * Callers should fall back to a solid color when this returns null.
 */
export function createHatchPattern(
  options: HatchPatternOptions = {},
  /** Target chart context — pattern is bound to this context when usable */
  targetCtx?: CanvasRenderingContext2D,
): CanvasPattern | null {
  try {
    if (typeof document === "undefined") return null

    const {
      background = "transparent",
      stroke = "#000",
      lineWidth = 1.5,
      spacing = 6,
      angle = 45,
    } = options

    // Guard NaN/negative spacing so we never mint a 0×0 tile.
    const gap = Number.isFinite(spacing) && spacing > 0 ? spacing : 6
    const size = Math.max(8, Math.ceil(gap * 2))

    // Fresh HTML canvas every call — no shared OffscreenCanvas / reuse.
    // Shared tiles previously raced with layout thrash and surfaced as 0-height
    // sources for createPattern.
    const tile = document.createElement("canvas")
    tile.width = size
    tile.height = size
    if (tile.width <= 0 || tile.height <= 0) return null

    const tctx = tile.getContext("2d")
    if (!tctx) return null

    if (background && background !== "transparent") {
      tctx.fillStyle = background
      tctx.fillRect(0, 0, size, size)
    } else {
      tctx.clearRect(0, 0, size, size)
    }

    tctx.strokeStyle = stroke
    tctx.lineWidth = lineWidth
    tctx.lineCap = "square"

    const rad = (angle * Math.PI) / 180

    if (angle === 45 || angle === -45) {
      const sign = angle > 0 ? 1 : -1
      for (let offset = -size; offset <= size * 2; offset += gap) {
        tctx.beginPath()
        tctx.moveTo(offset, 0)
        tctx.lineTo(offset + sign * size, size)
        tctx.stroke()
      }
    } else {
      tctx.save()
      tctx.translate(size / 2, size / 2)
      tctx.rotate(rad)
      const diagonal = size * 2
      for (let y = -diagonal; y <= diagonal; y += gap) {
        tctx.beginPath()
        tctx.moveTo(-diagonal, y)
        tctx.lineTo(diagonal, y)
        tctx.stroke()
      }
      tctx.restore()
    }

    // CanvasPattern is bound to the context that created it. Only create on the
    // chart context when its bitmap has positive size — otherwise Chrome throws
    // InvalidStateError: "The canvas height is 0".
    const canvas = targetCtx?.canvas
    const targetUsable =
      targetCtx != null &&
      canvas != null &&
      Number(canvas.width) > 0 &&
      Number(canvas.height) > 0

    if (!targetUsable) return null

    return targetCtx.createPattern(tile, "repeat")
  } catch {
    return null
  }
}
