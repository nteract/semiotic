import type { PointSceneNode, RectSceneNode, SceneDatum } from "./types"
import type { GeoAreaSceneNode } from "./geoTypes"
import type { NetworkCircleNode, NetworkRectNode } from "./networkTypes"

/**
 * `hitTarget` — the invisible, interaction-bearing scene node for custom charts.
 *
 * Every hand-built custom layout converges on the same shape: draw the real,
 * art-directed marks in the React `overlays` layer (where you have full SVG
 * control), and emit a **transparent scene node per mark** so the frame's canvas
 * machinery still owns interaction. That transparent node is what earns a custom
 * chart everything Semiotic brings *for free*:
 *
 *   - **Accessibility** — it joins the keyboard-navigation order (arrow keys,
 *     Home/End), draws the shape-adaptive focus ring on focus, and surfaces in
 *     the sr-only data table and the structured navigation tree. The mark is
 *     invisible; the focus ring is not.
 *   - **Annotations** — point-like helpers set `id` as the node's `pointId`, so
 *     an annotation `{ pointId: id, … }` anchors to the mark a layout placed at
 *     runtime (the custom-layout analogue of data-coordinate anchoring).
 *   - **AI / observation** — hover, click, and focus emit `onObservation` /
 *     `onClick` carrying the node's `datum`, and feed the shared selection store
 *     for linked/coordinated views.
 *   - **Chart modes** — `id` is also the transition key, so the mark keeps its
 *     identity (and its enter/exit/move transition + decay) across re-layouts.
 *
 * These helpers remove the `rgba(0,0,0,0)` + `opacity: 0` boilerplate every
 * custom example re-derived and standardize the keyboard-nav + interaction
 * contract in one place. Point-like helpers also centralize duplicated
 * `pointId`/`_transitionKey` identity.
 *
 * The frame hit-tests by geometry, not paint, so an `opacity: 0` node is fully
 * interactive while drawing nothing. Give it a hit radius (`r`) sized for the
 * pointer/keyboard target, independent of however large the visible glyph is.
 */

const TRANSPARENT_STYLE = { fill: "rgba(0,0,0,0)", stroke: "rgba(0,0,0,0)", opacity: 0 } as const

/** Default hit/keyboard-focus radius (px) — larger than a typical glyph so the
 *  target is easy to hit by pointer and to land on by keyboard (Fitts's law). */
export const DEFAULT_HIT_RADIUS = 8

function idString(id: string | number | undefined): string | undefined {
  return id == null ? undefined : String(id)
}

export interface HitTargetPointProps {
  /** Plot-relative x of the mark's center. */
  x: number
  /** Plot-relative y of the mark's center. */
  y: number
  /** The raw user datum to surface on hover/click/focus and in the data table. */
  datum: SceneDatum
  /** Stable identity. Set as the node's `pointId` (annotation anchor + nav-tree
   *  leaf match) *and* its transition key, so the mark keeps identity across
   *  re-layouts. Strongly recommended for interactive/animated custom charts. */
  id?: string | number
  /** Hit + keyboard-focus radius in px. @default {@link DEFAULT_HIT_RADIUS} */
  r?: number
}

/**
 * A transparent, hit-testable **point** node for a custom XY or ordinal layout
 * whose visible marks live in `overlays`. Inherits keyboard navigation, the
 * focus ring, annotation anchoring (by `id` → `pointId`), tooltip/`onObservation`
 * emission, and transition identity. See the module overview for the full
 * contract.
 *
 * @example
 * ```ts
 * nodes: ctx.data.map((row) => {
 *   const { x, y } = polarToXY(angle(row.day), radius(row.value))
 *   return hitTargetPoint({ x, y, datum: row, id: `day-${row.day}` })
 * })
 * ```
 */
export function hitTargetPoint(props: HitTargetPointProps): PointSceneNode {
  const id = idString(props.id)
  return {
    type: "point",
    x: props.x,
    y: props.y,
    r: props.r ?? DEFAULT_HIT_RADIUS,
    style: { ...TRANSPARENT_STYLE },
    datum: props.datum,
    pointId: id,
    _transitionKey: id,
  }
}

/**
 * A transparent, hit-testable point node for a custom **geo** layout whose
 * visible marks (sprites, icons, forts) live in `overlays`. Project a lon/lat
 * with `ctx.scales.projectedPoint(lon, lat)` first, then pass the resulting
 * `x` / `y`. Functionally identical to {@link hitTargetPoint} — geo scenes use
 * the same `PointSceneNode` — but named for discoverability: it makes
 * overlay-drawn geographic marks keyboard-navigable, focus-ringed, and
 * annotation-anchorable, exactly as {@link networkHitTarget} does for networks.
 *
 * @example
 * ```ts
 * // inside a GeoCustomChart layout
 * nodes: pois.map((p) => {
 *   const [x, y] = ctx.scales.projectedPoint(p.lon, p.lat)!
 *   return geoHitTarget({ x, y, datum: p, id: p.id })
 * })
 * ```
 */
export function geoHitTarget(props: HitTargetPointProps): PointSceneNode {
  return hitTargetPoint(props)
}

export interface GeoAreaHitTargetProps {
  /** SVG path string in plot-relative screen coordinates. */
  pathData: string
  /** Screen-space centroid for tooltip and focus positioning. */
  centroid: [number, number]
  /** Screen-space bounds as [[x0, y0], [x1, y1]]. */
  bounds: [[number, number], [number, number]]
  /** The raw user datum to surface on hover/click/focus and in the data table. */
  datum: SceneDatum
  /** Optional series/category key for grouped selection + legend interaction. */
  group?: string
  /** Screen-space area in px^2. Defaults to the bounding-box area. */
  screenArea?: number
}

