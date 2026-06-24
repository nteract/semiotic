import type { ReactNode } from "react"
import type {
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge,
} from "./networkTypes"
import type { Style, ThemeSemanticColors } from "./types"
import type { Datum } from "../charts/shared/datumTypes"
import type { CustomLayoutSelection } from "./customLayoutSelection"

/**
 * The shared selection state, projected into the custom-layout context.
 *
 * When the chart participates in a `LinkedCharts` / selection store (via
 * `NetworkCustomChart`'s `selection` / `linkedHover` props), the frame
 * threads the resolved predicate here so a custom layout can dim or
 * highlight marks by the *shared* selection — the same predicate the
 * built-in HOCs apply to `nodeStyle`. Mirrors `SelectionHookResult`.
 *
 * `predicate` receives the **raw** datum (the user object you passed in
 * `nodes`, i.e. `node.data ?? node`), matching the `d.data || d`
 * convention the built-in network charts use. `isActive` is `false`
 * when no selection clause is present — when `false`, treat every mark
 * as selected (draw at full weight).
 *
 * This is orthogonal to `config` (your `layoutConfig` blob): use `config`
 * for host-owned highlight sets you compute yourself (e.g. a graph
 * reachability set), and `selection` for cross-chart coordination that
 * rides the shared store.
 */
export interface NetworkLayoutSelection {
  /** Whether a selection clause is currently active. */
  isActive: boolean
  /** Returns `true` when the raw datum matches the active selection. */
  predicate: (datum: Datum) => boolean
}

/**
 * customLayout escape hatch for `StreamNetworkFrame`.
 *
 * A network layout is a pure function: given raw nodes/edges plus the
 * frame's dimensions/theme, return positioned scene primitives — circles,
 * rects, lines, beziers — and optional labels/overlays. The frame still
 * owns hit testing, decay, accessibility, and SSR.
 *
 * Mirrors the XY `CustomLayout` pattern. Reach for it when the catalog
 * (force, sankey, chord, tree, treemap, circle-pack, orbit) doesn't fit
 * — e.g. `d3-flextree`, `dagre`, custom radial layouts.
 */
export type NetworkCustomLayout<C extends object = Record<string, unknown>> = (
  ctx: NetworkLayoutContext<C>
) => NetworkLayoutResult

export interface NetworkLayoutContext<C extends object = Record<string, unknown>> {
  /** Raw nodes from the data prop / push API. May or may not have positions. */
  nodes: RealtimeNode[]
  /** Raw edges. Source/target may be id strings or node references. */
  edges: RealtimeEdge[]
  /**
   * Plot-area geometry. All scene-node coordinates are plot-relative —
   * the canvas/SVG group already lives inside `margin.left`/`margin.top`.
   */
  dimensions: {
    width: number
    height: number
    plot: { x: number; y: number; width: number; height: number }
  }
  /** Theme-resolved semantic + categorical colors. */
  theme: {
    semantic: ThemeSemanticColors
    categorical: string[]
  }
  /**
   * Resolves a stable color for a given key (typically a node id or
   * category) by hashing into the frame-resolved categorical palette.
   * The palette comes from `colorScheme` (array or named d3 scheme like
   * `"tableau10"` / `"set3"`), then the active theme's `categorical`,
   * then a fallback. The same key always returns the same color for the
   * lifetime of this store.
   *
   * Note: this does *not* honor `CategoryColorProvider` — network charts
   * don't currently thread that into the pipeline. If you need
   * cross-chart category color sync, pass a matching `colorScheme` to
   * each chart instead.
   */
  resolveColor: (key: string) => string
  /** User-supplied config blob threaded through `layoutConfig`. */
  config: C
  /**
   * Shared-selection projection. Present when the chart is wired to a
   * `LinkedCharts` / selection store; `null` otherwise. Use
   * `selection.isActive` + `selection.predicate(node.data ?? node)` to
   * dim/highlight marks by the cross-chart selection. See
   * {@link NetworkLayoutSelection}.
   */
  selection?: NetworkLayoutSelection | null
}

