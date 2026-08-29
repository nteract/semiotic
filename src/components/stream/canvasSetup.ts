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

/** Repaint canvas text after an asynchronously loaded web font becomes usable. */
export function subscribeToCanvasFontInvalidation(
  listener: () => void
): () => void {
  const fonts = typeof document === "undefined" ? undefined : document.fonts
  if (!fonts) return () => {}
  fonts.addEventListener("loadingdone", listener)
  return () => {
    fonts.removeEventListener("loadingdone", listener)
  }
}

/**
 * Keep a canvas's backing store and CSS box aligned with the frame size.
 * This is separate from context preparation so an idle interaction layer can
 * be sized on mount/resize without forcing it through a paint path.
 */
export function syncCanvasSize(
  canvas: HTMLCanvasElement,
  size: [number, number],
  dpr: number
): { effectiveDprX: number; effectiveDprY: number } {
  const newWidth = Math.round(size[0] * dpr)
  const newHeight = Math.round(size[1] * dpr)
  const effectiveDprX = size[0] === 0 ? dpr : newWidth / size[0]
  const effectiveDprY = size[1] === 0 ? dpr : newHeight / size[1]

  const cssW = `${size[0]}px`
  const cssH = `${size[1]}px`
  if (canvas.style.width !== cssW) canvas.style.width = cssW
  if (canvas.style.height !== cssH) canvas.style.height = cssH

  // Setting either dimension clears the backing store, even when assigning
  // the current value, so only write when the physical dimensions changed.
  if (canvas.width !== newWidth) canvas.width = newWidth
  if (canvas.height !== newHeight) canvas.height = newHeight

  return { effectiveDprX, effectiveDprY }
}

const MOBILE_CANVAS_DPR_CAP = 2
const DESKTOP_CANVAS_DPR_CAP = 3
const MAX_CANVAS_BACKING_PIXELS = 8_388_608
const MAX_CANVAS_BACKING_DIMENSION = 16_384

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

  const { effectiveDprX, effectiveDprY } = syncCanvasSize(canvas, size, dpr)

  ctx.setTransform(effectiveDprX, 0, 0, effectiveDprY, 0, 0)
  ctx.translate(margin.left, margin.top)
  return ctx
}

/**
 * Get the effective canvas devicePixelRatio, defaulting to 1 in non-browser
 * environments. By default, mobile/coarse-pointer screens are capped at 2x to
 * avoid allocating very large backing stores on high-density phones and
 * desktop is capped at 3x. `maxDevicePixelRatio` overrides that DPR ceiling.
 * When `size` is supplied, very large canvases receive an additional backing-
 * store cap so full repaints do not allocate or clear tens of megapixels and
 * DPR scaling does not push a physical side beyond the broadly supported 16K
 * range.
 */
export function getDevicePixelRatio(
  maxDevicePixelRatio?: number,
  size?: readonly [number, number]
): number {
  if (typeof window === "undefined") return 1
  const raw = window.devicePixelRatio || 1
  const defaultCap = isMobileCanvasEnvironment() ? MOBILE_CANVAS_DPR_CAP : DESKTOP_CANVAS_DPR_CAP
  let cap = typeof maxDevicePixelRatio === "number" && maxDevicePixelRatio > 0
    ? maxDevicePixelRatio
    : defaultCap

  if (size) {
    const [width, height] = size
    const areaCap = Math.sqrt(MAX_CANVAS_BACKING_PIXELS / (width * height))
    const dimensionCap = MAX_CANVAS_BACKING_DIMENSION / Math.max(width, height)
    cap = Math.min(cap, Math.max(1, areaCap), Math.max(1, dimensionCap))
  }

  return Math.max(1, Math.min(raw, cap))
}

/**
 * Subscribe to browser pixel-density changes (page zoom, display migration,
 * or OS display-scale changes). A normal ResizeObserver is insufficient:
 * browsers can update `devicePixelRatio` without changing an element's CSS
 * dimensions.
 *
 * The media query is re-created after every change because it watches the
 * *current* resolution. Once that query stops matching, the next query must
 * be armed for the browser's new DPR.
 */
export function subscribeToDevicePixelRatioChange(listener: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined
  }

  let mediaQuery: MediaQueryList | null = null
  let disposed = false

  const removeListener = () => {
    if (!mediaQuery) return
    if (typeof mediaQuery.removeEventListener === "function") {
      mediaQuery.removeEventListener("change", handleChange)
    } else if (typeof mediaQuery.removeListener === "function") {
      mediaQuery.removeListener(handleChange)
    }
  }

  const armListener = () => {
    const resolutionQuery = `(resolution: ${window.devicePixelRatio || 1}dppx)`
    mediaQuery = window.matchMedia(resolutionQuery)
    // Some test/legacy shims return one unrelated MediaQueryList for every
    // query. Treat unsupported resolution queries as unavailable rather than
    // reacting to an unrelated preference change.
    if (!mediaQuery.media.includes("resolution")) {
      mediaQuery = null
      return
    }
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleChange)
    }
  }

  function handleChange() {
    if (disposed) return
    removeListener()
    mediaQuery = null
    listener()
    // Re-arm after the current MediaQueryList dispatch completes. A few
    // polyfills iterate a live Set of listeners; remove+add during that same
    // iteration can otherwise invoke the callback indefinitely.
    queueMicrotask(() => {
      if (!disposed) armListener()
    })
  }

  armListener()
  return () => {
    disposed = true
    removeListener()
    mediaQuery = null
  }
}
