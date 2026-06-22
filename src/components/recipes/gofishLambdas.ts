import type { Datum } from "../charts/shared/datumTypes"
import { getMax } from "../charts/shared/minMax"

/**
 * GoFish escape-hatch lambda registry.
 *
 * GoFish's serialized IR cannot carry function bodies, so `derive` (a
 * `(rows) => rows'` data transform) and `mark-fn` (a `(datum) => drawing`
 * custom glyph) travel as a `lambdaId` that the host resolves through a
 * bridge. This module is that bridge for the Semiotic interpreter: register a
 * function under the id the IR references and `interpretGofishIR` will call it
 * where the grammar genuinely can't reach.
 *
 * This is the *only* sanctioned non-grammar path. A spec that resolves to pure
 * operators + marks needs no lambdas; one that reaches a `derive`/`mark-fn`
 * names the computation here.
 */

export interface DeriveLambda {
  kind: "derive"
  /** Transform the in-scope rows — add columns, or emit new rows. */
  fn: (rows: Datum[]) => Datum[]
}

export interface MarkFnLambda {
  kind: "mark-fn"
  /**
   * Draw a bespoke glyph for one datum inside its allocated unit frame
   * (coordinates in [0,1], mapped to pixels by the interpreter). Returns
   * primitive marks the interpreter splices into the scene.
   */
  fn: (datum: Datum, frame: { x: number; y: number; w: number; h: number }) => GofishLambdaPrimitive[]
}

export type GofishLambda = DeriveLambda | MarkFnLambda

