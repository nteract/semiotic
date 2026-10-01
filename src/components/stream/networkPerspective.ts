/**
 * Network perspective: parallel (axonometric/oblique) projection of an
 * already-laid-out network scene.
 *
 * Layout stays 2D. After a layout or custom layout emits scene primitives,
 * the ground plane is mapped by one 2×3 affine matrix plus a vertical `lift`
 * for elevation. Point-like marks stay upright (billboards); areas, edges and
 * ground chrome are projected. See `projectNetworkScene`.
 */
import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkSceneNode } from "./networkTypes"
import type { NetworkViewportRect } from "./networkViewportTypes"
import type { GlyphDef } from "./glyphDef"

/** Named projections. `"flat"` is the identity (no projection work at all). */
export type NetworkPerspectiveName =
  | "flat"
  | "isometric"
  | "pixel"
  | "dimetric"
  | "military"
  | "cabinet"

/**
 * How a node mark is drawn under a perspective: `"token"` lays a point mark
 * on the ground as a thick disc (or symbol) at its pixel size, `"ground"`
 * projects an area mark as a slab, `"extrude"` raises a leaf rect into a
 * prism, and `"billboard"` stands a flat mark upright.
 */
export type NetworkPerspectiveMarkMode = "token" | "billboard" | "ground" | "extrude"

/**
 * Extent a custom layout's `backgrounds`/`overlays` draw, so an active
 * perspective fits it inside the plot with the scene marks. Plot px.
 * - A box (`width`, `height`) lies on the ground plane `z` above the ground
 *   (default 0; `"top"` is the piece height).
 * - A point with `extent: [left, right, top, bottom]` is upright content,
 *   that many screen px around its projected anchor (default z `"top"`).
 */
export type NetworkPerspectiveBound =
  | { x: number; y: number; width: number; height: number; z?: number | "top" }
  | { x: number; y: number; extent: readonly [number, number, number, number]; z?: number | "top" }

/** A number (constant layout px), a datum field name, or a datum callback. */
export type NetworkPerspectiveAccessor =
  | number
  | string
  | ((datum: Datum) => number | null | undefined)

export interface NetworkPerspectiveGridConfig {
  /** Grid spacing in layout px (before fit). @default 24 */
  step?: number
  stroke?: string
  strokeWidth?: number
  /** @default 0.55 */
  opacity?: number
  /** `"plot"` covers the whole plot; `"content"` covers the scene footprint. @default "plot" */
  extent?: "plot" | "content"
}

export interface NetworkPerspectivePlateConfig {
  fill?: string
  stroke?: string
  /** Ground padding around the content footprint, layout px. @default 24 */
  padding?: number
  /** Slab thickness drawn as side walls below the ground, layout px. @default `thickness` */
  depth?: number
}

/**
 * A ground "plate" drawn under a group of nodes (a subnet, a team, a zone).
 * Regions are chrome: they are not hit-tested and have no tooltip.
 */
export interface NetworkPerspectiveRegion {
  id: string
  label?: string
  /** Member node ids. The plate covers their footprint plus `padding`. */
  nodes?: string[]
  /** Explicit layout-space bounds `[[x0, y0], [x1, y1]]` (used when `nodes` is absent). */
  bounds?: [[number, number], [number, number]]
  /** Ground padding around member nodes, layout px. @default 16 */
  padding?: number
  fill?: string
  stroke?: string
  /** Lift of the plate's base above the ground, layout px. @default 0 */
  elevation?: number
  /** Slab thickness drawn as side walls, layout px. Members stand on the top surface. @default `thickness` */
  depth?: number
  labelColor?: string
}

export interface NetworkPerspectiveEdgeConfig {
  /** Re-route straight (`line`) edges on the ground before projecting. @default "layout" */
  route?: "layout" | "orthogonal" | "orthogonal-rounded"
  /**
   * Edge endpoint height: `"surface"` attaches each end to the plate or ground
   * its node stands on, `"nodes"` also follows each node's own `elevation`,
   * `"ground"` keeps edges at z = 0, and a number lifts every edge.
   * @default "surface"
   */
  elevation?: "surface" | "ground" | "nodes" | number
}

