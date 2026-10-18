import type { NetworkLayoutResult } from "../stream/networkCustomLayout"
import type {
  NetworkViewTransform,
  NetworkViewportRect
} from "../stream/networkViewportTypes"
import {
  fitNetworkView,
  getNetworkContentBounds,
  validBounds
} from "../stream/networkViewGeometry"
import { renderChart } from "./renderToStaticSVG"
import { setSvgRootAttributes } from "../shared/svgRoot"

/** Options for a standalone SVG of an already positioned network scene. */
export interface ExportNetworkViewSVGOptions {
  /** Output width in pixels. Must be finite and positive. */
  width: number
  /** Output height in pixels. Must be finite and positive. */
  height: number
  /** Camera to export. Defaults to "fit"; "identity" preserves layout coordinates. */
  view?: NetworkViewTransform | "fit" | "identity"
  /** Screen-space fit padding. Defaults to 24; zero is supported. */
  padding?: number
  /** Override node/card bounds to include curved edges or SVG decorations. */
  bounds?: NetworkViewportRect
}

/**
 * Export a positioned network result as standalone SVG without rerunning layout.
 * Preserves backgrounds, scene marks, labels and SVG overlays in paint order.
 * HTML marks are measured for fitting but are not serialized: supply SVG card
 * equivalents in overlays. Retained styles are used without invoking restylers.
 * Fit has no interactive zoom limits; an empty scene uses the identity camera.
 * For titles, themes or annotations, use renderChart with a saved layout instead.
 */
export function exportNetworkViewSVG(
  result: NetworkLayoutResult,
  options: ExportNetworkViewSVGOptions
): string {
  const { width, height, view = "fit", padding, bounds } = options
  if (![width, height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error(
      "exportNetworkViewSVG requires finite positive width and height"
    )
  }
  let viewTransform: NetworkViewTransform | undefined
  if (view === "fit") {
    const contentBounds = bounds ?? getNetworkContentBounds(result)
    if (contentBounds && !validBounds(contentBounds)) {
      throw new Error(
        "exportNetworkViewSVG bounds must be finite with positive width and height"
      )
    }
    viewTransform = contentBounds
      ? (fitNetworkView(
          contentBounds,
          { x: 0, y: 0, width, height },
          padding
        ) ?? undefined)
      : undefined
  } else if (view !== "identity") {
    viewTransform = view
  }
  const svg = renderChart("NetworkCustomChart", {
    width,
    height,
    margin: 0,
    nodes: [],
    edges: [],
    layout: () => ({ ...result, restyle: undefined, restyleEdge: undefined }),
    frameProps: { viewTransform }
  })
  return setSvgRootAttributes(svg, { viewBox: `0 0 ${width} ${height}` })
}
