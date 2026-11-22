import type { SceneNode, SceneDatum, PointSceneNode, SymbolSceneNode, GlyphSceneNode, RectSceneNode, LineSceneNode, AreaSceneNode, HeatcellSceneNode, CandlestickSceneNode } from "./types"
import type { Datum } from "../charts/shared/datumTypes"
import type { RingBuffer } from "../realtime/RingBuffer"
import type { Quadtree } from "d3-quadtree"
import type { CurveFactory } from "d3-shape"
import { hitTestRect as sharedHitTestRect, getHitRadius, pointToSegmentDistance } from "./hitTestUtils"
import { symbolRadius } from "./symbolPath"
import { glyphHitGeometry } from "./glyphDef"
import { findHitPointInQuadtree } from "./quadtreeHitTest"
import { resolveCurveFactory } from "./renderers/canvasRenderHelpers"
import { sampleCurvePath } from "./sampleCurvePath"

/**
 * Memo for the dense curve-sampled polyline. Keyed by the
 * raw path reference and curve factory so shared point arrays and curve
 * changes cannot reuse another curve's geometry. A fresh `path` array
 * invalidates automatically. Sampling is O(N · samplesPerSegment);
 * the work happens once per path and curve rather than per hover frame.
 */
const curveSampleCache = new WeakMap<
  ReadonlyArray<readonly [number, number]>,
  Map<CurveFactory, [number, number][]>
>()

function getCurveSampledPath(
  rawPath: ReadonlyArray<readonly [number, number]>,
  curve: LineSceneNode["curve"] | AreaSceneNode["curve"] | undefined,
): [number, number][] {
  const factory = resolveCurveFactory(curve)
  if (!factory) return rawPath as [number, number][]
  let samplesByCurve = curveSampleCache.get(rawPath)
  const cached = samplesByCurve?.get(factory)
  if (cached) return cached
  const sampled = sampleCurvePath(rawPath, factory)
  if (!samplesByCurve) {
    samplesByCurve = new Map()
    curveSampleCache.set(rawPath, samplesByCurve)
  }
  samplesByCurve.set(factory, sampled)
  return sampled
}

export interface HitResult {
  node: SceneNode
  datum: SceneDatum
  x: number
  y: number
  distance: number
}

export interface XHitResult {
  node: SceneNode
  datum: SceneDatum
  x: number
  y: number
  y0?: number
  sampleValue?: number
  group?: string
  color?: string
}

function markHit(node: SceneNode, x: number, y: number, distance: number, datum = node.datum): HitResult {
  return { node, datum, x, y, distance }
}

/**
 * Find the nearest scene node to the given pixel coordinates.
 * Dispatches to type-specific hit testers for optimal performance.
 *
 * When a quadtree spatial index is provided (for scatter/bubble charts with
 * many points), point hit testing routes through `findHitPointInQuadtree`,
 * which visits every candidate within the widened search radius (using
 * `maxPointRadius` so variable-size points like BubbleChart can't hide
 * behind a nearer non-hit). The visit is authoritative — when it returns
 * null, no point hit exists and the linear point loop is skipped.
 *
 * Non-point node types (line, rect, area, heatcell, candlestick) still
 * use the linear scan.
 */
