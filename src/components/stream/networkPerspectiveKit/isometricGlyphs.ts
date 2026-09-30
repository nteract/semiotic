/**
 * Isometric pictograms as `GlyphDef`s for perspective network charts.
 *
 * Faces paint with the node's color, lit and shaded by translucent white and
 * black overlays (lighter tops, darker right faces), so one definition follows
 * `colorBy`, themes and selection dimming. Each glyph's anchor is its ground contact point,
 * so it stands on the projected node position. Builders take an optional
 * `ratio` (depth-axis ratio: 0.577 true isometric, 0.5 for `"pixel"`).
 */
import type { GlyphDef, GlyphPart } from "../glyphDef"

export interface IsoGlyphOptions {
  /** Depth-axis ratio of the ground diamond. @default tan(30°) (true isometric) */
  ratio?: number
}

type Pt = [number, number]
/** A glyph paint, or a lit/shaded variant of the node color. */
type Paint = GlyphPart["fill"] | "tint" | "shade" | "deep-shade"

// Overlays that light (white) or shade (black) the node color.
const OVERLAYS: Record<string, [string, number]> = {
  tint: ["#fff", 0.32],
  shade: ["#000", 0.22],
  "deep-shade": ["#000", 0.42]
}

interface Shape {
  polys: Pt[][]
  fill: Paint
  /** Seam-hiding outline in the fill's paint unless set. */
  stroke?: Paint
  strokeWidth?: number
  opacity?: number
  open?: boolean
}

const TAN30 = Math.tan(Math.PI / 6)
const round = (v: number) => Math.round(v * 100) / 100

function projector(ratio = TAN30) {
  const a = Math.atan(Math.max(0.05, ratio))
  const c = Math.cos(a)
  const s = Math.sin(a)
  return (x: number, y: number, z = 0): Pt => [c * (x - y), s * (x + y) - z]
}

function ring(cx: number, cy: number, r: number, from = 0, to = Math.PI * 2, steps = 24): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = from + ((to - from) * i) / steps
    out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)])
  }
  return out
}

/** Assemble shapes into a GlyphDef whose anchor is the local origin. */
function glyph(shapes: Shape[], pad = 1): GlyphDef {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const shape of shapes) for (const poly of shape.polys) for (const [x, y] of poly) {
    x0 = Math.min(x0, x, 0); y0 = Math.min(y0, y, 0)
    x1 = Math.max(x1, x, 0); y1 = Math.max(y1, y, 0)
  }
  const ox = pad - x0
  const oy = pad - y0
  const w = x1 - x0 + pad * 2
  const h = y1 - y0 + pad * 2
  const parts: GlyphPart[] = []
  for (const shape of shapes) {
    const d = shape.polys
      .map((poly) => "M" + poly.map(([x, y]) => `${round(x + ox)} ${round(y + oy)}`).join("L") + (shape.open ? "" : "Z"))
      .join("")
    const overlay = typeof shape.fill === "string" ? OVERLAYS[shape.fill] : undefined
    const base = overlay ? "color" : shape.fill
    // Seams between faces vanish under a hairline in the face's own paint.
    const stroke = shape.stroke === "none" ? "none" : shape.open ? base : (shape.stroke ?? base)
    const width = shape.strokeWidth ?? (shape.open ? 1 : 0.6)
    parts.push({
      d,
      fill: shape.open ? "none" : base,
      stroke,
      strokeWidth: width,
      strokeLinejoin: "round",
      strokeLinecap: "round",
      opacity: shape.opacity
    })
    if (overlay) {
      parts.push({
        d,
        fill: shape.open ? "none" : overlay[0],
        stroke: stroke === "none" ? "none" : overlay[0],
        strokeWidth: width,
        strokeLinejoin: "round",
        strokeLinecap: "round",
        opacity: overlay[1] * (shape.opacity ?? 1)
      })
    }
  }
  return { viewBox: [round(w), round(h)], anchor: [ox / w, oy / h], parts }
}

function boxFaces(P: ReturnType<typeof projector>, hw: number, hd: number, z0: number, z1: number): Shape[] {
  return [
    { polys: [[P(-hw, hd, z0), P(hw, hd, z0), P(hw, hd, z1), P(-hw, hd, z1)]], fill: "color" },
    { polys: [[P(hw, -hd, z0), P(hw, hd, z0), P(hw, hd, z1), P(hw, -hd, z1)]], fill: "shade" },
    { polys: [[P(-hw, -hd, z1), P(hw, -hd, z1), P(hw, hd, z1), P(-hw, hd, z1)]], fill: "tint" }
  ]
}

/** A rectangular block. */
export function isoBox({ width = 16, depth = 16, height = 16, ratio }: IsoGlyphOptions & { width?: number; depth?: number; height?: number } = {}): GlyphDef {
  return glyph(boxFaces(projector(ratio), width / 2, depth / 2, 0, height))
}

