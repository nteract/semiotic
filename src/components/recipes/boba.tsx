import * as React from "react"
import type { ReactNode } from "react"
import type { OrdinalCustomLayout } from "../stream/ordinalCustomLayout"
import type { OrdinalSceneNode } from "../stream/ordinalTypes"
import type { RectSceneNode } from "../stream/types"
import type { Datum } from "../charts/shared/datumTypes"
import { resolveAccessor, datumFromFields, stableGlyphId } from "./recipeUtils"

/**
 * Boba (bubble tea) cup glyphs — an OrdinalCustomLayout, one cup per category.
 *
 * Derived from Krist Wongsuphasawat's "Boba Science" Observable notebook
 * (https://observablehq.com/@kristw/boba-science): each cup is a conical
 * frustum filled with tea to a drink height computed from total volume, with
 * tapioca pearls stacked at the bottom, ice cubes floating below the surface,
 * and a straw. The notebook's frustum-volume / drink-height / pearl-packing
 * math is ported here (deterministic — no `Math.random`, so SSR and
 * transitions are stable).
 *
 * Scene-node / overlay split, like the other custom-layout recipes: one
 * transparent hit-rect per cup carries the cup's datum (volumes, pearl/ice
 * counts) into the Semiotic scene graph for hover, selection, SSR evidence,
 * and transitions; the cup silhouette, tea, pearls, ice, lid, and straw are
 * pointer-events-none SVG overlays keyed by cup name.
 */

const INCH_TO_CM = 2.54
const ICE_WIDTH = 1.75
const STRAW_HEIGHT_CM = 8 * INCH_TO_CM
const STRAW_RADIUS_CM = 0.25 * INCH_TO_CM

const TEA_FILL = "#D2B799"
const PEARL_FILL = "#222222"
const ICE_FILL = "#a5f2f3"
const STRAW_FILL = "#4F91CB"
const CUP_STROKE = "#222222"

export interface BobaConfig {
  /** Category — one cup per distinct value. @default "name" */
  categoryAccessor?: string | ((d: Datum) => string)
  /** Tea volume (cm³). @default field "teaVolume" → 450 */
  teaVolumeAccessor?: string | ((d: Datum) => number)
  /** Tapioca-pearl volume (cm³); pearl count derived from it. @default field "bobaVolume" → 110 */
  bobaVolumeAccessor?: string | ((d: Datum) => number)
  /** Ice volume (cm³); cube count derived from it. @default field "iceVolume" → 135 */
  iceVolumeAccessor?: string | ((d: Datum) => number)
  /** Cup height (cm). @default field "cupHeight" → 15.5 */
  cupHeightAccessor?: string | ((d: Datum) => number)
  /** Cup top radius (cm). @default field "cupTopRadius" → 4.75 */
  cupTopRadiusAccessor?: string | ((d: Datum) => number)
  /** Cup bottom radius (cm). @default field "cupBottomRadius" → 3.75 */
  cupBottomRadiusAccessor?: string | ((d: Datum) => number)
  /** Pearl radius (cm). @default field "bobaRadius" → 0.6 */
  bobaRadiusAccessor?: string | ((d: Datum) => number)
  /** Fraction of each band the cup glyph may occupy. @default 0.82 */
  cupWidthRatio?: number
}

interface Cup {
  height: number
  topRadius: number
  bottomRadius: number
}

// ── Ported geometry from the notebook ───────────────────────────────────────

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

/** Deterministic ±amount jitter from an integer index (replaces Math.random). */
function jitter(i: number, amount: number): number {
  const f = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return ((f - Math.floor(f)) - 0.5) * 2 * amount
}

/**
 * Pack `rSmall`-radius circles inside an `rLarge`-radius disk in concentric
 * rings. Ported from the notebook's `Circle.placeCirclesInside`.
 */
