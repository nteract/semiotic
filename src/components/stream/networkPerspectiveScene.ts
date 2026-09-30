/**
 * Project a laid-out network scene through a {@link NetworkPerspectiveFrame}.
 *
 * Pure: inputs are never mutated; projected marks are shallow clones that keep
 * datum, style and identity. Two phases so a transition can re-emit one
 * prepared scene through a blended frame. Every mark is a "piece" with
 * `thickness`: tokens, slabs and arcs get side walls, edges ride on top and
 * cast a shadow. Ground chrome, regions, orthogonal routing and extrusion live
 * in the lazily loaded perspective extras.
 */
import type {
  NetworkArcNode,
  NetworkGlyphNode,
  NetworkLabel,
  NetworkLineEdge,
  NetworkSceneEdge,
  NetworkSceneNode,
  RealtimeEdge
} from "./networkTypes"
import type { NetworkHtmlMark } from "./networkCustomLayout"
import type { ThemeSemanticColors } from "./types"
import {
  fitNetworkPerspectiveFrame,
  PerspectiveFitSamples,
  rawPerspectiveDatum,
  readPerspectiveAccessor
} from "./networkPerspectiveFit"
import {
  type NetworkPerspectiveAccessor,
  type NetworkPerspectiveConfig,
  type NetworkPerspectiveFrame,
  type NetworkPerspectiveMarkMode,
  type ResolvedNetworkPerspective
} from "./networkPerspective"
import {
  forEachSvgPathPoint,
  normalizeSvgPath,
  polygonPath,
  serializeSvgPath,
  type NormalizedPathSegment
} from "./svgPathTransform"
import { symbolPathString, symbolRadius } from "./symbolPath"
import { extrudeOutline, samplePolygon } from "./networkPerspectiveSolid"
import { glyphPlacement, type GlyphDef } from "./glyphDef"
import { getNetworkPerspectiveExtras } from "./networkPerspectiveLoader"
import type { NetworkPerspectiveBound } from "./networkPerspective"

export interface NetworkPerspectiveSceneInput {
  sceneNodes: NetworkSceneNode[]
  sceneEdges: NetworkSceneEdge[]
  labels: NetworkLabel[]
  htmlMarks?: NetworkHtmlMark[]
  /** Decoration extents a custom layout declared, included in the fit. */
  bounds?: readonly NetworkPerspectiveBound[]
  size: [number, number]
  perspective: ResolvedNetworkPerspective
  chartType?: string
  theme?: ThemeSemanticColors
}

export interface NetworkPerspectiveScene {
  sceneNodes: NetworkSceneNode[]
  sceneEdges: NetworkSceneEdge[]
  labels: NetworkLabel[]
  htmlMarks: NetworkHtmlMark[]
  /** Non-interactive ground chrome painted before edges. */
  underlay: NetworkSceneEdge[]
  frame: NetworkPerspectiveFrame
  /** Height edges (and their particles) ride above their surface. */
  edgeLift: number
  /** Project layout-space particles on the same surface as their scene edge. */
  projectParticle: (x: number, y: number, edge: RealtimeEdge, progress: number) => [number, number]
}

export interface PreparedNetworkPerspectiveScene {
  frame: NetworkPerspectiveFrame
  emit(frame?: NetworkPerspectiveFrame): NetworkPerspectiveScene
}

export type Rect4 = [number, number, number, number]

/** One scene node during projection (shared with the perspective extras). */
export interface PerspectiveNodeItem {
  node: NetworkSceneNode
  mode: NetworkPerspectiveMarkMode
  /** Final elevation: own lift plus the surface it stands on (layout px). */
  z: number
  /** Own lift above its surface. */
  lift: number
  /** Extrusion height. */
  h: number
  /** Piece thickness (0 for upright billboards). */
  t: number
  gx: number
  gy: number
  /** Layout-space footprint. */
  box: Rect4
  index: number
  glyph?: GlyphDef
}

export type PerspectiveSampleFn = (
  x: number, y: number, z?: number, left?: number, right?: number, top?: number, bottom?: number
) => void

/** Per-scene plan returned by the extras (regions, plate, grid). */
export interface PerspectiveExtrasPlan {
  add(sample: PerspectiveSampleFn): void
  underlay(frame: NetworkPerspectiveFrame): { edges: NetworkSceneEdge[]; labels: NetworkLabel[] }
}

