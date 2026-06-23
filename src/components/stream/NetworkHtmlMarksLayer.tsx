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
 * Returns `null` when there are no marks, so layouts that don't use the feature
 * render no extra DOM.
 */
export function NetworkHtmlMarksLayer({
  marks,
  margin,
  selection = null,
}: NetworkHtmlMarksLayerProps): React.ReactElement | null {
  if (!marks || marks.length === 0) return null

  const layer = (
    <div
      className="semiotic-network-html-marks"
      style={{
        ...containerBaseStyle,
        transform: `translate(${margin.left}px, ${margin.top}px)`,
      }}
    >
      {marks.map((mark) => (
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