/** A flat ground tile (a thin slab). */
export function isoTile({ width = 22, depth = 22, height = 3, ratio }: IsoGlyphOptions & { width?: number; depth?: number; height?: number } = {}): GlyphDef {
  return isoBox({ width, depth, height, ratio })
}

/** Stacked units with a slot on each — servers, racks, brokers. */
export function isoStack({ width = 18, depth = 18, units = 3, unitHeight = 7, gap = 1.6, ratio }: IsoGlyphOptions & { width?: number; depth?: number; units?: number; unitHeight?: number; gap?: number } = {}): GlyphDef {
  const P = projector(ratio)
  const hw = width / 2
  const hd = depth / 2
  const shapes: Shape[] = []
  for (let i = 0; i < Math.max(1, Math.round(units)); i++) {
    const z0 = i * (unitHeight + gap)
    const mid = z0 + unitHeight / 2
    shapes.push(
      ...boxFaces(P, hw, hd, z0, z0 + unitHeight),
      { polys: [[P(-hw * 0.7, hd, mid), P(hw * 0.05, hd, mid)]], fill: "deep-shade", open: true, strokeWidth: 1.4 },
      { polys: [[P(hw * 0.45, hd, mid), P(hw * 0.6, hd, mid)]], fill: "tint", open: true, strokeWidth: 1.6 }
    )
  }
  return glyph(shapes)
}

/** A cylinder; `bands` draws database rings around the body. */
export function isoCylinder({ radius = 9, height = 14, bands = 0, ratio }: IsoGlyphOptions & { radius?: number; height?: number; bands?: number } = {}): GlyphDef {
  const P = projector(ratio)
  const at = (t: number, z: number) => P(radius * Math.cos(t), radius * Math.sin(t), z)
  // Silhouette extremes sit where the ground circle meets the screen x axis.
  const arc = (from: number, to: number, z: number, steps = 12) => {
    const out: Pt[] = []
    for (let i = 0; i <= steps; i++) out.push(at(from + ((to - from) * i) / steps, z))
    return out
  }
  const left = (Math.PI * 3) / 4
  const front = Math.PI / 4
  const right = -Math.PI / 4
  const side = (a: number, b: number, fill: Paint): Shape => ({
    polys: [[...arc(a, b, 0), ...arc(b, a, height)]],
    fill
  })
  const shapes: Shape[] = [
    side(left, front, "color"),
    side(front, right, "shade"),
    { polys: [arc(0, Math.PI * 2, height, 32)], fill: "tint" }
  ]
  for (let i = 1; i <= bands; i++) {
    shapes.push({ polys: [arc(left, right, (height * i) / (bands + 1), 16)], fill: "deep-shade", open: true, strokeWidth: 1 })
  }
  return glyph(shapes)
}

/** A puffy cloud standing on the ground. */
export function isoCloud({ width = 30 }: { width?: number } = {}): GlyphDef {
  const k = width / 30
  const puffs: Array<[number, number, number]> = [[-9, -7.5, 7], [1, -11, 9], [10, -7, 6.5]]
  const body = (dy: number): Pt[][] => [
    ...puffs.map(([x, y, r]) => ring(x * k, (y + dy) * k, r * k)),
    [[-15 * k, (-7 + dy) * k], [15 * k, (-7 + dy) * k], [15 * k, dy * k], [-15 * k, dy * k]]
  ]
  return glyph([
    { polys: body(0), fill: "shade", stroke: "none" },
    { polys: body(-3), fill: "tint", stroke: "none" }
  ])
}

/** A map pin whose tip marks the node's ground point. */
export function isoPin({ radius = 6, height = 16, ratio }: IsoGlyphOptions & { radius?: number; height?: number } = {}): GlyphDef {
  const P = projector(ratio)
  const cy = -height
  const d = height
  const spread = Math.acos(Math.min(1, radius / d))
  const head = ring(0, cy, radius, Math.PI / 2 - spread, Math.PI / 2 + spread - Math.PI * 2, 20)
  const shadow: Pt[] = []
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * Math.PI * 2
    shadow.push(P(radius * 0.7 * Math.cos(t), radius * 0.7 * Math.sin(t)))
  }
  return glyph([
    { polys: [shadow], fill: "deep-shade", stroke: "none", opacity: 0.35 },
    { polys: [[[0, 0], ...head]], fill: "color" },
    { polys: [ring(0, cy, radius * 0.4)], fill: "tint", stroke: "none" }
  ])
}

/** Ready-made isometric pictograms (true 30° isometric). */
export const isometricGlyphs = {
  box: isoBox(),
  server: isoStack(),
  database: isoCylinder({ bands: 2 }),
  cylinder: isoCylinder(),
  tile: isoTile(),
  cloud: isoCloud(),
  pin: isoPin()
} as const satisfies Record<string, GlyphDef>

export type IsometricGlyphName = keyof typeof isometricGlyphs
