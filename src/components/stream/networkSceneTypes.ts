/**
 * Network scene graph primitives: the positioned node, edge and label shapes
 * that layouts emit and every renderer (canvas, SVG, SSR) consumes.
 * Re-exported from `networkTypes`.
 */
import type { Style, SceneDatum, SceneAccessibilityMetadata } from "./types"
import type { NetworkSymbolName } from "./symbolPath"
import type { GlyphDef } from "./glyphDef"
import type { PathHitRegion } from "./hitTestUtils"
import type { BezierCache } from "./networkTypes"

// ── Scene graph nodes ─────────────────────────────────────────────────

/** Circle node — used by force, tree, cluster, circlepack */
export interface NetworkCircleNode {
  type: "circle"
  cx: number
  cy: number
  r: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  id?: string
  label?: string
  depth?: number
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  /**
   * Projected outline (set by `perspective` for ground circles and tokens).
   * When present, renderers paint this path; `cx`/`cy` hold its center.
   */
  pathD?: string
  /** Visible side walls of a perspective piece, painted before `pathD`. */
  faces?: NetworkPerspectiveFace[]
  /** @internal A perspective token: hit-test by radius around `cx`/`cy`, not by outline. */
  _perspectiveToken?: boolean
}

/** A side face of an extruded perspective mark, painted under its top. */
export interface NetworkPerspectiveFace {
  pathD: string
  /** Mix toward black (negative) or white (positive), -1..1. */
  shade: number
}

/** Rect node — used by sankey, treemap, partition */
export interface NetworkRectNode {
  type: "rect"
  x: number
  y: number
  w: number
  h: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  id?: string
  label?: string
  depth?: number
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  /** @internal Exact pointer region for display-list paths; the rect remains the focus/navigation bounds. */
  _hitPath?: PathHitRegion
  /**
   * Projected outline (set by `perspective`). When present, renderers paint
   * this path instead of the rectangle and `x`/`y`/`w`/`h` hold its bounds.
   */
  pathD?: string
  /** Extruded side faces painted before `pathD`. */
  faces?: NetworkPerspectiveFace[]
}

/** Arc node — used by chord */
/** Arc node — used by chord. Angles in canvas convention (0 = 3 o'clock). */
export interface NetworkArcNode {
  type: "arc"
  cx: number
  cy: number
  innerR: number
  outerR: number
  /** Start angle in radians, canvas convention (0 = 3 o'clock, positive = clockwise) */
  startAngle: number
  /** End angle in radians, canvas convention */
  endAngle: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  id?: string
  label?: string
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  /**
   * Projected outline in plot coordinates (set by `perspective`). When
   * present, renderers paint and hit-test this path instead of the annulus.
   */
  pathD?: string
  /** Visible side walls of a perspective piece, painted before `pathD`. */
  faces?: NetworkPerspectiveFace[]
}

/**
 * Symbol node — a glyph rendered from a `d3-shape` symbol path (or a custom
 * path). The per-datum shape channel: recipes that encode a categorical field
 * as marker shape (e.g. `packedClusterMatrix`) emit these. Hit-tests as a
 * circle of the symbol's effective radius; renders on canvas and in SVG/SSR.
 */
export interface NetworkSymbolNode {
  type: "symbol"
  cx: number
  cy: number
  /** d3-symbol area in px² — drives the glyph's drawn size. */
  size: number
  /** Named shape. Ignored when `path` is set. @default "circle" */
  symbolType?: NetworkSymbolName
  /** Pre-built SVG path string, origin-centered — overrides `symbolType`. */
  path?: string
  /** Rotation in radians about (cx, cy). */
  rotation?: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  id?: string
  label?: string
  depth?: number
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  /** Visible side walls of a perspective token, painted before the symbol. */
  faces?: NetworkPerspectiveFace[]
  /** @internal Projected token outline, including tokens with no side walls. */
  _perspectiveToken?: boolean
}

/**
 * Glyph node — the composite-pictogram channel for network scenes: a
 * multi-part `GlyphDef` stamped at (cx, cy) with per-node `color`/`accent`
 * paints and optional partial fill. The network sibling of the XY/ordinal/geo
 * `GlyphSceneNode`.
 */