export interface NetworkPerspectiveLabelConfig {
  /** `"upright"` keeps screen-aligned text; `"ground"` lays text along a ground axis. @default "upright" */
  mode?: "upright" | "ground"
  /** Ground axis followed by ground-mode text. @default "x" */
  axis?: "x" | "y"
}

export interface NetworkPerspectiveGuideConfig {
  stroke?: string
  strokeDasharray?: string
  /** Draw a soft ground shadow under lifted marks. @default true */
  shadow?: boolean
}

export interface NetworkPerspectiveTransitionConfig {
  /** Milliseconds. Reduced-motion users get an instant change. @default 600 */
  duration?: number
}

export interface NetworkPerspectiveConfig {
  /** Preset to start from. @default "isometric" */
  type?: NetworkPerspectiveName
  /** Plan rotation of the ground plane, degrees. Cabinet: receding-axis angle. @default preset */
  rotation?: number
  /** Camera elevation above the ground, degrees; 90 is a plan view. @default preset */
  tilt?: number
  /** Screen px of lift per layout px of elevation (before fit). @default preset */
  verticalScale?: number
  /** Pivot as plot fractions when `fit` is `"none"`. @default [0.5, 0.5] */
  origin?: [number, number]
  /** `"contain"` scales the projected scene down (never up) and centers it. @default "contain" */
  fit?: "contain" | "none"
  /** Padding kept inside the plot by `fit: "contain"`, px. @default 12 */
  fitPadding?: number

  /** Lift per node: constant layout px, or a datum field/callback scaled by `elevationScale`. @default 0 */
  elevation?: NetworkPerspectiveAccessor
  /** Layout px per data unit for accessor elevation. `"auto"` maps the largest value to 48px. @default "auto" */
  elevationScale?: number | "auto"
  /** Drop line + ground shadow under lifted marks. @default true when any node is lifted */
  elevationGuides?: boolean | NetworkPerspectiveGuideConfig

  /** Paint standing marks back-to-front. @default true */
  depthSort?: boolean
  /**
   * Thickness of every piece in layout px: tokens, ground slabs, arcs,
   * plates and regions get visible side walls, nested hierarchy levels stack
   * on their parents, and edges ride this high above their surface so they
   * cast a shadow. `0` draws flat pieces. @default 6
   */
  thickness?: number
  /** Shadow under every edge, `thickness` below it. @default true when `thickness` > 0 */
  edgeShadow?: boolean | { color?: string; opacity?: number }
  /**
   * Mark mode. Circles and symbols default to `"token"` (glyphs stay
   * `"billboard"`); area marks (rect/arc, and circles in circle packs)
   * default to `"ground"`.
   */
  marks?:
    | NetworkPerspectiveMarkMode
    | ((node: NetworkSceneNode) => NetworkPerspectiveMarkMode | undefined)
  /** Billboard anchor for circles and symbols. Glyphs use their definition's anchor. @default "center" */
  anchor?: "center" | "feet"
  /**
   * Draw billboard circles and symbols as a pictogram instead — a `GlyphDef`
   * (for example from `isometricGlyphs` in `semiotic/network/perspective`) or
   * a callback that receives the raw node datum (the object you passed in).
   * The glyph takes the node's fill as its color.
   */
  glyph?: GlyphDef | ((datum: Datum) => GlyphDef | null | undefined)
  /** Rendered glyph height in px. @default 2.8 × the node radius (min 16) */
  glyphSize?: number
  /** Extrusion height for `marks: "extrude"`: constant layout px, or a datum field/callback. @default 24 */
  extrude?: NetworkPerspectiveAccessor
  /** Layout px per data unit for accessor extrusion. `"auto"` maps the largest value to 48px. @default "auto" */
  extrudeScale?: number | "auto"