/** A primitive a `mark-fn` may emit (unit coords). Mirrors the glyph vocabulary. */
export type GofishLambdaPrimitive =
  | { kind: "polygon"; points: Array<[number, number]>; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { kind: "circle"; x: number; y: number; r: number; fill?: string; stroke?: string; opacity?: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; opacity?: number; rotate?: number }
  | { kind: "text"; x: number; y: number; text: string; fill?: string; fontSize?: number }

const registry = new Map<string, GofishLambda>()

/** Register a `derive`/`mark-fn` implementation under the id the IR references. */
export function registerGofishLambda(id: string, lambda: GofishLambda): () => void {
  registry.set(id, lambda)
  return () => {
    if (registry.get(id) === lambda) registry.delete(id)
  }
}

export function unregisterGofishLambda(id: string): void {
  registry.delete(id)
}

export function getGofishLambda(id: string): GofishLambda | undefined {
  return registry.get(id)
}

/** Merge a per-call lambda map over the module registry (per-call wins). */
export function resolveLambda(
  id: string,
  perCall?: Record<string, GofishLambda>
): GofishLambda | undefined {
  return perCall?.[id] ?? registry.get(id)
}

// ── Built-in: bobaGeometry ───────────────────────────────────────────────
//
// The one escape hatch the boba cup needs: the genuinely non-grammar math
// (frustum volume → drink height, tapioca/ice packing). Tea + tapioca + ice
// volumes plus the cup-size parameters add up to a total volume, which a
// frustum-inverse solve turns into a drink height; pearls pack at the bottom
// and ice floats at the surface. It emits a per-cup `_g` block of geometry in
// unit coords PLUS a shared `_g.box` ([bw, bh]) so an aspect-preserving unit
// fit (`coord.fit: "uniform"`) draws each cup undistorted. The normalization is
// shared across every cup in the menu and bottom-aligned, so a row of cups
// sits on one shelf with their straws aligned at the top — taller cups simply
// reach higher. Derived from Krist Wongsuphasawat's "Boba Science" notebook.

const INCH_TO_CM = 2.54
const ICE_WIDTH = 1.75
const STRAW_HEIGHT_CM = 8 * INCH_TO_CM
const STRAW_RADIUS_CM = 0.25 * INCH_TO_CM
const CUP_OVERHANG_CM = 0.9 // lid/rim overhang past the cup's top radius
const TEA_FILL = "#D2B799"
const PEARL_FILL = "#222222"
const ICE_FILL = "#a5f2f3"
const STRAW_FILL = "#4F91CB"
const CUP_STROKE = "#222222"

interface Cup {
  height: number
  topRadius: number
  bottomRadius: number
}

export interface BobaCellGeometry {
  cup: Array<[number, number]>
  tea: Array<[number, number]> | null
  straw: Array<[number, number]> | null
  /** Thick rim/lid bar across the cup top. */
  lid: { x1: number; x2: number; y: number }
  pearls: Array<{ x: number; y: number; r: number; fill: string }>
  ice: Array<{ x: number; y: number; w: number; rot: number; fill: string }>
  /** Content box `[bw, bh]` for the `uniform` unit fit; shared across the menu. */
  box: [number, number]
  numBobas: number
  numIce: number
  teaVolume: number
  bobaVolume: number
  iceVolume: number
  totalVolume: number
  cupStroke: string
}

/** cm-space geometry for one cup (cup centered on x=0; y grows down, 0 = rim). */
interface BobaCm {
  cupHeight: number
  halfWidth: number
  cup: Array<[number, number]>
  tea: Array<[number, number]> | null
  straw: Array<[number, number]> | null
  lid: { x1: number; x2: number; y: number }
  pearls: Array<{ x: number; z: number; r: number }>
  ice: Array<{ cx: number; cy: number; w: number; rot: number }>
  numBobas: number
  numIce: number
  teaVolume: number
  bobaVolume: number
  iceVolume: number
  totalVolume: number
}

function frustumVolume(r1: number, r2: number, h: number): number {
  return (Math.PI * h) / 3 * (r1 * r1 + r1 * r2 + r2 * r2)
}
function radiusAtDrinkHeight(cup: Cup, h: number): number {
  return cup.topRadius + ((h - cup.height) / cup.height) * (cup.topRadius - cup.bottomRadius)
}
function volumeFromDrinkHeight(cup: Cup, h: number): number {
  return frustumVolume(radiusAtDrinkHeight(cup, h), cup.bottomRadius, h)
}
function drinkHeightFromVolume(cup: Cup, v: number): number {
  const r = (cup.topRadius + cup.bottomRadius) / 2
  const area = Math.PI * r * r
  let estimate = v / area
  let diff = v - volumeFromDrinkHeight(cup, estimate)
  let counter = 0
  while (counter < 100 && Math.abs(diff) > 0.0001) {
    estimate += diff / area
    diff = v - volumeFromDrinkHeight(cup, estimate)
    counter++
  }
  return estimate
}
function jitter(i: number, amount: number): number {
  const f = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return (f - Math.floor(f) - 0.5) * 2 * amount
}
function placeCirclesInside(rLarge: number, rSmall: number): Array<{ x: number; y: number }> {
  if (rSmall > rLarge || rLarge < 2 * rSmall) return [{ x: 0, y: 0 }]
  const circles: Array<{ x: number; y: number }> = []
  const make = (rc: number): void => {
    let no = Math.floor((2 * Math.PI * rc) / (2 * rSmall))
    if (no < 1) no = 1
    const dist = Math.hypot(rc - rc * Math.cos((2 * Math.PI) / no), -rc * Math.sin((2 * Math.PI) / no))
    if (dist < 2 * rSmall && no > 1) no--
    for (let i = 0; i < no; i++) {
      circles.push({ x: rc * Math.cos((i * 2 * Math.PI) / no), y: rc * Math.sin((i * 2 * Math.PI) / no) })
    }
    const rcNext = rc - 2 * rSmall
    if (rcNext >= rSmall) make(rcNext)
    else if (rc > 2 * rSmall) circles.push({ x: 0, y: 0 })
  }
  make(rLarge - rSmall)
  return circles
}

function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Solve one cup's frustum/packing math, returning cm-space geometry. */
function computeBobaCm(row: Datum): BobaCm {
  const cup: Cup = {
    height: num(row.cupHeight, 15.5),
    topRadius: num(row.cupTopRadius, 4.75),
    bottomRadius: num(row.cupBottomRadius, 3.75),
  }
  const bobaRadius = num(row.bobaRadius, 0.6)
  const teaVolume = Math.max(0, num(row.teaVolume, 450))
  const bobaVolume = Math.max(0, num(row.bobaVolume, 110))
  const iceVolume = Math.max(0, num(row.iceVolume, 135))

  const bobaBallVolume = Math.PI * bobaRadius * bobaRadius
  const numBobas = Math.floor(bobaVolume / bobaBallVolume)
  const realBobaVolume = numBobas * bobaBallVolume
  const numIce = Math.floor(iceVolume / (ICE_WIDTH * ICE_WIDTH * ICE_WIDTH))
  const realIceVolume = numIce * ICE_WIDTH * ICE_WIDTH * ICE_WIDTH
  // Drink height fills to tea + tapioca + ice, capped at the cup.
  const totalVolume = teaVolume + realBobaVolume + realIceVolume
  const drinkHeight = Math.min(cup.height, Math.max(0, drinkHeightFromVolume(cup, totalVolume)))
  const drinkRadius = radiusAtDrinkHeight(cup, drinkHeight)

  // Pearl layers (cm; origin cup-top-center, y down → pearl z = height - h).
  const pearls: Array<{ x: number; z: number; r: number }> = []
  let remaining = numBobas
  let layer = 0
  while (remaining > 0 && layer < 60) {
    const h = bobaRadius * (1 + 2 * layer)
    const ring = placeCirclesInside(radiusAtDrinkHeight(cup, h), bobaRadius)
    const diff = ring.length - remaining
    const chosen = diff > 1 ? ring.slice(Math.floor(diff / 2), Math.floor(diff / 2) + remaining) : ring
    const z = cup.height - h
    chosen.forEach((p, i) =>
      pearls.push({ x: p.x + jitter(layer * 97 + i, 0.15), z: z + jitter(layer * 31 + i, 0.05), r: bobaRadius })
    )
    remaining -= chosen.length
    layer++
    if (chosen.length === 0) break
  }
  const bobaHeight = layer * bobaRadius * 2

  // Ice layers (cm) floating just under the drink surface.
  const ice: Array<{ cx: number; cy: number; w: number; rot: number }> = []
  if (numIce > 0) {
    let iceLayers = 0
    let rem = numIce
    while (rem > 0 && iceLayers < 60) {
      const h = bobaHeight + (ICE_WIDTH / 2) * (1 + 2 * iceLayers)
      const per = Math.max(1, Math.floor((2 * radiusAtDrinkHeight(cup, h)) / ICE_WIDTH))
      rem -= per
      iceLayers++
    }
    const iceHeight = iceLayers * ICE_WIDTH
    const iceStartY = Math.max(bobaHeight, drinkHeight - iceHeight) + ICE_WIDTH / 2
    let placed = 0
    for (let i = 0; i < iceLayers && placed < numIce; i++) {
      const h = iceStartY + ICE_WIDTH * i
      const r = radiusAtDrinkHeight(cup, h)
      const per = Math.max(1, Math.floor((2 * r) / ICE_WIDTH))
      const gap = (2 * r - per * ICE_WIDTH) / (per + 1)
      const startX = -r + gap
      const yTop = cup.height - h - ICE_WIDTH / 2 - 0.1
      for (let j = 0; j < per && placed < numIce; j++) {
        ice.push({ cx: startX + (gap + ICE_WIDTH) * j + ICE_WIDTH / 2, cy: yTop + ICE_WIDTH / 2, w: ICE_WIDTH * 0.95, rot: jitter(i * 53 + j, 10) })
        placed++
      }
    }
  }

  const H = cup.height
  const strawTop = cup.height - STRAW_HEIGHT_CM
  const teaY = H - drinkHeight
  return {
    cupHeight: H,
    halfWidth: cup.topRadius + CUP_OVERHANG_CM,
    cup: [
      [-cup.topRadius, 0],
      [-cup.bottomRadius, H],
      [cup.bottomRadius, H],
      [cup.topRadius, 0],
    ],
    tea: teaVolume > 0
      ? [
          [-drinkRadius, teaY],
          [-cup.bottomRadius, H],
          [cup.bottomRadius, H],
          [drinkRadius, teaY],
        ]
      : null,
    straw: [
      [-STRAW_RADIUS_CM, strawTop],
      [-STRAW_RADIUS_CM, H - 0.4],
      [STRAW_RADIUS_CM, H - STRAW_RADIUS_CM * 2 - 0.4],
      [STRAW_RADIUS_CM, strawTop],
    ],
    lid: { x1: -(cup.topRadius + CUP_OVERHANG_CM), x2: cup.topRadius + CUP_OVERHANG_CM, y: 0 },
    pearls,
    ice,
    numBobas,
    numIce,
    teaVolume: Math.round(teaVolume),
    bobaVolume: Math.round(realBobaVolume),
    iceVolume: Math.round(realIceVolume),
    totalVolume: Math.round(totalVolume),
  }
}

interface BobaShared {
  ref: number
  halfWidth: number
  topExtent: number
}

/**
 * Project one cup's cm geometry into unit coords against a shared normalization
 * so every cup in the menu uses one scale and one bottom baseline. `ref` is the
 * largest dimension across the menu, so `max(bw, bh) === 1`. y is measured up
 * from the shared shelf, so cup bottoms align and straws share a top line.
 */
function normalizeBobaCell(cm: BobaCm, shared: BobaShared): BobaCellGeometry {
  const { ref, halfWidth, topExtent } = shared
  const boxW = (2 * halfWidth) / ref
  const boxH = topExtent / ref
  const ux = (xcm: number): number => (xcm + halfWidth) / ref
  const uy = (ycm: number): number => boxH - (cm.cupHeight - ycm) / ref
  const ur = (rcm: number): number => rcm / ref
  const pt = (p: [number, number]): [number, number] => [ux(p[0]), uy(p[1])]
  return {
    cup: cm.cup.map(pt),
    tea: cm.tea ? cm.tea.map(pt) : null,
    straw: cm.straw ? cm.straw.map(pt) : null,
    lid: { x1: ux(cm.lid.x1), x2: ux(cm.lid.x2), y: uy(cm.lid.y) },
    pearls: cm.pearls.map((p) => ({ x: ux(p.x), y: uy(p.z), r: ur(p.r), fill: PEARL_FILL })),
    ice: cm.ice.map((p) => ({ x: ux(p.cx), y: uy(p.cy), w: ur(p.w), rot: p.rot, fill: ICE_FILL })),
    box: [boxW, boxH],
    numBobas: cm.numBobas,
    numIce: cm.numIce,
    teaVolume: cm.teaVolume,
    bobaVolume: cm.bobaVolume,
    iceVolume: cm.iceVolume,
    totalVolume: cm.totalVolume,
    cupStroke: CUP_STROKE,
  }
}

/** Shared normalization across a menu of cups (or one cup, standalone). */
function bobaShared(cms: BobaCm[]): BobaShared {
  const halfWidth = getMax(cms.map((c) => c.halfWidth), 1)
  const topExtent = getMax(cms.map((c) => Math.max(c.cupHeight, STRAW_HEIGHT_CM)), 1)
  return { halfWidth, topExtent, ref: Math.max(2 * halfWidth, topExtent) }
}

/** Single-cup convenience (normalizes against itself). */
export function computeBobaCellGeometry(row: Datum): BobaCellGeometry {
  const cm = computeBobaCm(row)
  return normalizeBobaCell(cm, bobaShared([cm]))
}

/**
 * The built-in `bobaGeometry` derive: solve every cup, then attach `_g`
 * (geometry against the shared menu-wide normalization) plus the fixed fills
 * the marks read.
 */
export const bobaGeometryLambda: DeriveLambda = {
  kind: "derive",
  fn: (rows) => {
    const cms = rows.map(computeBobaCm)
    const shared = bobaShared(cms)
    return rows.map((row, i) => ({
      ...row,
      _g: normalizeBobaCell(cms[i], shared),
      teaFill: TEA_FILL,
      strawFill: STRAW_FILL,
      cupStroke: CUP_STROKE,
      lidFill: CUP_STROKE,
    }))
  },
}

registerGofishLambda("bobaGeometry", bobaGeometryLambda)

// ── Built-in: bottleGeometry ────────────────────────────────────────────────
//
// A pictorial bottle: an SVG bottle silhouette (as a self-contained data-URI
// image), a green fill clipped to that silhouette to a height encoding
// `amount`, a fill line, a percentage label, and a category label. Emits
// NORMALIZED geometry ([0,1] within the slot) under `_b`; the marks render it.
// Demonstrates the reusable `image` + `clipPath` glyph primitives.

const BOTTLE_SILHOUETTE: Array<[number, number]> = [
  [0.43, 0.04],
  [0.57, 0.04],
  [0.57, 0.2],
  [0.8, 0.34],
  [0.8, 0.82],
  [0.72, 0.9],
  [0.28, 0.9],
  [0.2, 0.82],
  [0.2, 0.34],
  [0.43, 0.2],
]

/** A self-contained bottle SVG (glass fill + outline) as a data URI. */
function bottleSvgDataUri(): string {
  const d =
    "M" +
    BOTTLE_SILHOUETTE.map((p) => `${(p[0] * 100).toFixed(1)},${(p[1] * 100).toFixed(1)}`).join(" L") +
    " Z"
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>` +
    `<path d='${d}' fill='rgba(150,180,195,0.30)' stroke='#6b7e88' stroke-width='2.4' stroke-linejoin='round'/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export interface BottleCellGeometry {
  silhouette: Array<[number, number]>
  imageHref: string
  fill: { x: number; y: number; w: number; h: number }
  fillLine: { x1: number; x2: number; y: number }
  pct: { x: number; y: number; text: string }
  label: { x: number; y: number; text: string }
  fillFill: string
}

export function computeBottleCellGeometry(row: Datum): BottleCellGeometry {
  const amount = Math.max(0, Math.min(100, num(row.amount, 50)))
  const fillTopY = 0.9 - (amount / 100) * 0.8 // liquid surface, unit y (down)
  return {
    silhouette: BOTTLE_SILHOUETTE,
    imageHref: bottleSvgDataUri(),
    fill: { x: 0, y: fillTopY, w: 1, h: 1 - fillTopY },
    fillLine: { x1: 0.12, x2: 0.96, y: fillTopY },
    pct: { x: 0.84, y: fillTopY, text: `${Math.round(amount)}%` },
    label: { x: 0.5, y: 0.975, text: String(row.category ?? "") },
    fillFill: "#20bf55",
  }
}

/** The built-in `bottleGeometry` derive: attach `_b` (normalized geometry) per bottle. */
export const bottleGeometryLambda: DeriveLambda = {
  kind: "derive",
  fn: (rows) => rows.map((row) => ({ ...row, _b: computeBottleCellGeometry(row) })),
}

registerGofishLambda("bottleGeometry", bottleGeometryLambda)