export interface NetworkPerspectiveExtras {
  plan(
    items: PerspectiveNodeItem[],
    config: NetworkPerspectiveConfig,
    size: [number, number],
    theme: ThemeSemanticColors
  ): PerspectiveExtrasPlan | null
  extrude(item: PerspectiveNodeItem, frame: NetworkPerspectiveFrame): NetworkSceneNode
  sort(items: PerspectiveNodeItem[], frame: NetworkPerspectiveFrame): PerspectiveNodeItem[]
  route(
    edge: NetworkLineEdge,
    rounded: boolean,
    map: (x: number, y: number, t: number) => [number, number]
  ): NetworkSceneEdge
}

const KAPPA = 0.5522847498

export function circleSegments(cx: number, cy: number, r: number): NormalizedPathSegment[] {
  const k = r * KAPPA
  return [
    { c: "M", p: [cx + r, cy] },
    { c: "C", p: [cx + r, cy + k, cx + k, cy + r, cx, cy + r] },
    { c: "C", p: [cx - k, cy + r, cx - r, cy + k, cx - r, cy] },
    { c: "C", p: [cx - r, cy - k, cx - k, cy - r, cx, cy - r] },
    { c: "C", p: [cx + k, cy - r, cx + r, cy - k, cx + r, cy] },
    { c: "Z", p: [] }
  ]
}

function arcSegments(n: NetworkArcNode): NormalizedPathSegment[] {
  const start = Math.min(n.startAngle, n.endAngle)
  const sweep = Math.min(Math.PI * 2 - 1e-6, Math.abs(n.endAngle - n.startAngle))
  const pt = (r: number, a: number) => `${n.cx + r * Math.cos(a)} ${n.cy + r * Math.sin(a)}`
  const large = sweep > Math.PI ? 1 : 0
  const end = start + sweep
  const inner = n.innerR > 0
    ? `L${pt(n.innerR, end)}A${n.innerR} ${n.innerR} 0 ${large} 0 ${pt(n.innerR, start)}`
    : `L${n.cx} ${n.cy}`
  return normalizeSvgPath(`M${pt(n.outerR, start)}A${n.outerR} ${n.outerR} 0 ${large} 1 ${pt(n.outerR, end)}${inner}Z`)
}

export function rectCorners(b: Rect4): Array<[number, number]> {
  return [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]]
}

/** Ids a node answers to: scene id, datum id, raw datum id. */
export function nodeIds(node: NetworkSceneNode): string[] {
  const d = node.datum as { id?: unknown; data?: { id?: unknown } } | null
  return [node.id, d?.id, d?.data?.id].filter((v) => v != null && v !== "").map(String)
}

function footprint(n: NetworkSceneNode): Rect4 {
  if (n.type === "rect") return [n.x, n.y, n.x + n.w, n.y + n.h]
  const r =
    n.type === "circle" ? n.r
      : n.type === "arc" ? n.outerR
        : n.type === "symbol" ? symbolRadius(n.size)
          : n.size / 2
  return [n.cx - r, n.cy - r, n.cx + r, n.cy + r]
}

function modeFor(
  n: NetworkSceneNode,
  requested: NetworkPerspectiveMarkMode | undefined,
  chartType: string | undefined
): NetworkPerspectiveMarkMode {
  if (n.type === "arc") return "ground"
  if (n.type === "glyph") return "billboard"
  if (n.type === "symbol") return requested === "billboard" ? "billboard" : "token"
  if (n.type === "circle") {
    if (requested === "billboard" || requested === "ground") return requested
    return !requested && chartType === "circlepack" ? "ground" : "token"
  }
  if (!requested || requested === "token") return "ground"
  // Hierarchy containers stay on the ground under their extruded leaves.
  if (requested === "extrude") {
    const d = n.datum as { children?: unknown[]; data?: { children?: unknown[] } } | null
    if (d?.children?.length || d?.data?.children?.length) return "ground"
  }
  return requested
}

/** Piece thickness in layout px (`thickness`, default 6). */
export function pieceThickness(config: NetworkPerspectiveConfig): number {
  const t = config.thickness
  return typeof t === "number" && Number.isFinite(t) ? Math.max(0, t) : 6
}

const STACKED_HIERARCHIES = new Set(["treemap", "circlepack"])