/**
 * A transparent, hit-testable **area** node for a custom geo layout whose
 * visible polygons live in `overlays`. Use this when the semantic mark is not
 * point-like: isometric tiles, schematic regions, hex/cell maps, contour bands,
 * or any hand-built path that should retain GeoFrame hover, keyboard focus,
 * tooltips, accessible rows, and shape-aware canvas hit testing.
 *
 * @example
 * ```ts
 * return geoAreaHitTarget({
 *   pathData: diamondPath(x, y, tileWidth, tileHeight),
 *   centroid: [x, y],
 *   bounds: [[x - tileWidth / 2, y - tileHeight / 2], [x + tileWidth / 2, y + tileHeight / 2]],
 *   screenArea: (tileWidth * tileHeight) / 2,
 *   datum: tile,
 *   group: tile.kind,
 * })
 * ```
 */
export function geoAreaHitTarget(props: GeoAreaHitTargetProps): GeoAreaSceneNode {
  const [[x0, y0], [x1, y1]] = props.bounds
  return {
    type: "geoarea",
    pathData: props.pathData,
    centroid: props.centroid,
    bounds: props.bounds,
    screenArea: props.screenArea ?? Math.abs((x1 - x0) * (y1 - y0)),
    style: { ...TRANSPARENT_STYLE },
    datum: props.datum,
    group: props.group,
    interactive: true,
  }
}

export interface HitTargetRectProps {
  /** Plot-relative x of the rect's top-left corner. */
  x: number
  /** Plot-relative y of the rect's top-left corner. */
  y: number
  /** Rect width in px. */
  width: number
  /** Rect height in px. */
  height: number
  /** The raw user datum to surface on hover/click/focus and in the data table. */
  datum: SceneDatum
  /** Stable identity — used as the transition key, and as `group` for shared
   *  selection. (Rect nodes anchor annotations by their center via the
   *  point-anchor harvest only on network; for XY/ordinal pair a rect hit area
   *  with {@link hitTargetPoint} if you need annotation anchoring.) */
  id?: string | number
  /** Optional series/category key for grouped selection + legend interaction. */
  group?: string
}

/**
 * A transparent, hit-testable **rect** node for a custom XY or ordinal layout —
 * the rectangular sibling of {@link hitTargetPoint}, for marks that read as a
 * box (a bar, an interval lane segment, a labelled card). Same free interaction:
 * keyboard nav, focus ring, tooltip/`onObservation`, transition identity.
 */
export function hitTargetRect(props: HitTargetRectProps): RectSceneNode {
  return {
    type: "rect",
    x: props.x,
    y: props.y,
    w: props.width,
    h: props.height,
    style: { ...TRANSPARENT_STYLE },
    datum: props.datum,
    group: props.group,
    _transitionKey: idString(props.id),
  }
}

export interface NetworkHitTargetCircleProps {
  /** Plot-relative x of the mark's center. */
  x: number
  /** Plot-relative y of the mark's center. */
  y: number
  /** The raw user datum (the object you passed in `nodes`, typically `node.data`). */
  datum: SceneDatum
  /** Stable identity — set as the node `id`, which is how a `pointId`-anchored
   *  annotation resolves to this mark and how shared selection keys it. */
  id?: string | number
  /** Hit + keyboard-focus radius in px. @default {@link DEFAULT_HIT_RADIUS} */
  r?: number
  /** Optional accessible label override for the node. */
  label?: string
}

export interface NetworkHitTargetRectProps {
  /** Plot-relative x of the rect's top-left corner. */
  x: number
  /** Plot-relative y of the rect's top-left corner. */
  y: number
  /** Rect width in px. */
  width: number
  /** Rect height in px. */
  height: number
  /** The raw user datum (the object you passed in `nodes`, typically `node.data`). */
  datum: SceneDatum
  /** Stable identity — set as the node `id` for annotation anchoring + selection. */
  id?: string | number
  /** Optional accessible label override for the node. */
  label?: string
}

/**
 * A transparent, hit-testable node for a custom **network** layout. Pass `width`
 * + `height` for a rect (a labelled box / card), or omit them for a circle of
 * radius `r`. Every network scene node is harvested as an annotation anchor, so
 * `id` resolves a `{ pointId: id }` annotation to this mark. Inherits the same
 * keyboard nav, focus ring, tooltip/`onObservation`, and shared-selection
 * threading the built-in network charts get.
 *
 * @example
 * ```ts
 * sceneNodes: positioned.map((node) =>
 *   networkHitTarget({
 *     x: node.x - node.width / 2,
 *     y: node.y - node.height / 2,
 *     width: node.width,
 *     height: node.height,
 *     datum: node,
 *     id: node.id,
 *   })
 * )
 * ```
 */
export function networkHitTarget(
  props: NetworkHitTargetRectProps,
): NetworkRectNode
export function networkHitTarget(
  props: NetworkHitTargetCircleProps,
): NetworkCircleNode
export function networkHitTarget(
  props: NetworkHitTargetRectProps | NetworkHitTargetCircleProps,
): NetworkRectNode | NetworkCircleNode {
  const id = idString(props.id)
  if ("width" in props && "height" in props) {
    return {
      type: "rect",
      x: props.x,
      y: props.y,
      w: props.width,
      h: props.height,
      style: { ...TRANSPARENT_STYLE },
      datum: props.datum,
      id,
      label: props.label,
    }
  }
  return {
    type: "circle",
    cx: props.x,
    cy: props.y,
    r: props.r ?? DEFAULT_HIT_RADIUS,
    style: { ...TRANSPARENT_STYLE },
    datum: props.datum,
    id,
    label: props.label,
  }
}