export function findNearestNode(
  scene: SceneNode[],
  px: number,
  py: number,
  maxDistance: number = 30,
  pointQuadtree?: Quadtree<PointSceneNode> | null,
  maxPointRadius = 0
): HitResult | null {
  let best: HitResult | null = null

  // Fast path: use quadtree for point nodes when available. `findHitPointInQuadtree`
  // visits every candidate within the widened search radius, so variable-size
  // points (bubble charts) can't hide behind a nearer non-hit the way they
  // would with quadtree.find(). The visit is authoritative — if it returns
  // null, no point hit exists and the linear point scan below is skipped.
  if (pointQuadtree) {
    const hit = findHitPointInQuadtree(pointQuadtree, px, py, maxDistance, maxPointRadius)
    if (hit && hit.node.interactive !== false) {
      best = markHit(hit.node, hit.node.x, hit.node.y, hit.distance)
    }
  }

  for (const node of scene) {
    let result: HitResult | null = null

    switch (node.type) {
      case "point":
        if (node.interactive === false) break
        // Quadtree visit was authoritative — skip redundant linear scan.
        if (pointQuadtree) break
        result = hitTestRoundMark(node, px, py, node.r, maxDistance)
        break
      case "symbol":
        result = hitTestRoundMark(node, px, py, symbolRadius(node.size), maxDistance)
        break
      case "glyph":
        result = hitTestGlyph(node, px, py, maxDistance)
        break
      case "line":
        result = hitTestLine(node, px, py, maxDistance)
        break
      case "rect":
        // Skip non-interactive rects (e.g. swimlane track backgrounds —
        // emitted with `datum: null` so they paint behind the data items
        // without stealing hover/click from them).
        if (node.datum == null) break
        result = hitTestRect(node, px, py)
        break
      case "heatcell":
        result = hitTestRect(node, px, py)
        break
      case "area":
        // Skip non-interactive areas (e.g. decorative bounds bands)
        if (node.interactive === false) break
        // Areas are hit-tested by finding nearest x on the top path
        result = hitTestAreaPath(node, px, py, maxDistance)
        break
      case "candlestick":
        result = hitTestCandlestick(node, px, py)
        break
    }

    // Each type-specific tester has already applied its effective visual hit
    // geometry. Do not re-cap large bubbles/glyphs at maxDistance here; the
    // quadtree path honors the same visual radius.
    if (result) {
      if (!best || result.distance < best.distance || (
        result.distance === 0 && best.distance === 0 &&
        node.type === "area" && node._hitArea && best.node.type === "area" && best.node._hitArea
      )) {
        best = result
      }
    }
  }

  return best
}

/**
 * Interpolate Y at a given X pixel by finding the bracketing segment.
 * Returns null if px is outside the path range or beyond maxXDistance.
 */
function interpolatePathAtX(path: [number, number][], px: number, maxXDistance: number): number | null {
  if (path.length === 0) return null
  const firstX = path[0][0]
  const lastX = path[path.length - 1][0]
  if (px < firstX || px > lastX) return null

  const idx = binarySearchPath(path, px)
  const [x, y] = path[idx]
  if (Math.abs(x - px) > maxXDistance) return null
  if (x === px) return y
  // The range check guarantees a bracketing neighbor when x differs.
  const [otherX, otherY] = path[x < px ? idx + 1 : idx - 1]
  return y + (px - x) / (otherX - x) * (otherY - y)
}

function isHoverSeries(node: SceneNode, includeBands: boolean): node is (LineSceneNode | AreaSceneNode) & { datum: Datum[] } {
  return !!node.datum && (node.type === "line" || (node.type === "area" && node.interactive !== false &&
    (includeBands || !node._isBand))) && seriesPath(node).length > 0
}

/** Standalone ribbons supply samples. Overlaid ribbons enrich their parent series. */
function onlyBands(scene: SceneNode[]) {
  return !scene.some(node => isHoverSeries(node, false))
}

function seriesPath(node: LineSceneNode | AreaSceneNode) {
  return node.type === "line" ? node.path : node.topPath
}

/** Clamp interpolation to the range of the rendered curves, including in x-extent padding. */
export function clampToSeriesXRange(scene: SceneNode[], px: number): number {
  let min = Infinity
  let max = -Infinity
  const includeBands = onlyBands(scene)
  for (const node of scene) {
    if (!isHoverSeries(node, includeBands)) continue
    const path = seriesPath(node)
    if (path.length < 2) continue
    const lookup = getCurveSampledPath(path, node.curve)
    if (!lookup.length) continue
    min = Math.min(min, lookup[0][0])
    max = Math.max(max, lookup[lookup.length - 1][0])
  }
  return min > max ? px : Math.min(max, Math.max(min, px))
}

