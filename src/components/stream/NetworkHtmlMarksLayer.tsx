"use client"
import * as React from "react"
import type { NetworkHtmlMark } from "./networkCustomLayout"
import type { CustomLayoutSelection } from "./customLayoutSelection"
import { CustomLayoutSelectionProvider } from "./customLayoutSelection"
import type { NetworkViewportProps } from "./networkViewportTypes"
import { useNetworkViewport } from "./useNetworkViewport"
import { normalizeNetworkView } from "./networkViewTransform"

export interface NetworkHtmlMarksLayerProps extends NetworkViewportProps {
  /** Marks emitted by the custom layout (`NetworkLayoutResult.htmlMarks`). */
  marks: NetworkHtmlMark[] | undefined
  /** The frame's margin — the layer is offset by it so marks align with the
   *  canvas and SVG `overlays`, which translate their content by the same. */
  margin: { top: number; left: number }
  /** Shared-selection projection, provided so mark content can subscribe via
   *  `useCustomLayoutSelection()` and restyle on selection change without a
   *  relayout (parity with the SVG `overlays` subtree). `null` when unwired. */
  selection?: CustomLayoutSelection | null
  /** Plot dimensions for clipping the reported viewport. */
  width?: number
  height?: number
}

// The outer container applies margins; its inner wrapper applies the optional
// camera so every mark shares the canvas/overlay alignment. Without a camera,
// the out-of-flow container is 0×0; camera mode sizes it to clip the viewport.
const containerBaseStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  // Pointer events fall through to the canvas so `sceneNodes` hit-testing stays
  // authoritative. Mark content can opt back in with `pointer-events: auto`.
  pointerEvents: "none"
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
 * Returns `null` when there are neither marks nor a viewport subscriber.
 */
export function NetworkHtmlMarksLayer({
  marks,
  margin,
  selection = null,
  width,
  height,
  viewTransform,
  viewport,
  htmlMarkCulling,
  onViewportChange
}: NetworkHtmlMarksLayerProps): React.ReactElement | null {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [focusedId, setFocusedId] = React.useState<string | null>(null)
  const visible = useNetworkViewport({
    containerRef,
    marks,
    width,
    height,
    focusedId,
    viewTransform,
    viewport,
    htmlMarkCulling,
    onViewportChange,
    margin
  })

  React.useLayoutEffect(() => {
    if (focusedId === null || marks?.some((mark) => mark.id === focusedId))
      return
    const layer = containerRef.current
    const doc = layer?.ownerDocument
    // Removing focused data is distinct from scrolling. Return focus to the
    // chart only if it was lost to the document, never steal it from a control.
    if (doc?.activeElement === doc?.body)
      layer
        ?.closest<HTMLElement>(".stream-network-frame")
        ?.focus({ preventScroll: true })
    setFocusedId(null)
  }, [marks, focusedId])

  if ((!marks || marks.length === 0) && !onViewportChange && focusedId === null)
    return null

  const view = normalizeNetworkView(viewTransform)
  const layer = (
    <div
      className="semiotic-network-html-marks"
      ref={containerRef}
      onFocusCapture={(event) => {
        const target = event.target.closest<HTMLElement>("[data-mark-id]")
        if (target && event.currentTarget.contains(target))
          setFocusedId(target.dataset.markId ?? null)
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setFocusedId(null)
      }}
      style={{
        ...containerBaseStyle,
        transform: `translate(${margin.left}px, ${margin.top}px)`,
        ...(viewTransform ? { width, height, overflow: "clip" } : {})
      }}
    >
      <div
        style={{
          transformOrigin: "0 0",
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`
        }}
      >
        {visible.map((mark) => (
          <div
            key={mark.id}
            className="semiotic-network-html-mark"
            data-mark-id={mark.id}
            style={{
              position: "absolute",
              transform: `translate(${mark.x}px, ${mark.y}px)`,
              width: mark.width,
              height: mark.height,
              pointerEvents: "none"
            }}
          >
            {mark.content}
          </div>
        ))}
      </div>
    </div>
  )

  // Keep the provider mounted even when selection is inactive so toggling a
  // linked selection never changes the parent tree and remounts card content.
  return (
    <CustomLayoutSelectionProvider value={selection}>
      {layer}
    </CustomLayoutSelectionProvider>
  )
}