  edges?: NetworkPerspectiveEdgeConfig
  labels?: NetworkPerspectiveLabelConfig
  ground?: {
    grid?: boolean | NetworkPerspectiveGridConfig
    plate?: boolean | NetworkPerspectivePlateConfig
  }
  regions?: NetworkPerspectiveRegion[]
  /** Animate between perspectives (including to and from `"flat"`). */
  transition?: boolean | NetworkPerspectiveTransitionConfig
}

/** Prop value: a preset name, or a config object. */
export type NetworkPerspective = NetworkPerspectiveName | NetworkPerspectiveConfig

/** Normalized perspective settings (non-flat). */
export interface ResolvedNetworkPerspective {
  type: Exclude<NetworkPerspectiveName, "flat">
  /** Linear ground map before fit: sx = a·x + c·y, sy = b·x + d·y. */
  linear: readonly [number, number, number, number]
  verticalScale: number
  origin: readonly [number, number]
  fit: "contain" | "none"
  fitPadding: number
  config: NetworkPerspectiveConfig
}

/**
 * A fitted projection for one scene. Coordinates are plot px, the same space
 * as scene nodes. `z` is elevation in layout px.
 */
export interface NetworkPerspectiveFrame {
  readonly type: NetworkPerspectiveName
  /** SVG-style affine `[a, b, c, d, e, f]`: sx = a·x + c·y + e, sy = b·x + d·y + f. */
  readonly matrix: readonly [number, number, number, number, number, number]
  /**
   * Piece thickness of the scene drawn with this frame, layout px: tops of
   * tokens and slabs, and the height edges ride at. Absent on bare frames.
   */
  readonly thickness?: number
  /** Screen px moved up per layout px of elevation. */
  readonly lift: number
  /** Uniform fit scale folded into `matrix` and `lift`. */
  readonly scale: number
  /** Projected content bounds in plot px, or null for an empty scene. */
  readonly bounds: NetworkViewportRect | null
  project(x: number, y: number, z?: number): [number, number]
  /** Inverse on the plane at elevation `z` (default ground). */
  unproject(sx: number, sy: number, z?: number): [number, number]
  /** Paint-order key: larger is nearer the viewer. */
  depth(x: number, y: number, z?: number): number
  /** SVG `transform` value that maps ground-plane content. */
  readonly groundTransform: string
  /** SVG `transform` value that places upright content at a ground point. */
  billboardTransform(x: number, y: number, z?: number): string
}

const DEG = Math.PI / 180
const TRUE_ISOMETRIC_TILT = Math.asin(Math.tan(30 * DEG)) / DEG // 35.264°

const PRESETS: Record<
  Exclude<NetworkPerspectiveName, "flat">,
  { rotation: number; tilt: number; verticalScale?: number }
> = {
  // Depth-axis ratio sin(tilt): 0.577 (true 120° isometric), 0.5 (2:1 pixel).
  isometric: { rotation: 45, tilt: TRUE_ISOMETRIC_TILT },
  pixel: { rotation: 45, tilt: 30 },
  dimetric: { rotation: 45, tilt: 20 },
  // Plan-oblique: ground shapes preserved, verticals true length.
  military: { rotation: 45, tilt: 90, verticalScale: 1 },
  // Oblique: front axis true, depth receding at `rotation` degrees, half scale.
  cabinet: { rotation: 45, tilt: 90, verticalScale: 1 }
}

const finiteOr = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

const WARNED = new Set<string>()

