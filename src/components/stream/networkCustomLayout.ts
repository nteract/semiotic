import type { ReactNode } from "react"
import type {
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge,
} from "./networkTypes"
import type { ThemeSemanticColors } from "./types"
import type { Datum } from "../charts/shared/datumTypes"

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

export interface NetworkLayoutResult {
  /** Positioned scene primitives. Circles, rects, or arcs. */
  sceneNodes?: NetworkSceneNode[]
  /** Positioned edges. Lines, beziers, ribbons, or curved. */
  sceneEdges?: NetworkSceneEdge[]
  /** Optional labels placed at arbitrary plot-relative positions. */
  labels?: NetworkLabel[]
  /** SVG overlays composited above the canvas. */
  overlays?: ReactNode
}
