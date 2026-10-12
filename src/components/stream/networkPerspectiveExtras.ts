import { getMax, getMin } from "../charts/shared/minMax"
/**
 * Perspective extras: ground grid and plate, regions (raised plates with
 * labels that seat their member nodes), orthogonal ground routing, and
 * extruded prisms with a separating-axis paint order. Loaded on demand by
 * `networkPerspectiveLoader`; provided eagerly for SSR/static SVG.
 */
import type {
  NetworkLabel,
  NetworkPerspectiveFace,
  NetworkRectNode,
  NetworkSceneEdge
} from "./networkTypes"
import type { Style } from "./types"
import type {
  NetworkPerspectiveFrame,
  NetworkPerspectiveRegion
} from "./networkPerspective"
import { extrudeOutline } from "./networkPerspectiveSolid"
import {
  nodeIds,
  pieceThickness,
  readableAngle,
  rectCorners,
  type NetworkPerspectiveExtras,
  type PerspectiveNodeItem,
  type Rect4
} from "./networkPerspectiveScene"
import { polygonPath, serializeSvgPath, type NormalizedPathSegment } from "./svgPathTransform"
import { shadeColor } from "./colorShade"

/** Top polygon and visible side walls of a ground box from `base` to `top`. */
function prism(frame: NetworkPerspectiveFrame, box: Rect4, base: number, top: number) {
  const corners = rectCorners(box)
  const up = corners.map(([x, y]) => frame.project(x, y, top))
  const down = corners.map(([x, y]) => frame.project(x, y, base))
  const faces: NetworkPerspectiveFace[] = extrudeOutline(up, (top - base) * frame.lift)
  return { up, down, faces }
}

function union(boxes: Rect4[], pad: number): Rect4 | null {
  if (!boxes.length) return null
  const b: Rect4 = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [x0, y0, x1, y1] of boxes) {
    b[0] = Math.min(b[0], x0)
    b[1] = Math.min(b[1], y0)
    b[2] = Math.max(b[2], x1)
    b[3] = Math.max(b[3], y1)
  }
  return b.every(Number.isFinite) ? [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad] : null
}

interface Slab {
  region: NetworkPerspectiveRegion
  box: Rect4
  base: number
  top: number
}

const fmt = (v: number) => Math.round(v * 100) / 100

/** Clip segment a→b to [0,w]×[0,h] (Liang–Barsky). */
function clipSegment(a: [number, number], b: [number, number], w: number, h: number): string | null {
  let t0 = 0
  let t1 = 1
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  for (const [p, q] of [[-dx, a[0]], [dx, w - a[0]], [-dy, a[1]], [dy, h - a[1]]]) {
    if (p === 0) {
      if (q < 0) return null
      continue
    }
    const r = q / p
    if (p < 0) {
      if (r > t1) return null
      if (r > t0) t0 = r
    } else {
      if (r < t0) return null
      if (r < t1) t1 = r
    }
  }
  return `M${fmt(a[0] + t0 * dx)} ${fmt(a[1] + t0 * dy)}L${fmt(a[0] + t1 * dx)} ${fmt(a[1] + t1 * dy)}`
}