/** Look up curve values at px, or collect observed rows at one nearest sample across all paths. */
export function findAllNodesAtX(
  scene: SceneNode[],
  px: number,
  maxXDistance = 30,
  sampling: "interpolate" | "sample" = "interpolate"
): XHitResult[] {
  const results: XHitResult[] = []
  let nearestX = Infinity
  let nearestDistance = Infinity
  const includeBands = onlyBands(scene)
  for (const node of scene) {
    if (!isHoverSeries(node, includeBands)) continue
    const area = node.type === "area" ? node : undefined
    const path = seriesPath(node)
    const idx = binarySearchPath(path, px)
    const [x, sampleY] = path[idx]
    const datum = node.datum[idx]
    let y: number | null = sampleY
    let y0: number | undefined
    let sampleValue: number | undefined
    if (sampling === "sample") {
      if (!datum) continue
      const distance = Math.abs(x - px)
      // Break ties toward the left independently of series order.
      if (distance > nearestDistance || (distance === nearestDistance && x > nearestX)) continue
      if (x !== nearestX) results.length = 0
      nearestX = x
      nearestDistance = distance
      sampleValue = node.rawValues?.[idx]
      y0 = area?.bottomPath[idx]?.[1]
    } else {
      if (path.length < 2) continue
      const interpolate = (edge: [number, number][]) =>
        interpolatePathAtX(getCurveSampledPath(edge, node.curve), px, maxXDistance)
      y = interpolate(path)
      if (y === null) continue
      if (area) y0 = interpolate(area.bottomPath) ?? undefined
    }
    const color = node.style.stroke ?? area?.style.fill
    results.push({
      node, datum: datum ?? node.datum, x, y, y0, sampleValue,
      group: node.group,
      color: typeof color === "string" ? color : undefined,
    })
  }
  return results
}

function hitTestRoundMark(
  node: PointSceneNode | SymbolSceneNode | GlyphSceneNode,
  px: number, py: number, radius: number, maxDistance: number,
  x = node.x, y = node.y
): HitResult | null {
  const distance = Math.hypot(px - x, py - y)
  return distance > getHitRadius(radius, maxDistance) ? null : markHit(node, x, y, distance)
}

/** A composite glyph hit-tests as a circle over its drawn bounds — centered on
 *  the visual box (which the anchor may offset from the node's x/y), so a
 *  feet-anchored pictogram is grabbable across its whole body. */
function hitTestGlyph(node: GlyphSceneNode, px: number, py: number, maxDistance: number = 30): HitResult | null {
  if (node.datum == null) return null
  const geometry = glyphHitGeometry(node.glyph, node.size)
  return hitTestRoundMark(node, px, py, geometry.radius, maxDistance,
    node.x + geometry.centerDx, node.y + geometry.centerDy)
}

/** Both line strokes and area edges use the adjacent segments for distance,
 * while retaining the source vertex for the public hover datum. */
function hitTestSeriesPath(
  node: LineSceneNode | AreaSceneNode,
  path: [number, number][], hitPath: [number, number][],
  px: number, py: number, tolerance: number
): HitResult | null {
  const hitIdx = binarySearchPath(hitPath, px)
  if (hitIdx < 0) return null
  let distance = Infinity
  if (hitPath.length === 1) {
    distance = Math.hypot(px - hitPath[0][0], py - hitPath[0][1])
  } else {
    const start = Math.max(0, hitIdx - 1)
    const end = Math.min(hitIdx, hitPath.length - 2)
    for (let i = start; i <= end; i++) {
      const [ax, ay] = hitPath[i]
      const [bx, by] = hitPath[i + 1]
      distance = Math.min(distance, pointToSegmentDistance(px, py, ax, ay, bx, by))
    }
  }
  if (distance > tolerance) return null
  const idx = path === hitPath ? hitIdx : binarySearchPath(path, px)
  const [x, y] = path[idx]
  return markHit(node, x, y, distance, node.datum?.[idx] ?? node.datum)
}