export interface NetworkGlyphNode {
  type: "glyph"
  cx: number
  cy: number
  /** Rendered height in px — width follows the definition's viewBox aspect. */
  size: number
  /** The multi-part pictogram definition to stamp. */
  glyph: GlyphDef
  /** Primary paint for parts declaring `"color"`. Falls back to `style.fill`. */
  color?: string
  /** Accent paint for parts declaring `"accent"`. */
  accent?: string
  /** Partial fill 0–1. @default 1 */
  fraction?: number
  /** Where the partial fill begins, 0–1. @default 0 */
  fractionStart?: number
  /** Partial-fill axis. @default "horizontal" */
  fractionDirection?: "horizontal" | "vertical"
  /** Ghost paint drawn at full extent beneath a partial fill. */
  ghostColor?: string
  /** Rotation in radians about (cx, cy). */
  rotation?: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  id?: string
  label?: string
  depth?: number
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
}

/**
 * Semantic and interaction metadata shared by every network edge shape.
 * Custom layouts can expose a curated accessible-table row without changing
 * the render datum, and can opt decorative/table-only edges out of pointer
 * hit testing with `interactive: false`.
 */
interface NetworkEdgeMetadata extends SceneAccessibilityMetadata {
  /** @internal Semantic SVG export role assigned by the perspective stage. */
  _perspectivePart?: string
  id?: string
  label?: string
  interactive?: boolean
}

/** Line edge — used by force */
export interface NetworkLineEdge extends NetworkEdgeMetadata {
  type: "line"
  x1: number
  y1: number
  x2: number
  y2: number
  style: Style
  datum: SceneDatum
  _pulseIntensity?: number
  _pulseColor?: string
}

/** Bezier band edge — used by sankey */
export interface NetworkBezierEdge extends NetworkEdgeMetadata {
  type: "bezier"
  pathD: string
  bezierCache?: BezierCache
  style: Style
  datum: SceneDatum
  /** Internal gradient used by circular sankey stub bands. */
  _gradient?: { x0: number; x1: number; y0?: number; y1?: number; from: number; to: number }
  _pulseIntensity?: number
  _pulseColor?: string
  /** Lazily-built Path2D for hit testing; invalidated when pathD changes. */
  _cachedPath2D?: Path2D
  _cachedPath2DSource?: string
}

/** Ribbon edge — used by chord */
export interface NetworkRibbonEdge extends NetworkEdgeMetadata {
  type: "ribbon"
  pathD: string
  style: Style
  datum: SceneDatum
  _pulseIntensity?: number
  _pulseColor?: string
  _cachedPath2D?: Path2D
  _cachedPath2DSource?: string
}

/** Curved edge — used by tree, cluster */
export interface NetworkCurvedEdge extends NetworkEdgeMetadata {
  type: "curved"
  pathD: string
  style: Style
  datum: SceneDatum
  _pulseIntensity?: number
  _pulseColor?: string
  _cachedPath2D?: Path2D
  _cachedPath2DSource?: string
}

export type NetworkSceneNode =
  | NetworkCircleNode
  | NetworkRectNode
  | NetworkArcNode
  | NetworkSymbolNode
  | NetworkGlyphNode

export type NetworkSceneEdge =
  | NetworkLineEdge
  | NetworkBezierEdge
  | NetworkRibbonEdge
  | NetworkCurvedEdge

/** Label data for the SVG overlay */
export interface NetworkLabel {
  x: number
  y: number
  text: string
  anchor?: "start" | "middle" | "end"
  baseline?: string
  fontSize?: number
  fontWeight?: number | string
  fill?: string
  stroke?: string
  strokeWidth?: number
  paintOrder?: string
  /**
   * Layout point this label is offset from (usually its node's center). Under
   * `perspective`, anchored labels keep their screen offset from the projected
   * mark instead of being projected as a ground point.
   */
  anchorPoint?: [number, number]
  /** Rotation in radians around (`x`, `y`), e.g. ground-aligned perspective text. */
  rotate?: number
}