export const networkPerspectiveExtras: NetworkPerspectiveExtras = {
  plan(items, config, size, theme) {
    const gridConfig = config.ground?.grid
    const plateConfig = config.ground?.plate
    if (!gridConfig && !plateConfig && !config.regions?.length) return null

    // Plates and regions default to the same thickness as the pieces on them.
    const thickness = pieceThickness(config)
    const byId = new Map<string, PerspectiveNodeItem>()
    for (const item of items) for (const id of nodeIds(item.node)) if (!byId.has(id)) byId.set(id, item)
    const slabs: Slab[] = []
    for (const region of config.regions ?? []) {
      if (!region || typeof region !== "object") continue
      const members = [...new Set((region.nodes ?? []).map((id) => byId.get(String(id))).filter(Boolean))] as PerspectiveNodeItem[]
      let box: Rect4 | null = null
      if (region.nodes?.length) box = union(members.map((m) => m.box), region.padding ?? 16)
      else if (region.bounds) {
        const [[x0, y0], [x1, y1]] = region.bounds
        box = [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)]
      }
      if (!box || !box.every(Number.isFinite)) continue
      const base = Number.isFinite(region.elevation) ? Number(region.elevation) : 0
      const top = base + Math.max(0, Number.isFinite(region.depth) ? Number(region.depth) : thickness)
      slabs.push({ region, box, base, top })
      // Members stand on the plate's top surface.
      for (const m of members) m.z += top
    }
    let plate: Slab | null = null
    if (plateConfig && items.length) {
      const opts = typeof plateConfig === "object" ? plateConfig : {}
      const box = union([...items.map((i) => i.box), ...slabs.map((s) => s.box)], opts.padding ?? 24)
      if (box) {
        plate = {
          region: { id: "plate", fill: opts.fill, stroke: opts.stroke },
          box,
          base: -Math.max(0, Number.isFinite(opts.depth) ? Number(opts.depth) : thickness),
          top: 0
        }
      }
    }

    return {
      add(sample) {
        for (const s of plate ? [...slabs, plate] : slabs) {
          for (const [x, y] of rectCorners(s.box)) {
            sample(x, y, s.top)
            sample(x, y, s.base)
          }
        }
      },
      underlay(frame) {
        const edges: NetworkSceneEdge[] = []
        const labels: NetworkLabel[] = []
        const chrome = (pathD: string, style: Style, part: string) =>
          edges.push({ type: "curved", pathD, style, datum: null, interactive: false, _perspectivePart: part })

        if (gridConfig) {
          const opts = typeof gridConfig === "object" ? gridConfig : {}
          const step = Math.max(2, opts.step ?? 24)
          const [w, h] = size
          const content = opts.extent === "content"
          const box = content
            ? union(items.map((i) => i.box), step)
            : union([[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => {
                const [gx, gy] = frame.unproject(x, y)
                return [gx, gy, gx, gy] as Rect4
              }), 0)
          if (box) {
            const lines: string[] = []
            const line = (a: [number, number], b: [number, number]) => {
              const d = content ? `M${fmt(a[0])} ${fmt(a[1])}L${fmt(b[0])} ${fmt(b[1])}` : clipSegment(a, b, w, h)
              if (d) lines.push(d)
            }
            for (let x = Math.ceil(box[0] / step) * step, n = 0; x <= box[2] && n < 400; x += step, n++) {
              line(frame.project(x, box[1]), frame.project(x, box[3]))
            }
            for (let y = Math.ceil(box[1] / step) * step, n = 0; y <= box[3] && n < 400; y += step, n++) {
              line(frame.project(box[0], y), frame.project(box[2], y))
            }
            if (lines.length) {
              chrome(lines.join(""), {
                fill: "none",
                stroke: opts.stroke ?? theme.grid ?? "rgba(128,128,128,0.22)",
                strokeWidth: opts.strokeWidth ?? 1,
                // Dense lines read as texture; keep them behind the data.
                opacity: opts.opacity ?? 0.55
              }, "ground-grid")
            }
          }
        }

        const slab = (s: Slab, fallback: string, opacity: number, part = "region") => {
          const explicit = s.region.fill != null
          const fill = s.region.fill ?? fallback
          const shape = prism(frame, s.box, s.base, s.top)
          for (const face of shape.faces) {
            chrome(face.pathD, {
              fill: shadeColor(fill, face.shade),
              fillOpacity: explicit ? 1 : Math.min(1, opacity * 2.2),
              stroke: "none"
            }, `${part}-face`)
          }
          const top = polygonPath(shape.up)
          chrome(top, { fill, fillOpacity: explicit ? 1 : opacity, stroke: "none" }, `${part}-top`)
          chrome(top, {
            fill: "none",
            stroke: s.region.stroke ?? (explicit ? shadeColor(fill, 0.25) : fallback),
            strokeWidth: 1,
            opacity: explicit ? 1 : 0.6
          }, `${part}-outline`)
          return shape.up
        }
        if (plate) slab(plate, theme.textSecondary ?? "rgb(128,128,128)", 0.08, "plate")
        for (const s of [...slabs].sort((p, q) => p.top - q.top)) {
          const top = slab(s, theme.primary ?? "#4e79a7", 0.14)
          if (!s.region.label) continue
          // Along the back edge (smallest screen y), inset toward the plate.
          let i = 0
          for (let k = 1; k < 4; k++) {
            if (top[k][1] + top[(k + 1) % 4][1] < top[i][1] + top[(i + 1) % 4][1]) i = k
          }
          let p = top[i]
          let q = top[(i + 1) % 4]
          const angle = readableAngle(q[0] - p[0], q[1] - p[1])
          if (Math.cos(angle) * (q[0] - p[0]) + Math.sin(angle) * (q[1] - p[1]) < 0) [p, q] = [q, p]
          const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1
          const ux = (q[0] - p[0]) / len
          const uy = (q[1] - p[1]) / len
          const cx = (top[0][0] + top[2][0]) / 2
          const cy = (top[0][1] + top[2][1]) / 2
          const flip = -uy * (cx - p[0]) + ux * (cy - p[1]) < 0 ? -1 : 1
          const nx = -uy * flip
          const ny = ux * flip
          const size = 12
          // Glyphs rise along (sin a, -cos a); keep them on the plate.
          const inset = Math.sin(angle) * nx - Math.cos(angle) * ny < 0 ? size + 8 : 8
          labels.push({
            x: p[0] + ux * 12 + nx * inset,
            y: p[1] + uy * 12 + ny * inset,
            text: s.region.label,
            anchor: "start",
            baseline: "auto",
            fontSize: size,
            fontWeight: 700,
            fill: s.region.labelColor ?? s.region.stroke ?? theme.text,
            rotate: angle
          })
        }
        return { edges, labels }
      }
    }
  },

  extrude(item, frame) {
    const n = item.node as NetworkRectNode
    const shape = prism(frame, item.box, item.z, item.z + item.h)
    const pathD = polygonPath(shape.up)
    const all = [...shape.up, ...shape.down]
    const xs = all.map((p) => p[0])
    const ys = all.map((p) => p[1])
    const x0 = getMin(xs)
    const y0 = getMin(ys)
    const hitD = pathD + shape.faces.map((f) => f.pathD).join("")
    return {
      ...n,
      x: x0,
      y: y0,
      w: Math.max(1e-3, getMax(xs) - x0),
      h: Math.max(1e-3, getMax(ys) - y0),
      pathD,
      faces: shape.faces.length ? shape.faces : undefined,
      _hitPath: { pathD: hitD, transform: [0, 0, 1, 1], fill: true, strokeWidth: 0 }
    }
  },

  sort(items, frame) {
    const depth = (i: PerspectiveNodeItem) => frame.depth(i.gx, i.gy, i.z)
    const cmp = (p: PerspectiveNodeItem, q: PerspectiveNodeItem) => depth(p) - depth(q) || p.index - q.index
    if (items.length > 600) return [...items].sort(cmp)
    // Separating-axis order for axis-aligned footprints: along a ground axis,
    // the box on the side the depth gradient points to is nearer.
    const gx = frame.matrix[1]
    const gy = frame.matrix[3]
    const boxOf = (i: PerspectiveNodeItem): Rect4 => (i.mode === "extrude" ? i.box : [i.gx, i.gy, i.gx, i.gy])
    const n = items.length
    const next: number[][] = items.map(() => [])
    const indegree = new Array<number>(n).fill(0)
    const side = (g: number, before: boolean) => (g > 0 ? (before ? -1 : 1) : g < 0 ? (before ? 1 : -1) : 0)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const A = boxOf(items[i])
        const B = boxOf(items[j])
        let order =
          A[2] <= B[0] + 1e-6 ? side(gx, true)
            : B[2] <= A[0] + 1e-6 ? side(gx, false)
              : A[3] <= B[1] + 1e-6 ? side(gy, true)
                : B[3] <= A[1] + 1e-6 ? side(gy, false)
                  : 0
        if (!order) order = cmp(items[i], items[j]) <= 0 ? -1 : 1
        const [from, to] = order < 0 ? [i, j] : [j, i]
        next[from].push(to)
        indegree[to]++
      }
    }
    const ready = items.map((_, i) => i).filter((i) => indegree[i] === 0)
    const out: PerspectiveNodeItem[] = []
    while (ready.length) {
      ready.sort((p, q) => cmp(items[q], items[p]))
      const i = ready.pop()!
      out.push(items[i])
      for (const j of next[i]) if (--indegree[j] === 0) ready.push(j)
    }
    return out.length === n ? out : [...items].sort(cmp)
  },

  route(edge, rounded, map) {
    const { x1, y1, x2, y2, ...rest } = edge
    const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1)
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const pts: Array<[number, number]> = horizontal
      ? [[x1, y1], [mx, y1], [mx, y2], [x2, y2]]
      : [[x1, y1], [x1, my], [x2, my], [x2, y2]]
    // Parameter t along the route, for interpolating endpoint elevation.
    const total = pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0) || 1
    const segs: NormalizedPathSegment[] = [{ c: "M", p: [x1, y1] }]
    let travelled = 0
    const at = new Map<string, number>([[`${x1}|${y1}`, 0]])
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1]
      const [cx, cy] = pts[i]
      travelled += Math.hypot(cx - px, cy - py)
      at.set(`${cx}|${cy}`, travelled / total)
      const nextPt = pts[i + 1]
      if (!rounded || !nextPt) {
        segs.push({ c: "L", p: [cx, cy] })
        continue
      }
      const inLen = Math.hypot(cx - px, cy - py)
      const outLen = Math.hypot(nextPt[0] - cx, nextPt[1] - cy)
      const r = Math.min(10, inLen / 2, outLen / 2)
      if (r < 0.5) {
        segs.push({ c: "L", p: [cx, cy] })
        continue
      }
      const ax = cx - ((cx - px) / inLen) * r
      const ay = cy - ((cy - py) / inLen) * r
      const bx = cx + ((nextPt[0] - cx) / outLen) * r
      const by = cy + ((nextPt[1] - cy) / outLen) * r
      segs.push({ c: "L", p: [ax, ay] }, { c: "Q", p: [cx, cy, bx, by] })
    }
    // Points off the corner list (rounded tangents) take the corner's t.
    const tOf = (x: number, y: number) => {
      const exact = at.get(`${x}|${y}`)
      if (exact != null) return exact
      let best = 0
      let bestDist = Infinity
      for (const p of pts) {
        const dist = Math.hypot(p[0] - x, p[1] - y)
        if (dist < bestDist) {
          bestDist = dist
          best = at.get(`${p[0]}|${p[1]}`) ?? 0
        }
      }
      return best
    }
    return {
      ...rest,
      type: "curved",
      pathD: serializeSvgPath(segs, (x, y) => map(x, y, tOf(x, y))),
      style: { ...edge.style, fill: "none" }
    }
  }
}