/**
 * An HTML/React node positioned in plot space, rendered into a real DOM layer
 * above the canvas (and above the SVG `overlays`) — **not** an SVG
 * `<foreignObject>`.
 *
 * Reach for this over `overlays` when a mark is text-heavy or a rich component
 * (a labelled card, an Axon widget) **and** it dims/animates on interaction.
 * HTML-in-SVG (`<foreignObject>`) gets no compositor layer, so an `opacity`
 * change — the common hover-dim — re-rasterizes the text; on a large graph that
 * stalls the interaction. A real DOM element composites `opacity` / `transform`
 * / `visibility` without re-painting its contents.
 *
 * The framework owns placement: each mark is wrapped in an absolutely-positioned
 * element that tracks the same margin (and any future zoom/pan) transform the
 * canvas and `overlays` receive, so a mark at `(x, y)` lands exactly where a
 * `sceneNode` at `(x, y)` does. The consumer owns the content's appearance.
 *
 * Marks are non-interactive by default (`pointer-events: none`) — pointer events
 * fall through to the canvas, so existing `sceneNodes` hit-testing
 * (`onObservation` / `onClick`) is unaffected. Emit a transparent hit-rect
 * `sceneNode` per mark to keep the canvas authoritative for interaction.
 */
export interface NetworkHtmlMark {
  /** Stable identity for keying / reconciliation across layout runs. A
   *  position-only update repositions without remounting the content. */
  id: string
  /** Top-left x in plot coordinates — the same space as `sceneNodes`. */
  x: number
  /** Top-left y in plot coordinates — the same space as `sceneNodes`. */
  y: number
  /** Wrapper width in plot units. */
  width: number
  /** Wrapper height in plot units. */
  height: number
  /** Arbitrary HTML/React rendered inside the positioned wrapper. */
  content: ReactNode
}

export interface NetworkLayoutResult {
  /** Positioned scene primitives. Circles, rects, or arcs. */
  sceneNodes?: NetworkSceneNode[]
  /** Positioned edges. Lines, beziers, ribbons, or curved. */
  sceneEdges?: NetworkSceneEdge[]
  /** Optional labels placed at arbitrary plot-relative positions. */
  labels?: NetworkLabel[]
  /** SVG overlays composited above the canvas. */
  overlays?: ReactNode
  /**
   * HTML/React nodes positioned in plot space, rendered into one real DOM layer
   * above the canvas and SVG `overlays`. Use for rich-text / component marks that
   * dim or animate on hover — they composite `opacity`/`transform` changes
   * instead of re-rasterizing text the way an SVG `<foreignObject>` does. The
   * framework owns positioning + transform so marks stay pixel-aligned with
   * `sceneNodes`. Additive: a layout that omits it renders no extra DOM. See
   * {@link NetworkHtmlMark}.
   */
  htmlMarks?: NetworkHtmlMark[]
  /**
   * **Per-frame restyle of canvas marks, without re-positioning.** When present,
   * a selection/hover change re-applies styles to the existing scene nodes and
   * repaints — it does **not** re-run the layout or rebuild the quadtree. Return
   * a style patch merged onto the node's *base* style (the style it was emitted
   * with); return nothing to leave it unchanged.
   *
   * This is the canvas counterpart to {@link useCustomLayoutSelection} (which
   * restyles `overlays`): compute geometry once in the layout body, and express
   * selection-driven dimming/highlighting here so hover stays O(nodes) paint
   * instead of O(nodes+edges) relayout. Providing it opts the chart into the
   * cheap selection path; omit it and selection changes re-run the layout (the
   * pre-existing behavior).
   */
  restyle?: (node: NetworkSceneNode, selection: CustomLayoutSelection | null) => Partial<Style> | void
  /** Per-frame restyle of edges — same contract as {@link NetworkLayoutResult.restyle}. */
  restyleEdge?: (edge: NetworkSceneEdge, selection: CustomLayoutSelection | null) => Partial<Style> | void
}
