"use client"
import * as React from "react"
import type { NetworkHtmlMark } from "./networkCustomLayout"
import type { CustomLayoutSelection } from "./customLayoutSelection"
import { CustomLayoutSelectionProvider } from "./customLayoutSelection"

export interface NetworkHtmlMarksLayerProps {
  /** Marks emitted by the custom layout (`NetworkLayoutResult.htmlMarks`). */
  marks: NetworkHtmlMark[] | undefined
  /** The frame's margin — the layer is offset by it so marks align with the
   *  canvas and SVG `overlays`, which translate their content by the same. */
  margin: { top: number; left: number }
  /** Shared-selection projection, provided so mark content can subscribe via
   *  `useCustomLayoutSelection()` and restyle on selection change without a
   *  relayout (parity with the SVG `overlays` subtree). `null` when unwired. */
  selection?: CustomLayoutSelection | null
  /**
   * Pixels beyond each visible edge of the scrolling viewport for which marks are
   * still mounted (so a scroll reveals already-present DOM, not blank space).
   * Marks farther than this off-screen are not rendered at all. Defaults to 400.
   */
  overscan?: number
}

// The container owns the transform (margin today; margin + zoom/pan when that
// lands) so every mark inherits the canvas/overlay alignment from one place.
// It is sized 0×0 and out-of-flow: marks are absolutely positioned against its
// padding box, whose origin sits at the plot origin after the margin offset.
const containerBaseStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  // Pointer events fall through to the canvas so `sceneNodes` hit-testing stays
  // authoritative. Mark content can opt back in with `pointer-events: auto`.
  pointerEvents: "none",
}

const DEFAULT_OVERSCAN = 400

interface ScreenRect {
  left: number
  top: number
  right: number
  bottom: number
}

/** Nearest scrollable ancestor (overflow auto/scroll/overlay), or null. */
function findScrollParent(node: Element | null): HTMLElement | null {
  let el = node?.parentElement ?? null
  while (el) {
    const { overflow, overflowX, overflowY } = window.getComputedStyle(el)
    if (/(auto|scroll|overlay)/.test(`${overflow} ${overflowY} ${overflowX}`)) return el
    el = el.parentElement
  }
  return null
}

/**
 * Viewport-cull marks against the scrolling ancestor. Works in plain-DOM screen
 * coordinates (`getBoundingClientRect`), so it's independent of any SVG/canvas
 * coordinate system: the layer container's measured top-left is the marks' origin
 * (it already includes the margin transform and the current scroll offset), and a
 * mark at `(x, y)` sits at `containerRect.{left,top} + (x, y)`. Returns `null`
 * ("render everything") when there's no scrollable ancestor or geometry isn't
 * measurable yet (SSR / pre-layout / jsdom).
 */
function useVisibleMarks(
  marks: NetworkHtmlMark[] | undefined,
  containerRef: React.RefObject<HTMLDivElement | null>,
  overscan: number
): NetworkHtmlMark[] | undefined {
  const [viewport, setViewport] = React.useState<{
    scroll: ScreenRect
    originX: number
    originY: number
  } | null>(null)

  React.useLayoutEffect(() => {
    const container = containerRef.current
    const scrollEl = findScrollParent(container)
    if (!container || !scrollEl) {
      setViewport(null)
      return undefined
    }

    let frame = 0
    const measure = () => {
      frame = 0
      const s = scrollEl.getBoundingClientRect()
      const c = container.getBoundingClientRect()
      if (s.width === 0 || s.height === 0) {
        setViewport(null)
        return
      }
      setViewport({
        scroll: { left: s.left, top: s.top, right: s.right, bottom: s.bottom },
        originX: c.left,
        originY: c.top,
      })
    }
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure)
    }

    measure()
    scrollEl.addEventListener("scroll", schedule, { passive: true })
    const observer = new ResizeObserver(schedule)
    observer.observe(scrollEl)
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      scrollEl.removeEventListener("scroll", schedule)
      observer.disconnect()
    }
    // Re-measure when the mark set changes (a re-layout may resize the chart).
  }, [containerRef, marks, overscan])

  return React.useMemo(() => {
    if (!marks || !viewport) return marks
    const { scroll, originX, originY } = viewport
    const minX = scroll.left - overscan
    const maxX = scroll.right + overscan
    const minY = scroll.top - overscan
    const maxY = scroll.bottom + overscan
    return marks.filter((mark) => {
      const left = originX + mark.x
      const top = originY + mark.y
      return left + mark.width >= minX && left <= maxX && top + mark.height >= minY && top <= maxY
    })
  }, [marks, viewport, overscan])
}

/**
 * Renders a custom network layout's {@link NetworkHtmlMark}s into one
 * absolutely-positioned DOM layer above the canvas and SVG `overlays`.
 *
 * Each mark is its own positioned element, keyed by `id`, so the browser can
 * composite `opacity`/`transform`/`visibility` changes on the mark's content
 * without re-rasterizing it (the win over SVG `<foreignObject>`), and a
 * position-only layout re-run repositions without remounting. The wrapper sets
 * only placement + sizing + `pointer-events`; everything visual comes from
 * `content`.
 *
 * Marks are viewport-culled against the nearest scrollable ancestor (plus
 * `overscan`): a mark more than `overscan` px outside the visible window is not
 * in the DOM at all, so a large topology mounts only roughly a viewport's worth
 * regardless of total size, and the per-hover/paint cost stays bounded. When
 * there's no scrollable ancestor (the content fits) every mark renders.
 *
 * Returns `null` when there are no marks, so layouts that don't use the feature
 * render no extra DOM.
 */
export function NetworkHtmlMarksLayer({
  marks,
  margin,
  selection = null,
  overscan = DEFAULT_OVERSCAN,
}: NetworkHtmlMarksLayerProps): React.ReactElement | null {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const visible = useVisibleMarks(marks, containerRef, overscan)

  if (!marks || marks.length === 0) return null

  const layer = (
    <div
      className="semiotic-network-html-marks"
      ref={containerRef}
      style={{
        ...containerBaseStyle,
        transform: `translate(${margin.left}px, ${margin.top}px)`,
      }}
    >
      {(visible ?? marks).map((mark) => (
        <div
          key={mark.id}
          className="semiotic-network-html-mark"
          data-mark-id={mark.id}
          style={{
            position: "absolute",
            transform: `translate(${mark.x}px, ${mark.y}px)`,
            width: mark.width,
            height: mark.height,
            pointerEvents: "none",
          }}
        >
          {mark.content}
        </div>
      ))}
    </div>
  )

  // Mirror the `overlays` subtree: wrap in the selection provider so mark
  // content reading `useCustomLayoutSelection()` re-renders on selection change
  // without the frame re-running the layout. No-op wrapper when unwired.
  return selection != null ? (
    <CustomLayoutSelectionProvider value={selection}>{layer}</CustomLayoutSelectionProvider>
  ) : (
    layer
  )
}
