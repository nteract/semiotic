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

let _offscreen: HTMLCanvasElement | OffscreenCanvas | null = null

function getOffscreenCanvas(size: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(size, size)
  }
  if (!_offscreen) {
    _offscreen = document.createElement("canvas")
  }
  _offscreen.width = size
  _offscreen.height = size
  return _offscreen
}

/**
 * Create a repeating diagonal-line hatch pattern for canvas fills.
 *
 * Must be called in a browser environment (needs canvas). Returns null
 * in server/test environments where canvas is unavailable.
 */
export function createHatchPattern(
  options: HatchPatternOptions = {},
  /** Optional target canvas to create the pattern on (for correct DPR scaling) */
  targetCtx?: CanvasRenderingContext2D
): CanvasPattern | null {
  const {
    background = "transparent",
    stroke = "#000",
    lineWidth = 1.5,
    spacing = 6,
    angle = 45,
  } = options

  // Pattern tile size — needs to be large enough to tile seamlessly
  const size = Math.max(8, Math.ceil(spacing * 2))

  let tileCanvas: HTMLCanvasElement | OffscreenCanvas
  try {
    tileCanvas = getOffscreenCanvas(size)
  } catch {
    return null // SSR or test environment
  }

  const ctx = tileCanvas.getContext("2d")
  if (!ctx) return null

  // Background
  if (background && background !== "transparent") {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, size, size)
  } else {
    ctx.clearRect(0, 0, size, size)
  }

  // Draw diagonal lines
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.lineCap = "square"

  const rad = (angle * Math.PI) / 180

  // For 45° we draw simple diagonal lines; for other angles we rotate
  if (angle === 45 || angle === -45) {
    const sign = angle > 0 ? 1 : -1
    // Draw three lines to ensure full tile coverage
    for (let offset = -size; offset <= size * 2; offset += spacing) {
      ctx.beginPath()
      ctx.moveTo(offset, 0)
      ctx.lineTo(offset + sign * size, size)
      ctx.stroke()
    }
  } else {
    // General angle: rotate the context
    ctx.save()
    ctx.translate(size / 2, size / 2)
    ctx.rotate(rad)
    const diagonal = size * 2
    for (let y = -diagonal; y <= diagonal; y += spacing) {
      ctx.beginPath()
      ctx.moveTo(-diagonal, y)
      ctx.lineTo(diagonal, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  // Create the pattern on the target context if provided, otherwise use the tile's own context
  const patternCtx = targetCtx || ctx
  const pattern = patternCtx.createPattern(tileCanvas as any, "repeat")
  return pattern
}
