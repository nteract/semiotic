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

const MOBILE_CANVAS_DPR_CAP = 2
const DESKTOP_CANVAS_DPR_CAP = 3

function isMobileCanvasEnvironment(): boolean {
  if (typeof window === "undefined") return false
  const coarsePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  const narrowViewport = Math.min(window.innerWidth || Infinity, window.innerHeight || Infinity) < 768
  return coarsePointer || narrowViewport
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

  const newWidth = Math.round(size[0] * dpr)
  const newHeight = Math.round(size[1] * dpr)
  const effectiveDprX = newWidth / size[0]
  const effectiveDprY = newHeight / size[1]

  // Only set canvas.width/height when dimensions actually change.
  // Setting these properties — even to the same value — implicitly clears
  // the canvas buffer and forces a GPU buffer reallocation on HiDPI displays.
  // Always keep CSS dimensions in sync with logical size
  const cssW = `${size[0]}px`
  const cssH = `${size[1]}px`
  if (canvas.style.width !== cssW) canvas.style.width = cssW
  if (canvas.style.height !== cssH) canvas.style.height = cssH

  if (canvas.width !== newWidth || canvas.height !== newHeight) {
    canvas.width = newWidth
    canvas.height = newHeight
  }

  ctx.setTransform(effectiveDprX, 0, 0, effectiveDprY, 0, 0)
  ctx.translate(margin.left, margin.top)
  return ctx
}

/**
 * Get the effective canvas devicePixelRatio, defaulting to 1 in non-browser
 * environments. Mobile/coarse-pointer screens are capped at 2x to avoid
 * allocating very large backing stores on high-density phones; desktop stays
 * crisper but still caps pathological DPR values at 3x.
 */
export function getDevicePixelRatio(): number {
  if (typeof window === "undefined") return 1
  const raw = window.devicePixelRatio || 1
  const cap = isMobileCanvasEnvironment() ? MOBILE_CANVAS_DPR_CAP : DESKTOP_CANVAS_DPR_CAP
  return Math.max(1, Math.min(raw, cap))
}
