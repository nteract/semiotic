/**
 * Word Trails placement engine: glyph-box metrics, a spatial hash for the
 * collision search, and greedy largest-first placement under one global font
 * scale. Pure and deterministic; `wordTrailsLayout` caches its result.
 */
import { fnv1a32, hashUnit } from "../utils/hash"
import { clamp } from "./recipeUtils"

export const LINE_HEIGHT_RATIO = 1.15
/** Smallest rendered size after the global scale, px. */
const MIN_RENDER_FONT = 5
// Per-glyph advance widths (em) for a bold sans-serif — Helvetica/Arial Bold
// metrics, an upper bound for the 600-weight glyphs the recipe renders in
// system-ui/Inter. Words keep their authored case, so capitals and digits
// have their own widths; other glyphs take a wide default, and CJK /
// fullwidth / emoji a full em. A small safety factor covers font drift.
const CHAR_EM: Record<string, number> = {
  a: 0.556, b: 0.611, c: 0.556, d: 0.611, e: 0.556, f: 0.333, g: 0.611,
  h: 0.611, i: 0.278, j: 0.278, k: 0.556, l: 0.278, m: 0.889, n: 0.611,
  o: 0.611, p: 0.611, q: 0.611, r: 0.389, s: 0.556, t: 0.333, u: 0.611,
  v: 0.556, w: 0.778, x: 0.556, y: 0.556, z: 0.5,
  A: 0.722, B: 0.722, C: 0.722, D: 0.722, E: 0.667, F: 0.611, G: 0.778,
  H: 0.722, I: 0.278, J: 0.556, K: 0.722, L: 0.611, M: 0.833, N: 0.722,
  O: 0.778, P: 0.667, Q: 0.778, R: 0.722, S: 0.667, T: 0.611, U: 0.722,
  V: 0.667, W: 0.944, X: 0.667, Y: 0.667, Z: 0.611,
  "'": 0.278, "’": 0.278, "-": 0.333, ".": 0.278, ",": 0.278, " ": 0.278
}
const DIGIT_EM = 0.556
const DEFAULT_EM = 0.65
const WIDE_SCRIPT_EM = 1.0
const FONT_SAFETY = 1.05
const BOX_PAD = 1

/** Estimated rendered width of a string, in em. */
function textWidthEm(s: string): number {
  let w = 0
  for (const ch of s) {
    w +=
      CHAR_EM[ch] ??
      (ch >= "0" && ch <= "9"
        ? DIGIT_EM
        : (ch.codePointAt(0) ?? 0) >= 0x2e80
          ? WIDE_SCRIPT_EM
          : DEFAULT_EM)
  }
  return w
}

/** Rendered width of a word's box, px (accurate glyph sum + small safety). */
export function boxWidth(text: string, font: number): number {
  return Math.max(8, textWidthEm(text) * font * FONT_SAFETY + BOX_PAD)
}

/** Axis-aligned bounds of a `w`×`h` box rotated by `degrees` about its center. */
function rotatedBounds(
  w: number,
  h: number,
  degrees: number
): { w: number; h: number } {
  if (!degrees) return { w, h }
  const rad = (Math.abs(degrees) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { w: w * cos + h * sin, h: w * sin + h * cos }
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Uniform-grid spatial hash over placed boxes (center coords), so each
 * collision probe checks only nearby boxes instead of every placed word.
 */
class BoxGrid {
  private readonly cells = new Map<number, Box[]>()
  constructor(private readonly cell: number) {}

  private span(lo: number, hi: number): [number, number] {
    return [Math.floor(lo / this.cell), Math.floor(hi / this.cell)]
  }

  private static key(ix: number, iy: number): number {
    return (ix + 32768) * 65536 + (iy + 32768)
  }

  insert(b: Box): void {
    const [x0, x1] = this.span(b.x - b.w / 2, b.x + b.w / 2)
    const [y0, y1] = this.span(b.y - b.h / 2, b.y + b.h / 2)
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        const key = BoxGrid.key(ix, iy)
        const bucket = this.cells.get(key)
        if (bucket) bucket.push(b)
        else this.cells.set(key, [b])
      }
    }
  }

  /** True if `cand` overlaps any placed box, keeping `pad` between edges. */
  collides(cand: Box, pad: number): boolean {
    const [x0, x1] = this.span(cand.x - cand.w / 2 - pad, cand.x + cand.w / 2 + pad)
    const [y0, y1] = this.span(cand.y - cand.h / 2 - pad, cand.y + cand.h / 2 + pad)
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        const bucket = this.cells.get(BoxGrid.key(ix, iy))
        if (!bucket) continue
        for (const b of bucket) {
          if (
            Math.abs(cand.x - b.x) < (cand.w + b.w) / 2 + pad &&
            Math.abs(cand.y - b.y) < (cand.h + b.h) / 2 + pad
          ) {
            return true
          }
        }
      }
    }
    return false
  }
}

const GRID_CELL = 32
const SEARCH_STEPS = 2600

/** A word's resolved position and size; `planIndex`/`rowIndex` locate its row. */
interface Placement {
  planIndex: number
  rowIndex: number
  id: string
  x: number
  y: number
  fontSize: number
  rotation: number
  /** Bounds used for collision and the hit target (rotated when `rotation`). */
  w: number
  h: number
  floored: boolean
}

export interface WordTrailsGeometry {
  placements: Placement[]
  unplaced: Array<{ planIndex: number; rowIndex: number }>
}

/** A row's layout inputs: text, weight, segment anchor, size at k = 1, tilt. */
export interface PlanRow {
  id: string
  text: string
  weight: number
  segment: number
  baseFont: number
  floored: boolean
  rotation: number
}

