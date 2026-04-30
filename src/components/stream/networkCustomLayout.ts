import type { ReactNode } from "react"
import type {
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge,
} from "./networkTypes"
import type { ThemeSemanticColors } from "./types"

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
   * Resolves a color for a given node id / group, honoring CategoryColorProvider
   * → colorScheme → theme cascade. Always prefer this over hardcoded literals.
   */
  resolveColor: (key: string) => string
  /** User-supplied config blob threaded through `layoutConfig`. */
  config: C
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