/** Accessor values in layout px: constants as-is, data scaled ("auto" → 48px max). */
function heights(
  items: PerspectiveNodeItem[],
  accessor: NetworkPerspectiveAccessor | undefined,
  scale: number | "auto" | undefined,
  fallback: number,
  select: (item: PerspectiveNodeItem) => boolean
): number[] {
  const raw = items.map((item) =>
    !select(item) ? NaN
      : accessor == null ? fallback
        : readPerspectiveAccessor(accessor, item.node.datum)
  )
  if (accessor == null || typeof accessor === "number") return raw.map((v) => (Number.isFinite(v) ? v : 0))
  const max = raw.reduce((m, v) => (Number.isFinite(v) ? Math.max(m, Math.abs(v)) : m), 0)
  const k = typeof scale === "number" && Number.isFinite(scale) ? scale : max > 0 ? 48 / max : 0
  return raw.map((v) => (Number.isFinite(v) ? v * k : 0))
}

export function readableAngle(dx: number, dy: number): number {
  const a = Math.atan2(dy, dx)
  return a > Math.PI / 2 ? a - Math.PI : a <= -Math.PI / 2 ? a + Math.PI : a
}

/** Estimated text extents [left, right, top, bottom] around a label point. */
function textExtents(label: NetworkLabel): [number, number, number, number] {
  const size = label.fontSize ?? 11
  const w = String(label.text ?? "").length * size * 0.56
  const left = label.anchor === "end" ? w : label.anchor === "start" ? 0 : w / 2
  return [left, w - left, size * 0.7, size * 0.7]
}

function endpointId(e: unknown): string | null {
  if (e == null) return null
  if (typeof e !== "object") return String(e)
  const id = (e as { id?: unknown }).id
  return id == null ? null : String(id)
}