/** Order-sensitive fingerprint of every row's layout inputs. */
export function rowsFingerprint(
  plans: ReadonlyArray<{ col: string; rows: ReadonlyArray<PlanRow> }>,
  seed: number
): string {
  let h = seed >>> 0
  for (const plan of plans) {
    h = fnv1a32(plan.col, h)
    for (const r of plan.rows) {
      h = fnv1a32(`${r.text}␟${r.weight}␟${r.segment}`, h)
    }
  }
  return (h >>> 0).toString(36)
}

/**
 * Greedy largest-first placement at the fit scale, shrinking the global scale
 * and retrying while any word finds no room (up to six passes).
 */
export function placeWords(o: {
  plans: ReadonlyArray<{
    col: string
    colLeft: number
    center: number
    rows: ReadonlyArray<PlanRow>
  }>
  colW: number
  bodyH: number
  yTop: number
  yBot: number
  segToY: (s: number) => number
  collisionPadding: number
  packingDensity: number
  scaleToFit: boolean
}): WordTrailsGeometry {
  const { plans, colW, bodyH, yTop, yBot, segToY, collisionPadding } = o

  // Two per-column limits on the global scale: an area budget (total box area
  // ≤ packingDensity of the column) and a width limit (the widest word, in
  // its rotated bounds, must fit the column band).
  const colArea = colW * bodyH
  let kArea = Infinity
  let kWidth = Infinity
  for (const plan of plans) {
    let sumArea = 0
    for (const r of plan.rows) {
      const wUnit = textWidthEm(r.text) * FONT_SAFETY
      sumArea += wUnit * LINE_HEIGHT_RATIO * r.baseFont * r.baseFont
      const bounds = rotatedBounds(wUnit, LINE_HEIGHT_RATIO, r.rotation)
      kWidth = Math.min(kWidth, (colW - 8 - BOX_PAD) / (bounds.w * r.baseFont))
    }
    if (sumArea > 0)
      kArea = Math.min(kArea, Math.sqrt((o.packingDensity * colArea) / sumArea))
  }

  // The global uniform scale. Same k for every word ⇒ relative magnitude is
  // preserved everywhere; only the absolute size drops as words are added.
  // Even without fit-shrink, never let a word spill the column.
  const kFit = o.scaleToFit ? Math.min(1, kArea, kWidth) : Math.min(1, kWidth)

  // Each word searches outward (sunflower sampling) from its segment anchor for
  // the nearest spot that clears every already-placed box — so the result is
  // *overlap-free by construction*, not by relaxation. Larger words are placed
  // first and win the spots nearest their true time; smaller words settle into
  // the gaps. A word with no free spot is left out (and not reserved, so it
  // doesn't crowd later searches). Deterministic for a given k.
  const runPlace = (k: number): WordTrailsGeometry => {
    const placements: Placement[] = []
    const unplaced: WordTrailsGeometry["unplaced"] = []
    plans.forEach((plan, planIndex) => {
      if (colW <= 0) return
      const xLo = plan.colLeft + 4
      const xHi = plan.colLeft + colW - 4

      const words = plan.rows
        .map((r, rowIndex) => {
          const scaled = k * r.baseFont
          const font = Math.max(MIN_RENDER_FONT, scaled)
          const bounds = rotatedBounds(
            boxWidth(r.text, font),
            font * LINE_HEIGHT_RATIO + 2,
            r.rotation
          )
          return {
            rowIndex,
            id: r.id,
            font,
            floored: r.floored || scaled < MIN_RENDER_FONT,
            rotation: r.rotation,
            w: bounds.w,
            h: bounds.h,
            anchorY: segToY(r.segment),
            seed: (hashUnit(r.id) - 0.5) * Math.min(colW * 0.5, 80)
          }
        })
        // Largest first — big words claim the spots closest to their segment.
        .sort((a, b) => b.font - a.font || (a.id < b.id ? -1 : 1))

      const grid = new BoxGrid(GRID_CELL)
      for (const word of words) {
        const halfW = word.w / 2
        const halfH = word.h / 2
        const cx0 = clamp(plan.center + word.seed, xLo + halfW, xHi - halfW)
        const cy0 = word.anchorY
        let found: Box | null = null
        // Sunflower search: even angular coverage, radius ∝ √step. The first
        // clear sample is close to the anchor, so words stay near their time.
        for (let step = 0; step < SEARCH_STEPS; step++) {
          const radius = 3.2 * Math.sqrt(step)
          const angle = step * 2.399963229728653 // golden angle
          const cand = {
            x: clamp(cx0 + radius * Math.cos(angle), xLo + halfW, xHi - halfW),
            y: clamp(
              cy0 + radius * Math.sin(angle),
              yTop + halfH,
              yBot - halfH
            ),
            w: word.w,
            h: word.h
          }
          if (!grid.collides(cand, collisionPadding)) {
            found = cand
            break
          }
        }
        if (!found) {
          unplaced.push({ planIndex, rowIndex: word.rowIndex })
          continue
        }
        grid.insert(found)
        placements.push({
          planIndex,
          rowIndex: word.rowIndex,
          id: word.id,
          x: found.x,
          y: found.y,
          fontSize: word.font,
          rotation: word.rotation,
          w: word.w,
          h: word.h,
          floored: word.floored
        })
      }
    })
    return { placements, unplaced }
  }

  // Place at the fit scale, then — if any word found no room — shrink the
  // global scale and retry until everything fits or we hit the floor. The area
  // budget makes 0–1 extra passes the norm.
  let k = kFit
  let result = runPlace(k)
  if (o.scaleToFit) {
    for (
      let attempt = 0;
      attempt < 6 && result.unplaced.length > 0 && k > 0.1;
      attempt++
    ) {
      k *= 0.88
      result = runPlace(k)
    }
  }
  return result
}

