/**
 * Shared canvas setup utilities used by all Stream Frames.
 *
 * Eliminates duplicated DPR / sizing / transform logic across
 * StreamXYFrame, StreamGeoFrame, StreamNetworkFrame, and StreamOrdinalFrame.
 */

export interface CanvasMargin {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Set a canvas element's physical (pixel) and CSS (logical) dimensions,
 * accounting for devicePixelRatio. Returns the 2D context ready for drawing
 * with the DPR transform and margin translation already applied.
 *
 * After this call the context's coordinate space is:
 *   (0, 0) = top-left of the chart area (inside margins)
 *   (-margin.left, -margin.top) = top-left of the full canvas
 */
export function prepareCanvas(
  canvas: HTMLCanvasElement,
  size: [number, number],
  margin: CanvasMargin,
  dpr: number
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  canvas.width = size[0] * dpr
  canvas.height = size[1] * dpr
  canvas.style.width = `${size[0]}px`
  canvas.style.height = `${size[1]}px`

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.translate(margin.left, margin.top)
  return ctx
}

/**
 * Get the current devicePixelRatio, defaulting to 1 in non-browser environments.
 */
export function getDevicePixelRatio(): number {
  return typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1
}