/** Normalize a `perspective` prop. Returns null for flat/absent/invalid. */
export function resolveNetworkPerspective(
  perspective: NetworkPerspective | null | undefined
): ResolvedNetworkPerspective | null {
  if (!perspective) return null
  const config: NetworkPerspectiveConfig =
    typeof perspective === "string" ? { type: perspective } : perspective
  const type = config.type ?? "isometric"
  if (type === "flat") return null
  if (!Object.prototype.hasOwnProperty.call(PRESETS, type)) {
    if (process.env.NODE_ENV !== "production" && !WARNED.has(String(type))) {
      WARNED.add(String(type))
      console.warn(
        `[Semiotic] Unknown perspective "${String(type)}"; drawing flat. ` +
          `Use "isometric", "pixel", "dimetric", "military", "cabinet" or "flat".`
      )
    }
    return null
  }
  const preset = PRESETS[type as keyof typeof PRESETS]
  const rotation = finiteOr(config.rotation, preset.rotation) * DEG
  let linear: [number, number, number, number]
  let vertical: number
  if (type === "cabinet") {
    // Far rows recede up-right at half scale.
    linear = [1, 0, -0.5 * Math.cos(rotation), 0.5 * Math.sin(rotation)]
    vertical = finiteOr(config.verticalScale, 1)
  } else {
    const tilt = Math.min(90, Math.max(1, finiteOr(config.tilt, preset.tilt))) * DEG
    const ratio = Math.sin(tilt)
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    linear = [cos, ratio * sin, -sin, ratio * cos]
    vertical = finiteOr(
      config.verticalScale,
      config.tilt == null && preset.verticalScale != null
        ? preset.verticalScale
        : Math.cos(tilt)
    )
  }
  const origin = config.origin
  return {
    type: type as ResolvedNetworkPerspective["type"],
    linear,
    verticalScale: Math.max(0, vertical),
    origin: [finiteOr(origin?.[0], 0.5), finiteOr(origin?.[1], 0.5)],
    fit: config.fit === "none" ? "none" : "contain",
    fitPadding: Math.max(0, finiteOr(config.fitPadding, 12)),
    config
  }
}

const round = (v: number) => Math.round(v * 1000) / 1000

/** Build a frame from final affine parameters. */
export function buildNetworkPerspectiveFrame(
  type: NetworkPerspectiveName,
  matrix: readonly [number, number, number, number, number, number],
  lift: number,
  scale = 1,
  bounds: NetworkViewportRect | null = null
): NetworkPerspectiveFrame {
  const [a, b, c, d, e, f] = matrix
  const det = a * d - b * c
  const project = (x: number, y: number, z = 0): [number, number] => [
    a * x + c * y + e,
    b * x + d * y + f - lift * z
  ]
  return {
    type,
    matrix,
    lift,
    scale,
    bounds,
    project,
    unproject(sx, sy, z = 0) {
      const px = sx - e
      const py = sy + lift * z - f
      if (Math.abs(det) < 1e-12) return [px, py]
      return [(d * px - c * py) / det, (a * py - b * px) / det]
    },
    depth: (x, y, z = 0) => b * x + d * y + f + z * 1e-3,
    groundTransform: `matrix(${matrix.map(round).join(" ")})`,
    billboardTransform(x, y, z = 0) {
      const [px, py] = project(x, y, z)
      return `translate(${round(px)},${round(py)})`
    }
  }
}

/** Identity frame (flat). */
export const FLAT_NETWORK_PERSPECTIVE_FRAME = /* @__PURE__ */ buildNetworkPerspectiveFrame(
  "flat",
  [1, 0, 0, 1, 0, 0],
  0
)

/** Linear blend of two frames (straight-line morph between projections). */
export function blendNetworkPerspectiveFrames(
  from: NetworkPerspectiveFrame,
  to: NetworkPerspectiveFrame,
  t: number
): NetworkPerspectiveFrame {
  if (t >= 1) return to
  if (t <= 0) return from
  const m = from.matrix.map((v, i) => v + (to.matrix[i] - v) * t) as unknown as [
    number, number, number, number, number, number
  ]
  return buildNetworkPerspectiveFrame(
    to.type,
    m,
    from.lift + (to.lift - from.lift) * t,
    from.scale + (to.scale - from.scale) * t,
    to.bounds
  )
}

