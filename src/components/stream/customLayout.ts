import type { ReactNode } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { MarginType } from "../types/marginType"
import type { SceneNode, StreamScales, Style, ThemeSemanticColors } from "./types"

/**
 * customLayout — escape hatch for bespoke chart geometry.
 *
 * A customLayout function receives the same context the built-in scene
 * builders use (scales, theme, resolvers, dimensions) and returns scene
 * nodes. The frame still owns hit testing, transitions, decay, theme
 * cascade, and SSR — the layout owns geometry only.
 *
 * Surface is intentionally narrow. Resist adding fields until a real
 * recipe demands them.
 */
export type CustomLayout<C = Record<string, unknown>> = (
  ctx: LayoutContext<C>
) => LayoutResult

/**
 * Context handed to every customLayout invocation. Six fields:
 * data, scales, dimensions, theme, resolveColor, config.
 *
 * `resolveColor` is the contract that makes user layouts theme-aware —
 * always prefer it over hardcoded color literals. `--doctor` flags
 * layouts that emit nodes with literal hex/rgb fills.
 */
export interface LayoutContext<C = Record<string, unknown>> {
  /** Buffered, post-filter data the frame is currently drawing. */
  data: Datum[]
  /** Scales constructed by the frame from the resolved x/y domains. */
  scales: StreamScales
  /**
   * Plot-area geometry. All scene-node coordinates are plot-relative —
   * the canvas/SVG group already lives inside `margin.left`/`margin.top`,
   * so `width`/`height` describe the plot rect (same as `plot.width`/
   * `plot.height`). Read `margin` if you need the outer canvas size.
   */
  dimensions: {
    width: number
    height: number
    margin: MarginType
    plot: { x: number; y: number; width: number; height: number }
  }
  /** Theme-resolved semantic colors + categorical palette. */
  theme: {
    semantic: ThemeSemanticColors
    categorical: string[]
  }
  /**
   * Resolves a color for a given group/category, honoring
   * CategoryColorProvider → colorScheme → theme cascade. Always prefer
   * this over hardcoded literals.
   */
  resolveColor: (group: string, datum?: Datum) => string
  /** User-supplied config blob threaded through `layoutConfig`. */
  config: C
}

export interface LayoutResult {
  /** Scene nodes to render. Get hit testing, transitions, decay, SSR for free. */
  nodes?: SceneNode[]
  /** SVG overlays composited above the canvas (labels, annotations). */
  overlays?: ReactNode
}

/**
 * Note on extents: customLayout v1 does not return extents. Layouts that
 * need to drive axis domains (e.g. horizon banding a continuous series)
 * should pass `xExtent` / `yExtent` props on the chart — those flow into
 * scale construction *before* the layout runs, so the layout sees correct
 * scales. Layouts that don't use scales (waffle, calendar, treemap) can
 * ignore extents entirely.
 */

/** Convenience helper: build a Style object that defers fill/stroke to the theme. */
export function themedStyle(color: string, overrides?: Style): Style {
  return { fill: color, stroke: "none", ...overrides }
}
