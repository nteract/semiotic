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
 * environments. By default, mobile/coarse-pointer screens are capped at 2x to
 * avoid allocating very large backing stores on high-density phones and
 * desktop is capped at 3x. `maxDevicePixelRatio` overrides that ceiling.
 */
export function getDevicePixelRatio(maxDevicePixelRatio?: number): number {
  if (typeof window === "undefined") return 1
  const raw = window.devicePixelRatio || 1
  const defaultCap = isMobileCanvasEnvironment() ? MOBILE_CANVAS_DPR_CAP : DESKTOP_CANVAS_DPR_CAP
  const cap = typeof maxDevicePixelRatio === "number" && maxDevicePixelRatio > 0
    ? maxDevicePixelRatio
    : defaultCap
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