/** Resolve modes, elevation and fit for one scene. */
export function prepareNetworkPerspectiveScene(
  input: NetworkPerspectiveSceneInput
): PreparedNetworkPerspectiveScene {
  const { perspective, size, chartType, theme = {} } = input
  const config = perspective.config
  const extras = getNetworkPerspectiveExtras()
  const feet = config.anchor === "feet"
  const glyphOf = config.glyph
  const T = pieceThickness(config)

  const items: PerspectiveNodeItem[] = input.sceneNodes.map((node, index) => {
    const requested = typeof config.marks === "function" ? config.marks(node) : config.marks
    let mode = modeFor(node, requested, chartType)
    if (mode === "extrude" && !extras) mode = "ground"
    const box = footprint(node)
    const glyph =
      (mode === "billboard" || mode === "token") && glyphOf && (node.type === "circle" || node.type === "symbol")
        ? (typeof glyphOf === "function"
            ? glyphOf((rawPerspectiveDatum(node.datum) ?? {}) as never)
            : glyphOf) ?? undefined
        : undefined
    // Pictograms carry their own depth; they stand as billboards.
    if (glyph) mode = "billboard"
    // Exact node coordinates: labels and edge endpoints key on them.
    return {
      node, mode, z: 0, lift: 0, h: 0, t: 0,
      gx: node.type === "rect" ? node.x + node.w / 2 : node.cx,
      gy: node.type === "rect" ? node.y + node.h / 2 : node.cy,
      box, index, glyph
    }
  })
  const lifts = heights(items, config.elevation, config.elevationScale, 0, () => true)
  const extrusions = heights(items, config.extrude, config.extrudeScale, 24, (i) => i.mode === "extrude")
  const stacked = STACKED_HIERARCHIES.has(chartType ?? "")
  items.forEach((item, i) => {
    item.z = item.lift = lifts[i]
    item.t = item.mode === "billboard" ? 0 : T
    item.h = item.mode === "extrude" ? Math.max(T, extrusions[i]) : 0
    // Nested levels sit on their parent's top surface (terraces).
    if (stacked && item.mode !== "billboard") item.z += ((item.node as { depth?: number }).depth ?? 0) * T
  })
  // Regions seat their members on the plate top (mutates z).
  const plan = extras?.plan(items, config, size, theme) ?? null
  const topOf = (item: PerspectiveNodeItem) => item.z + (item.mode === "extrude" ? item.h : item.t)

  const glyphSize = (item: PerspectiveNodeItem) =>
    config.glyphSize ?? Math.max(16, (item.node.type === "circle" ? item.node.r : symbolRadius((item.node as { size: number }).size)) * 2.8)

  // ── Fit samples ──────────────────────────────────────────────────────
  const samples = new PerspectiveFitSamples(perspective)
  const add: PerspectiveSampleFn = (x, y, z, l, r, t, b) => samples.add(x, y, z, l, r, t, b)
  const [la, lb, lc, ld] = perspective.linear
  for (const item of items) {
    const { node: n, mode, z } = item
    const top = topOf(item)
    if (mode === "billboard") {
      if (item.glyph || n.type === "glyph") {
        const p = glyphPlacement(item.glyph ?? (n as NetworkGlyphNode).glyph, item.glyph ? glyphSize(item) : (n as NetworkGlyphNode).size)
        add(item.gx, item.gy, z, -p.offsetX, p.offsetX + p.width, -p.offsetY, p.offsetY + p.height)
      } else if (n.type === "rect") {
        add(item.gx, item.gy, z, n.w / 2, n.w / 2, n.h / 2, n.h / 2)
      } else {
        const r = (item.box[2] - item.box[0]) / 2
        add(item.gx, item.gy, z, r, r, feet ? 2 * r : r, feet ? 0 : r)
      }
      if (item.lift > 0) add(item.gx, item.gy, z - item.lift)
    } else if (mode === "token") {
      const r = (item.box[2] - item.box[0]) / 2
      add(item.gx, item.gy, top, r, r, r, r)
      add(item.gx, item.gy, z, r, r, r, r)
      if (item.lift > 0) add(item.gx, item.gy, z - item.lift)
    } else if (n.type === "circle") {
      for (const t of [Math.atan2(lc, la), Math.atan2(ld, lb)]) {
        const dx = n.r * Math.cos(t)
        const dy = n.r * Math.sin(t)
        for (const h of [z, top]) {
          add(n.cx + dx, n.cy + dy, h)
          add(n.cx - dx, n.cy - dy, h)
        }
      }
    } else if (n.type === "arc") {
      for (let s = 0; s <= 12; s++) {
        const a = n.startAngle + ((n.endAngle - n.startAngle) * s) / 12
        add(n.cx + n.outerR * Math.cos(a), n.cy + n.outerR * Math.sin(a), z)
        add(n.cx + n.outerR * Math.cos(a), n.cy + n.outerR * Math.sin(a), top)
      }
    } else {
      for (const [x, y] of rectCorners(item.box)) {
        add(x, y, z)
        add(x, y, top)
      }
    }
  }

  // Edge base height: the surface a node stands on (default), the node itself
  // ("nodes"), the ground, or a constant. Edges ride `thickness` above it.
  const edgeZ = config.edges?.elevation ?? "surface"
  const zById = new Map<string, number>()
  const zByPoint = new Map<string, number>()
  for (const item of items) {
    const z = edgeZ === "nodes" ? item.z : item.z - item.lift
    zByPoint.set(`${item.gx}|${item.gy}`, z)
    for (const id of nodeIds(item.node)) if (!zById.has(id)) zById.set(id, z)
  }
  const endZ = (endpoint: unknown, x?: number, y?: number) => {
    const id = endpointId(endpoint)
    const idHeight = id != null ? zById.get(id) : undefined
    const pointHeight = x != null && y != null ? zByPoint.get(`${x}|${y}`) : undefined
    return idHeight ?? pointHeight ?? 0
  }
  const edgeBase = (e: NetworkSceneEdge): [number, number] => {
    if (typeof edgeZ === "number") return Number.isFinite(edgeZ) ? [edgeZ, edgeZ] : [0, 0]
    if (edgeZ === "ground" || !zByPoint.size) return [0, 0]
    const d = e.datum as { source?: unknown; target?: unknown } | null
    return e.type === "line"
      ? [endZ(d?.source, e.x1, e.y1), endZ(d?.target, e.x2, e.y2)]
      : [endZ(d?.source), endZ(d?.target)]
  }
  const paths = new Map<NetworkSceneEdge, NormalizedPathSegment[]>()
  const edgeHeights = new Map<NetworkSceneEdge, (progress: number) => number>()
  const particleHeights = new Map<unknown, (progress: number) => number>()
  for (const e of input.sceneEdges) {
    const [z0, z1] = edgeBase(e)
    // Lines interpolate their endpoint heights; path bands lie on the mean
    // endpoint plane. Keep particles on exactly the same surface as the edge.
    const heightAt = e.type === "line"
      ? (progress: number) => z0 + (z1 - z0) * progress + T
      : () => (z0 + z1) / 2 + T
    edgeHeights.set(e, heightAt)
    particleHeights.set(e.datum, heightAt)
    if (e.type === "line") {
      for (const h of [0, T]) {
        add(e.x1, e.y1, z0 + h)
        add(e.x2, e.y2, z1 + h)
      }
    } else if (e.pathD) {
      const segs = normalizeSvgPath(e.pathD)
      paths.set(e, segs)
      forEachSvgPathPoint(segs, (x, y) => {
        add(x, y, (z0 + z1) / 2)
        add(x, y, (z0 + z1) / 2 + T)
      })
    }
  }
  plan?.add(add)

  // Labels: anchored labels ride their node with a fixed screen offset;
  // others are ground points lifted onto the piece they sit in (or to piece
  // height, so they line up with edges and slab tops).
  const byPoint = new Map<string, PerspectiveNodeItem>()
  const byId = new Map<string, PerspectiveNodeItem>()
  for (const item of items) {
    const key = `${item.gx}|${item.gy}`
    if (!byPoint.has(key)) byPoint.set(key, item)
    for (const id of nodeIds(item.node)) if (!byId.has(id)) byId.set(id, item)
  }
  const pieces = items.filter((i) => i.mode === "ground" || i.mode === "extrude")
  const labelPlans = input.labels.map((label) => {
    const [l, r, t, b] = textExtents(label)
    const anchor = label.anchorPoint
    if (anchor) {
      const item = byPoint.get(`${anchor[0]}|${anchor[1]}`)
      const ox = label.x - anchor[0]
      const oy = label.y - anchor[1]
      add(anchor[0], anchor[1], item ? topOf(item) : 0, Math.max(0, l - ox), Math.max(0, r + ox), Math.max(0, t - oy), Math.max(0, b + oy))
      return { label, item, z: item ? topOf(item) : 0, ox, oy }
    }
    let z = T
    let area = Infinity
    for (const i of pieces) {
      const [x0, y0, x1, y1] = i.box
      const a = (x1 - x0) * (y1 - y0)
      if (label.x >= x0 && label.x <= x1 && label.y >= y0 && label.y <= y1 && a < area) {
        area = a
        z = topOf(i)
      }
    }
    add(label.x, label.y, z, l, r, t, b)
    return { label, item: undefined, z, ox: 0, oy: 0 }
  })
  const htmlPlans = (input.htmlMarks ?? []).map((mark) => {
    const x = mark.x + mark.width / 2
    const y = mark.y + mark.height / 2
    const item = byId.get(mark.id) ?? byPoint.get(`${x}|${y}`)
    const ox = item ? x - item.gx : 0
    const oy = item ? y - item.gy : 0
    add(item?.gx ?? x, item?.gy ?? y, item ? topOf(item) : T,
      Math.max(0, mark.width / 2 - ox), Math.max(0, mark.width / 2 + ox),
      Math.max(0, mark.height / 2 - oy), Math.max(0, mark.height / 2 + oy))
    return { mark, item }
  })
  for (const b of input.bounds ?? []) {
    if (!b || !Number.isFinite(b.x) || !Number.isFinite(b.y)) continue
    const height = (z: number | "top" | undefined, fallback: number) =>
      z === "top" ? T : Number.isFinite(z) ? Number(z) : fallback
    if ("extent" in b) {
      const [l, r, t, bottom] = b.extent
      add(b.x, b.y, height(b.z, T), l, r, t, bottom)
    } else if (Number.isFinite(b.width) && Number.isFinite(b.height)) {
      const z = height(b.z, 0)
      for (const [x, y] of rectCorners([b.x, b.y, b.x + b.width, b.y + b.height])) add(x, y, z)
    }
  }

  const fitted = fitNetworkPerspectiveFrame(perspective, size, samples)

  const emit = (frame: NetworkPerspectiveFrame = fitted): NetworkPerspectiveScene => {
    const project = frame.project
    const [a, b, c, d] = frame.matrix
    const ground: NetworkSceneNode[] = []
    const standing: PerspectiveNodeItem[] = []
    const out = new Map<PerspectiveNodeItem, NetworkSceneNode>()
    const moved = new Map<PerspectiveNodeItem, [number, number]>()
    // Screen-space footprint of a point mark lying on the ground plane.
    const reach = Math.hypot(a, c) || 1
    const lay = (x: number, y: number): [number, number] => [(a * x + c * y) / reach, (b * x + d * y) / reach]
    /** Top path, side walls and bounds of a ground outline from `z` up `t`. */
    const slab = (segs: NormalizedPathSegment[], z: number, t: number) => {
      const map = (x: number, y: number) => project(x, y, z + t)
      const top = samplePolygon(segs).map(([x, y]) => map(x, y))
      const faces = extrudeOutline(top, t * frame.lift)
      const drop = t * frame.lift
      const xs = top.map((p) => p[0])
      const ys = top.map((p) => p[1])
      const x0 = Math.min(...xs)
      const y0 = Math.min(...ys)
      return {
        pathD: serializeSvgPath(segs, map),
        faces: faces.length ? faces : undefined,
        bounds: [x0, y0, Math.max(...xs) - x0, Math.max(...ys) + drop - y0] as const
      }
    }
    for (const item of items) {
      const { node: n, mode, z } = item
      let p: NetworkSceneNode
      if (mode === "extrude" && extras) {
        p = extras.extrude(item, frame)
      } else if (mode === "billboard") {
        const [px, py] = project(item.gx, item.gy, z)
        if (item.glyph && n.type !== "rect" && n.type !== "arc") {
          const glyphNode: NetworkGlyphNode = {
            type: "glyph",
            cx: px,
            cy: py,
            size: glyphSize(item),
            glyph: item.glyph,
            color: typeof n.style.fill === "string" ? n.style.fill : undefined,
            style: n.style,
            datum: n.datum,
            accessibleDatum: n.accessibleDatum,
            accessibility: n.accessibility,
            id: n.id,
            label: n.label,
            depth: n.depth
          }
          p = glyphNode
        } else if (n.type === "rect") {
          p = { ...n, x: px - n.w / 2, y: py - n.h / 2, _hitPath: undefined }
        } else {
          const r = feet && n.type !== "glyph" ? (item.box[2] - item.box[0]) / 2 : 0
          p = { ...n, cx: px, cy: py - r } as NetworkSceneNode
        }
      } else if (mode === "token" && (n.type === "circle" || n.type === "symbol")) {
        // A disc or symbol lying on the ground at its pixel size, `t` thick.
        const [cx, cy] = project(item.gx, item.gy, z + item.t)
        const rot = n.type === "symbol" ? n.rotation ?? 0 : 0
        const cos = Math.cos(rot)
        const sin = Math.sin(rot)
        const local = (x: number, y: number) => lay(x * cos - y * sin, x * sin + y * cos)
        const segs = n.type === "circle"
          ? circleSegments(0, 0, n.r)
          : normalizeSvgPath(symbolPathString(n.symbolType, n.size, n.path))
        const top = samplePolygon(segs, 6).map(([x, y]): [number, number] => {
          const [u, v] = local(x, y)
          return [cx + u, cy + v]
        })
        const faces = extrudeOutline(top, item.t * frame.lift)
        p = n.type === "circle"
          ? {
              ...n,
              cx,
              cy,
              pathD: serializeSvgPath(segs, (x, y) => {
                const [u, v] = local(x, y)
                return [cx + u, cy + v]
              }),
              faces: faces.length ? faces : undefined,
              _perspectiveToken: true
            }
          : { ...n, cx, cy, rotation: 0, path: serializeSvgPath(segs, local), faces: faces.length ? faces : undefined }
      } else if (n.type === "rect") {
        const hp = n._hitPath
        const segs = hp
          ? normalizeSvgPath(serializeSvgPath(normalizeSvgPath(hp.pathD), (x, y) =>
              [hp.transform[0] + x * hp.transform[2], hp.transform[1] + y * hp.transform[3]]))
          : normalizeSvgPath(polygonPath(rectCorners(item.box)))
        const shape = slab(segs, z, item.t)
        const [x, y, w, h] = shape.bounds
        const hitD = shape.pathD + (shape.faces ?? []).map((f) => f.pathD).join("")
        p = {
          ...n,
          x,
          y,
          w: Math.max(1e-3, w),
          h: Math.max(1e-3, h),
          pathD: shape.pathD,
          faces: shape.faces,
          _hitPath: { pathD: hitD, transform: [0, 0, 1, 1], fill: true, strokeWidth: hp?.strokeWidth ?? 0 }
        }
      } else {
        const [px, py] = project(item.gx, item.gy, z + item.t)
        const segs = n.type === "circle" ? circleSegments(n.cx, n.cy, n.r) : arcSegments(n as NetworkArcNode)
        const shape = slab(segs, z, item.t)
        p = { ...n, cx: px, cy: py, pathD: shape.pathD, faces: shape.faces } as NetworkSceneNode
      }
      out.set(item, p)
      const cx = p.type === "rect" ? p.x + p.w / 2 : p.cx
      const cy = p.type === "rect" ? p.y + p.h / 2 : p.cy
      moved.set(item, [cx - item.gx, cy - item.gy])
      if (mode === "ground") ground.push(p)
      else standing.push(item)
    }
    const sorted =
      config.depthSort === false ? standing
        : standing.some((i) => i.mode === "extrude") && extras ? extras.sort(standing, frame)
          : [...standing].sort((p, q) =>
              frame.depth(p.gx, p.gy, p.z) - frame.depth(q.gx, q.gy, q.z) || p.index - q.index)
    const sceneNodes = ground.concat(sorted.map((i) => out.get(i)!))

    // Edges ride `T` above their surface; the surface receives their shadow.
    const route = config.edges?.route
    const shadowConfig = config.edgeShadow ?? true
    const casts = T > 0 && shadowConfig !== false
    const filledShadows: string[] = []
    const strokedShadows = new Map<number, string[]>()
    const visible = (paint: unknown) => typeof paint === "string" ? paint !== "" && paint !== "none" && paint !== "transparent" : paint != null
    const shadow = (e: NetworkSceneEdge, pathD: string) => {
      if (!casts || (e.style.opacity ?? 1) <= 0) return
      const band = e.type === "bezier" || e.type === "ribbon"
      const fillAlpha = e.type === "curved" ? e.style.fillOpacity ?? 0.1
        : e.style.fillOpacity ?? e.style.opacity ?? 0.5
      const strokeAlpha = (e.style.opacity ?? 1) * (e.style.strokeOpacity ?? 1) * (band ? e.type === "bezier" ? 0.5 : 0.3 : 1)
      if (e.type !== "line" && visible(e.style.fill) && fillAlpha > 0) {
        filledShadows.push(pathD)
      } else if (visible(e.style.stroke || (band ? undefined : "#999")) && strokeAlpha > 0 &&
        (e.style.strokeWidth ?? (band ? 0.5 : 1)) > 0) {
        const width = e.style.strokeWidth ?? (band ? 0.5 : 1)
        const list = strokedShadows.get(width) ?? []
        list.push(pathD)
        strokedShadows.set(width, list)
      }
    }
    const sceneEdges = input.sceneEdges.map((e): NetworkSceneEdge => {
      const heightAt = edgeHeights.get(e)!
      const z0 = heightAt(0) - T
      const z1 = heightAt(1) - T
      if (e.type === "line") {
        if (route && route !== "layout" && extras) {
          const rounded = route === "orthogonal-rounded"
          const at = (h: number) => (x: number, y: number, t: number) => project(x, y, heightAt(t) - T + h)
          const routed = extras.route(e, rounded, at(T))
          if (casts) shadow(e, (extras.route(e, rounded, at(0)) as { pathD: string }).pathD)
          return routed
        }
        const [x1, y1] = project(e.x1, e.y1, z0 + T)
        const [x2, y2] = project(e.x2, e.y2, z1 + T)
        if (casts) {
          const [sx1, sy1] = project(e.x1, e.y1, z0)
          const [sx2, sy2] = project(e.x2, e.y2, z1)
          shadow(e, `M${sx1} ${sy1}L${sx2} ${sy2}`)
        }
        return { ...e, x1, y1, x2, y2 }
      }
      const segs = paths.get(e)
      if (!segs) return e
      const z = (z0 + z1) / 2
      if (casts) shadow(e, serializeSvgPath(segs, (x, y) => project(x, y, z)))
      const p = {
        ...e,
        pathD: serializeSvgPath(segs, (x, y) => project(x, y, z + T)),
        _cachedPath2D: undefined,
        _cachedPath2DSource: undefined
      } as NetworkSceneEdge
      if (p.type === "bezier") {
        p.bezierCache = undefined
        const g = p._gradient
        if (g) {
          const [x0, y0] = project(g.x0, g.y0 ?? 0, z + T)
          const [x1, y1] = project(g.x1, g.y1 ?? 0, z + T)
          p._gradient = { ...g, x0, y0, x1, y1 }
        }
      }
      return p
    })

    const rotate =
      config.labels?.mode === "ground"
        ? config.labels.axis === "y" ? readableAngle(c, d) : readableAngle(a, b)
        : undefined
    const labels = labelPlans.map(({ label, item, z, ox, oy }): NetworkLabel => {
      let x: number
      let y: number
      if (item) {
        const m = moved.get(item)!
        x = label.x + m[0]
        y = label.y + m[1]
      } else if (label.anchorPoint) {
        const [px, py] = project(label.anchorPoint[0], label.anchorPoint[1], z)
        x = px + ox
        y = py + oy
      } else {
        ;[x, y] = project(label.x, label.y, z)
      }
      return rotate == null ? { ...label, x, y } : { ...label, x, y, rotate }
    })

    const htmlMarks = htmlPlans.map(({ mark: m, item }) => {
      if (item) {
        if (item.mode === "billboard") {
          const [dx, dy] = moved.get(item)!
          return { ...m, x: m.x + dx, y: m.y + dy }
        }
        const [px, py] = project(item.gx, item.gy, topOf(item))
        return { ...m, x: m.x + px - item.gx, y: m.y + py - item.gy }
      }
      const [px, py] = project(m.x + m.width / 2, m.y + m.height / 2, T)
      return { ...m, x: px - m.width / 2, y: py - m.height / 2 }
    })

    const chrome = plan?.underlay(frame) ?? { edges: [], labels: [] }
    const underlay = chrome.edges.slice()
    const edge = (pathD: string, style: NetworkSceneEdge["style"]) =>
      underlay.push({ type: "curved", pathD, style, datum: null, interactive: false })
    // Shadows darken whatever they fall on, on light and dark themes alike;
    // a stroke wider than the edge reads as a soft shadow, not a second line.
    const shade = typeof shadowConfig === "object" ? shadowConfig : {}
    const shadowColor = shade.color ?? "#000"
    const shadowOpacity = shade.opacity ?? 0.16
    if (filledShadows.length) {
      edge(filledShadows.join(""), { fill: shadowColor, fillOpacity: shadowOpacity * 0.75, stroke: "none" })
    }
    for (const [width, list] of strokedShadows) {
      edge(list.join(""), { fill: "none", stroke: shadowColor, strokeWidth: width + 2, opacity: shadowOpacity, strokeLinecap: "round" })
    }
    // Elevation guides: drop line + ground shadow under lifted marks.
    const guides = config.elevationGuides ?? true
    if (guides) {
      const opts = typeof guides === "object" ? guides : {}
      const shadows: string[] = []
      const lines: string[] = []
      for (const item of items) {
        if ((item.mode !== "billboard" && item.mode !== "token") || item.lift <= 0) continue
        const p = out.get(item)!
        const base = item.z - item.lift
        const [bx, by] = project(item.gx, item.gy, base)
        const r = item.glyph ? glyphSize(item) / 3 : (item.box[2] - item.box[0]) / 2
        if (opts.shadow !== false) {
          shadows.push(serializeSvgPath(circleSegments(item.gx, item.gy, r), (x, y) => project(x, y, base)))
        }
        const tx = p.type === "rect" ? p.x + p.w / 2 : p.cx
        const ty = p.type === "rect" ? p.y + p.h : p.cy + item.t * frame.lift
        if (Math.abs(ty - by) > 1) lines.push(`M${bx} ${by}L${tx} ${ty}`)
      }
      if (shadows.length) edge(shadows.join(""), { fill: shadowColor, fillOpacity: 0.14, stroke: "none" })
      if (lines.length) {
        edge(lines.join(""), {
          stroke: opts.stroke ?? theme.textSecondary ?? "rgba(128,128,128,0.8)",
          strokeWidth: 1,
          strokeDasharray: opts.strokeDasharray ?? "3 3",
          fill: "none"
        })
      }
    }

    return {
      sceneNodes,
      sceneEdges,
      labels: chrome.labels.length ? chrome.labels.concat(labels) : labels,
      htmlMarks,
      underlay,
      frame: { ...frame, thickness: T },
      edgeLift: T,
      projectParticle: (x, y, edge, progress) => project(x, y, particleHeights.get(edge)?.(progress) ?? T)
    }
  }

  return { frame: fitted, emit }
}

/** Project a scene in one step. */
export function projectNetworkScene(input: NetworkPerspectiveSceneInput): NetworkPerspectiveScene {
  return prepareNetworkPerspectiveScene(input).emit()
}