function hitTestLine(node: LineSceneNode, px: number, py: number, maxDistance: number): HitResult | null {
  const style = node.style as { strokeWidth?: number; lineWidth?: number }
  const strokeWidth = style.strokeWidth ?? style.lineWidth ?? 1
  return hitTestSeriesPath(node, node.path, node.path, px, py, Math.max(5, strokeWidth / 2 + 2, maxDistance))
}

function hitTestRect(
  node: RectSceneNode | HeatcellSceneNode,
  px: number,
  py: number
): HitResult | null {
  const r = sharedHitTestRect(px, py, node)
  if (r.hit) {
    return markHit(node, r.cx, r.cy, 0)
  }
  return null
}

function hitTestCandlestick(node: CandlestickSceneNode, px: number, py: number): HitResult | null {
  const halfBody = node.bodyWidth / 2
  // Hit the body area (wider target)
  const bodyTop = Math.min(node.openY, node.closeY)
  const bodyBottom = Math.max(node.openY, node.closeY)
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1)

  if (px >= node.x - halfBody - 3 && px <= node.x + halfBody + 3 &&
      py >= node.highY - 3 && py <= node.lowY + 3) {
    // Hover target: center of the body
    const cy = bodyTop + bodyHeight / 2
    const dx = px - node.x
    const dy = py - cy
    return markHit(node, node.x, cy, Math.hypot(dx, dy))
  }
  return null
}

function hitTestAreaPath(
  node: AreaSceneNode,
  px: number,
  py: number,
  maxDistance: number
): HitResult | null {
  if (node.topPath.length === 0) return null
  if (
    node.clipRect &&
    (px < node.clipRect.x ||
      px > node.clipRect.x + node.clipRect.width ||
      py < node.clipRect.y ||
      py > node.clipRect.y + node.clipRect.height)
  ) return null

  if (node._hitArea) {
    const top = interpolatePathAtX(getCurveSampledPath(node.topPath, node.curve), px, Infinity)
    const bottom = interpolatePathAtX(getCurveSampledPath(node.bottomPath, node.curve), px, Infinity)
    if (top !== null && bottom !== null && py >= Math.min(top, bottom) && py <= Math.max(top, bottom)) {
      // Normal offsets give the two boundaries different x coordinates. Use
      // their paired centers to retain the nearest sample's datum identity.
      const idx = binarySearchPath(node.topPath, px, node.bottomPath)
      const datum = node.datum?.[idx] ?? node.datum
      return markHit(node, px, py, 0, datum)
    }
  }

  // Follow the rendered top edge, including curve interpolation, while
  // retaining the nearest raw sample for datum/tooltip identity.
  const hitPath = getCurveSampledPath(node.topPath, node.curve)
  return hitTestSeriesPath(node, node.topPath, hitPath, px, py, maxDistance)
}

/**
 * Binary search for the nearest point by x-coordinate in a sorted path.
 */
function binarySearchPath(path: [number, number][], targetX: number, paired?: [number, number][]): number {
  return nearestSortedIndex(path.length, targetX, i =>
    paired ? (path[i][0] + paired[i][0]) / 2 : path[i][0])
}

function nearestSortedIndex(length: number, targetX: number, x: (i: number) => number): number {
  if (!length) return -1
  let lo = 0
  let hi = length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (x(mid) < targetX) lo = mid + 1
    else hi = mid
  }

  // Check if lo-1 is closer
  if (lo > 0) {
    const dLo = Math.abs(x(lo) - targetX)
    const dPrev = Math.abs(x(lo - 1) - targetX)
    if (dPrev <= dLo) return lo - 1
  }

  return lo
}

/**
 * Binary search for nearest point by time value in a RingBuffer.
 */
export function findNearestIndex(
  buf: RingBuffer<Datum>,
  targetTime: number,
  getTime: (d: Datum) => number
): number {
  return nearestSortedIndex(buf.size, targetTime, i => getTime(buf.get(i)!))
}
