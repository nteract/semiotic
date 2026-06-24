/**
 * Glyph path generation — shared by the canvas symbol renderer
 * (`networkSymbolRenderer`) and the SVG/SSR converter (`SceneToSVG`) so a
 * `symbol` scene node looks identical whether it is painted to canvas or
 * serialized to SVG.
 *
 * Named shapes delegate to `d3-shape`'s `symbol()` generator (already a
 * dependency — used for arcs/areas/lines), which emits an origin-centered path
 * for a given area. `chevron` is a small custom dart we add because d3 ships no
 * equivalent and multi-channel glyph charts often need a fourth distinct shape.
 */
import {
  symbol as d3Symbol,
  symbolCircle,
  symbolCross,
  symbolDiamond,
  symbolSquare,
  symbolStar,
  symbolTriangle,
  symbolWye,
  type SymbolType,
} from "d3-shape"

/** Named glyph shapes a `symbol` scene node can request. */
export type NetworkSymbolName =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "star"
  | "cross"
  | "wye"
  | "chevron"

/** Pipeline-neutral alias — the symbol mark is shared by network, XY, and
 *  ordinal scenes, so callers outside the network pipeline read this name. */
export type SymbolName = NetworkSymbolName

const D3_SYMBOLS: Record<string, SymbolType> = {
  circle: symbolCircle,
  square: symbolSquare,
  triangle: symbolTriangle,
  diamond: symbolDiamond,
  star: symbolStar,
  cross: symbolCross,
  wye: symbolWye,
}

/** Default shape assignment order when a recipe auto-maps distinct categories. */
export const SYMBOL_SEQUENCE: NetworkSymbolName[] = [
  "circle",
  "triangle",
  "diamond",
  "star",
  "square",
  "chevron",
  "cross",
  "wye",
]

/**
 * SVG path `d` string for a glyph, centered at the origin. `size` follows the
 * d3-symbol area convention (px²) for named shapes; the custom `chevron`
 * derives a comparable radius from it. `customPath`, when provided, is returned
 * verbatim (already origin-centered and sized).
 */
export function symbolPathString(
  symbolType: NetworkSymbolName | string | undefined,
  size: number,
  customPath?: string
): string {
  if (customPath) return customPath
  const name = symbolType ?? "circle"
  if (name === "chevron") return chevronPath(size)
  const type = D3_SYMBOLS[name] ?? symbolCircle
  return d3Symbol(type, Math.max(1, size))() ?? ""
}

/** Effective radius of a glyph with the given d3-symbol `size` (used for hit testing). */
export function symbolRadius(size: number): number {
  return Math.sqrt(Math.max(1, size) / Math.PI)
}

const EXTENT_CACHE = new Map<string, number>()

/**
 * Maximum extent (circumradius) of a glyph from its center — the radius that
 * actually bounds the drawn shape. For `circle` this equals {@link symbolRadius},
 * but pointy shapes (triangle/star/chevron) reach further for the same area, so
 * collision-packing must use this to avoid visual overlap. Polygonal shapes are
 * measured from their path vertices; `circle` is the area formula.
 */
export function symbolExtent(
  symbolType: NetworkSymbolName | string | undefined,
  size: number,
  customPath?: string
): number {
  if (!customPath && (symbolType ?? "circle") === "circle") return symbolRadius(size)
  const key = customPath ? `p:${customPath}` : `${symbolType}:${Math.round(size)}`
  const cached = EXTENT_CACHE.get(key)
  if (cached != null) return cached
  const d = customPath ?? symbolPathString(symbolType, size)
  const nums = d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi)
  let max = 0
  if (nums) {
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = +nums[i]
      const y = +nums[i + 1]
      const h = Math.sqrt(x * x + y * y)
      if (h > max) max = h
    }
  }
  if (!(max > 0)) max = symbolRadius(size)
  if (EXTENT_CACHE.size > 512) EXTENT_CACHE.clear()
  EXTENT_CACHE.set(key, max)
  return max
}

/** A concave upward dart — visually distinct from `triangle`, sized to roughly
 *  match a d3 symbol of the same `size`. */
function chevronPath(size: number): string {
  const r = symbolRadius(size) * 1.5
  const wx = r * 0.92
  return `M0,${-r}L${wx},${(r * 0.78).toFixed(3)}L0,${(r * 0.28).toFixed(3)}L${-wx},${(r * 0.78).toFixed(3)}Z`
}
