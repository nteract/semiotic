import type { ReactNode } from "react"
import type { ScaleBand, ScaleLinear } from "d3-scale"
import type { Datum } from "../charts/shared/datumTypes"
import type { MarginType } from "../types/marginType"
import type { OrdinalSceneNode, OrdinalScales } from "./ordinalTypes"
import type { Style, ThemeSemanticColors } from "./types"
import type { CustomLayoutSelection } from "./customLayoutSelection"

/**
 * customLayout escape hatch for `StreamOrdinalFrame`.
 *
 * Mirrors the XY `CustomLayout` and network `NetworkCustomLayout` patterns.
 * Reach for it when the catalog (bar, swarm, pie, box, ...) doesn't fit:
 * marimekko, parallel coordinates, bullet charts, fan charts, slope graphs
 * and similar are all natural ordinal customLayouts.
 *
 * The frame still owns hit testing, transitions, decay, theme cascade,
 * and SSR — the layout owns geometry only. Emit standard scene nodes
 * (`rect`, `point`, `wedge`, `boxplot`, `violin`, `connector`, `trapezoid`)
 * and the frame handles the rest.
 */
export type OrdinalCustomLayout<C extends object = Record<string, unknown>> = (
  ctx: OrdinalLayoutContext<C>
) => OrdinalLayoutResult

export interface OrdinalLayoutContext<C extends object = Record<string, unknown>> {
  /** Buffered, post-filter data the frame is currently drawing. */
  data: Datum[]
  /**
   * Frame-built scales. `o` is the band scale over categories
   * (insertion-ordered by default; flip via `oSort`). `r` is the linear
   * value scale. Their domains/ranges respect `oExtent`/`rExtent` if you
   * passed them on the chart.
   */
  scales: {
    o: ScaleBand<string>
    r: ScaleLinear<number, number>
    projection: OrdinalScales["projection"]
  }
  /**
   * Plot-area geometry. The canvas/SVG group is already translated by
   * the frame, so scene-node coordinates are *plot-local* — but the
   * origin depends on `scales.projection`:
   *
   *   - `vertical` / `horizontal`: origin is the **top-left** of the
   *     plot rect. `plot = { x: 0, y: 0, width, height }`.
   *   - `radial`: origin is the **center** of the plot rect. The frame
   *     translates the context to `(margin.left + width/2, margin.top
   *     + height/2)` so radial layouts emit coordinates around 0,0.
   *     `plot = { x: -width/2, y: -height/2, width, height }` — the
   *     top-left of the visible plot rect lives at `(plot.x, plot.y)`
   *     in your coord space.
   *
   * In both cases `plot.width` and `plot.height` describe the plot rect.
   * Read `margin` if you need the outer canvas size.
   */
  dimensions: {
    width: number
    height: number
    margin: MarginType
    plot: { x: number; y: number; width: number; height: number }
  }
  /** Theme-resolved semantic + categorical colors. */
  theme: {
    semantic: ThemeSemanticColors
    categorical: string[]
  }
  /**
   * Resolves a stable color for a given key (typically a category
   * label) from the frame's categorical palette. Palette precedence:
   * explicit `colorScheme` (array or named d3 scheme like `"tableau10"`)
   * → theme categorical → fallback. The same key always returns the
   * same color for the lifetime of this store.
   */
  resolveColor: (key: string) => string
  /** User-supplied config blob threaded through `layoutConfig`. */
  config: C
  /**
   * Shared-selection projection (from `selection` / `linkedHover`). `null` when
   * unwired. For selection-driven styling without a relayout, use
   * {@link OrdinalLayoutResult.restyle} (canvas) / `useCustomLayoutSelection`
   * (overlays) rather than recomputing geometry here.
   */
  selection?: CustomLayoutSelection | null
}

export interface OrdinalLayoutResult {
  /** Scene nodes to render. Get hit testing, transitions, decay, SSR for free. */
  nodes?: OrdinalSceneNode[]
  /** SVG overlays composited above the canvas (labels, axis lines, annotations). */
  overlays?: ReactNode
  /**
   * **Per-frame restyle of canvas marks, without re-positioning.** When present,
   * a selection/hover change re-applies styles to the existing scene nodes +
   * repaints — no relayout, no quadtree rebuild. Return a style patch merged onto
   * the node's *base* style. Providing it opts into the cheap selection path.
   * Pairs with `useCustomLayoutSelection` for the `overlays`.
   */
  restyle?: (node: OrdinalSceneNode, selection: CustomLayoutSelection | null) => Partial<Style> | void
}