function placeCirclesInside(rLarge: number, rSmall: number): Array<{ x: number; y: number }> {
  if (rSmall > rLarge || rLarge < 2 * rSmall) return [{ x: 0, y: 0 }]
  const circles: Array<{ x: number; y: number }> = []
  const make = (rc: number): void => {
    let no = Math.floor((2 * Math.PI * rc) / (2 * rSmall))
    if (no < 1) no = 1
    const x0 = rc * Math.cos(0)
    const y0 = rc * Math.sin(0)
    const x1 = rc * Math.cos((2 * Math.PI) / no)
    const y1 = rc * Math.sin((2 * Math.PI) / no)
    const dist = Math.hypot(x0 - x1, y0 - y1)
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

interface Pearl {
  x: number
  z: number
}

/** Stack pearls in layers at the bottom of the cup. Returns positions + layer count. */
function createBobaLayers(cup: Cup, bobaRadius: number, numBobas: number): { pearls: Pearl[]; layers: number } {
  const pearls: Pearl[] = []
  let remaining = numBobas
  let layer = 0
  while (remaining > 0 && layer < 60) {
    const h = bobaRadius * (1 + 2 * layer)
    const drinkRadius = radiusAtDrinkHeight(cup, h)
    const ring = placeCirclesInside(drinkRadius, bobaRadius)
    const diff = ring.length - remaining
    const chosen = diff > 1 ? ring.slice(Math.floor(diff / 2), Math.floor(diff / 2) + remaining) : ring
    const z = cup.height - h
    chosen.forEach((p, i) => {
      pearls.push({ x: p.x + jitter(layer * 97 + i, 0.15), z: z + jitter(layer * 31 + i, 0.05) })
    })
    remaining -= chosen.length
    layer++
    if (chosen.length === 0) break
  }
  return { pearls, layers: layer }
}

/** Number of stacked ice layers. Ported from `createIceLayers` (squares-per-row ≈ ⌊2r/w⌋). */
function countIceLayers(cup: Cup, bobaHeight: number, numIce: number): number {
  let remaining = numIce
  let layer = 0
  while (remaining > 0 && layer < 60) {
    const h = bobaHeight + (ICE_WIDTH / 2) * (1 + 2 * layer)
    const r = radiusAtDrinkHeight(cup, h)
    const per = Math.max(1, Math.floor((2 * r) / ICE_WIDTH))
    remaining -= per
    layer++
  }
  return layer
}

interface IcePiece {
  cx: number
  cy: number
  rotation: number
}

function createIcePieces(cup: Cup, bobaHeight: number, teaHeight: number, numIce: number): IcePiece[] {
  if (numIce <= 0) return []
  const numLayers = countIceLayers(cup, bobaHeight, numIce)
  const iceHeight = numLayers * ICE_WIDTH
  const iceStartY = Math.max(bobaHeight, teaHeight - iceHeight) + ICE_WIDTH / 2
  const pieces: IcePiece[] = []
  let placed = 0
  for (let i = 0; i < numLayers && placed < numIce; i++) {
    const h = iceStartY + ICE_WIDTH * i
    const r = radiusAtDrinkHeight(cup, h)
    const per = Math.max(1, Math.floor((2 * r) / ICE_WIDTH))
    const gap = (2 * r - per * ICE_WIDTH) / (per + 1)
    const startX = -r + gap
    const yTop = cup.height - h - ICE_WIDTH / 2 - 0.1
    for (let j = 0; j < per && placed < numIce; j++) {
      const xLeft = startX + (gap + ICE_WIDTH) * j
      pieces.push({
        cx: xLeft + ICE_WIDTH / 2,
        cy: yTop + ICE_WIDTH / 2,
        rotation: jitter(i * 53 + j, 10),
      })
      placed++
    }
  }
  return pieces
}

// ── Layout ───────────────────────────────────────────────────────────────

function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export const bobaLayout: OrdinalCustomLayout<BobaConfig> = (ctx) => {
  const cfg = ctx.config
  const { plot } = ctx.dimensions
  if (plot.width <= 0 || plot.height <= 0) return { nodes: [] }

  const getCategory = resolveAccessor<string>(cfg.categoryAccessor ?? "name")
  const getTea = resolveAccessor<number>(cfg.teaVolumeAccessor ?? "teaVolume")
  const getBoba = resolveAccessor<number>(cfg.bobaVolumeAccessor ?? "bobaVolume")
  const getIce = resolveAccessor<number>(cfg.iceVolumeAccessor ?? "iceVolume")
  const getCupH = resolveAccessor<number>(cfg.cupHeightAccessor ?? "cupHeight")
  const getTopR = resolveAccessor<number>(cfg.cupTopRadiusAccessor ?? "cupTopRadius")
  const getBotR = resolveAccessor<number>(cfg.cupBottomRadiusAccessor ?? "cupBottomRadius")
  const getBobaR = resolveAccessor<number>(cfg.bobaRadiusAccessor ?? "bobaRadius")
  const widthRatio = cfg.cupWidthRatio ?? 0.82

  const o = ctx.scales.o
  const bandW = o.bandwidth()
  const labelPad = 26
  const topPad = 8
  const availH = Math.max(1, plot.height - labelPad - topPad)
  const baseTop = plot.y + topPad

  const nodes: RectSceneNode[] = []
  const overlays: ReactNode[] = []

  for (const d of ctx.data) {
    const category = String(getCategory(d))
    const bandX = o(category)
    if (bandX == null) continue

    const cup: Cup = {
      height: num(getCupH(d), 15.5),
      topRadius: num(getTopR(d), 4.75),
      bottomRadius: num(getBotR(d), 3.75),
    }
    const bobaRadius = num(getBobaR(d), 0.6)
    const teaVolume = Math.max(0, num(getTea(d), 450))
    const bobaVolume = Math.max(0, num(getBoba(d), 110))
    const iceVolume = Math.max(0, num(getIce(d), 135))

    // Pearl / ice counts (the notebook's 2D area model for a pearl).
    const bobaBallVolume = Math.PI * bobaRadius * bobaRadius
    const numBobas = Math.floor(bobaVolume / bobaBallVolume)
    const realBobaVolume = numBobas * bobaBallVolume
    const numIce = Math.floor(iceVolume / (ICE_WIDTH * ICE_WIDTH * ICE_WIDTH))
    const realIceVolume = numIce * ICE_WIDTH * ICE_WIDTH * ICE_WIDTH
    const totalVolume = teaVolume + realBobaVolume + realIceVolume

    const rawDrinkHeight = drinkHeightFromVolume(cup, totalVolume)
    const drinkHeight = Math.min(cup.height, Math.max(0, rawDrinkHeight))
    const drinkRadius = radiusAtDrinkHeight(cup, drinkHeight)
    const { pearls, layers } = createBobaLayers(cup, bobaRadius, numBobas)
    const bobaHeight = layers * bobaRadius * 2
    const teaHeight = drinkHeight
    const ices = createIcePieces(cup, bobaHeight, teaHeight, numIce)

    // ── cm → px transform. Origin: cup-top-center. y grows downward; the
    // straw top (above the cup) sets the drawing's top edge. ──
    const strawTopCm = cup.height - STRAW_HEIGHT_CM
    const topCm = Math.min(0, strawTopCm)
    const spanCm = cup.height - topCm
    const widthCm = (cup.topRadius + 1) * 2
    const scale = Math.min((bandW * widthRatio) / widthCm, availH / spanCm)
    const centerX = bandX + bandW / 2
    const sx = (xcm: number) => centerX + xcm * scale
    const sy = (ycm: number) => baseTop + (ycm - topCm) * scale

    // Bounding box of the whole glyph → the data-bearing hit rect.
    const glyphLeft = sx(-(cup.topRadius + 1))
    const glyphRight = sx(cup.topRadius + 1)
    const glyphTop = sy(topCm)
    const glyphBottom = sy(cup.height)
    const datum = datumFromFields({
      name: category,
      teaVolume,
      bobaVolume: Math.round(realBobaVolume),
      iceVolume: Math.round(realIceVolume),
      totalVolume: Math.round(totalVolume),
      numBobas,
      numIce,
      kind: "boba cup",
    })

    nodes.push({
      type: "rect",
      x: glyphLeft,
      y: glyphTop,
      w: Math.max(1, glyphRight - glyphLeft),
      h: Math.max(1, glyphBottom - glyphTop),
      style: { fill: "rgba(0,0,0,0)", stroke: "none" },
      datum,
      group: category,
      _transitionKey: `boba-${stableGlyphId(category)}`,
    })

    const teaY = cup.height - teaHeight
    const id = stableGlyphId(category)
    const accent = ctx.resolveColor(category)
    overlays.push(
      <g key={`boba-${id}`}>
        {/* tea */}
        {teaVolume > 0 ? (
          <path
            d={`M${sx(-drinkRadius)},${sy(teaY)} L${sx(-cup.bottomRadius)},${sy(cup.height)} L${sx(cup.bottomRadius)},${sy(cup.height)} L${sx(drinkRadius)},${sy(teaY)} z`}
            fill={TEA_FILL}
          />
        ) : null}
        {/* pearls */}
        {pearls.map((p, i) => (
          <circle key={`p-${i}`} cx={sx(p.x)} cy={sy(p.z)} r={bobaRadius * scale} fill={PEARL_FILL} opacity={0.5} />
        ))}
        {/* ice */}
        {ices.map((ice, i) => (
          <rect
            key={`i-${i}`}
            x={sx(ice.cx) - (ICE_WIDTH * 0.95 * scale) / 2}
            y={sy(ice.cy) - (ICE_WIDTH * 0.95 * scale) / 2}
            width={ICE_WIDTH * 0.95 * scale}
            height={ICE_WIDTH * 0.95 * scale}
            rx={2}
            fill={ICE_FILL}
            opacity={0.85}
            transform={`rotate(${ice.rotation} ${sx(ice.cx)} ${sy(ice.cy)})`}
          />
        ))}
        {/* cup outline */}
        <path
          d={`M${sx(-cup.topRadius)},${sy(0)} L${sx(-cup.bottomRadius)},${sy(cup.height)} L${sx(cup.bottomRadius)},${sy(cup.height)} L${sx(cup.topRadius)},${sy(0)}`}
          fill="none"
          stroke={CUP_STROKE}
          strokeWidth={2.5}
        />
        {/* lid */}
        <line
          x1={sx(-(cup.topRadius + 1))}
          y1={sy(0)}
          x2={sx(cup.topRadius + 1)}
          y2={sy(0)}
          stroke={CUP_STROKE}
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* straw */}
        {teaVolume > 0 ? (
          <path
            d={`M${sx(-STRAW_RADIUS_CM)},${sy(strawTopCm)} L${sx(-STRAW_RADIUS_CM)},${sy(cup.height - 0.4)} L${sx(STRAW_RADIUS_CM)},${sy(cup.height - STRAW_RADIUS_CM * 2 - 0.4)} L${sx(STRAW_RADIUS_CM)},${sy(strawTopCm)} z`}
            fill={STRAW_FILL}
            stroke={CUP_STROKE}
            strokeWidth={1}
            opacity={0.78}
          />
        ) : null}
        {/* name + volume */}
        <text x={centerX} y={glyphBottom + 16} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--semiotic-text, #333)">
          {category}
        </text>
        <text x={centerX} y={glyphBottom + 30} textAnchor="middle" fontSize={10} fill={accent}>
          {`${numBobas} pearls · ${Math.round(totalVolume)} cm³`}
        </text>
      </g>
    )
  }

  return {
    nodes: nodes as OrdinalSceneNode[],
    overlays: (
      <g className="semiotic-boba" style={{ pointerEvents: "none" }}>
        {overlays}
      </g>
    ),
  }
}
