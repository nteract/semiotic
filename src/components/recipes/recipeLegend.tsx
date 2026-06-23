import * as React from "react"
import type { CSSProperties } from "react"
import type { LegendGroup, LegendItem } from "../types/legendTypes"
import { symbolPathString, symbolExtent, type NetworkSymbolName } from "../stream/symbolPath"

/**
 * `legendGroupsFrom` — build the `LegendGroup[]` a custom-layout recipe passes
 * through `frameProps.legend` (`{ legendGroups }`). All three custom-chart HOCs
 * disable the built-in legend because the *layout* owns color/shape/size; without
 * this, authors hand-roll the `LegendGroup` shape (its `styleFn`, custom-glyph
 * `type` render functions, swatch sizing). This closes that gap without the frame
 * having to guess the author's encoding — the recipe declares each channel and
 * gets back a ready-to-render array.
 *
 * One group is emitted per provided channel, in order: **color → symbol → size**.
 * Pure / SSR-safe.
 *
 * @example
 * ```tsx
 * <NetworkCustomChart
 *   layout={packedClusterMatrix}
 *   frameProps={{ legend: { legendGroups: legendGroupsFrom({
 *     colorMap: CATEGORY_COLORS, colorLabel: "Category",
 *     symbolMap: CLASS_SHAPES, symbolLabel: "Class",
 *     sizeStops: [200, 2000, 8000], sizeRadius: r, sizeLabel: "Mass (kg)",
 *   }) } }}
 * />
 * ```
 */
export interface LegendGroupsInput {
  // ── Color channel (hue) ─────────────────────────────────────────────────────
  /** `{category → color}` map → one swatch per entry, in insertion order. */
  colorMap?: Record<string, string>
  /** Or explicit category keys, with `color` resolving each to a color. */
  keys?: string[]
  /** Resolve a key → color (e.g. a recipe's `ctx.resolveColor`). Used with `keys`. */
  color?: (key: string) => string
  /** Color-group heading. @default "" */
  colorLabel?: string
  /** Color swatch glyph — a filled square or a line stroke. @default "fill" */
  colorType?: "fill" | "line"

  // ── Symbol channel (shape) ──────────────────────────────────────────────────
  /** `{category → glyph shape}` map → one shape swatch per entry. */
  symbolMap?: Record<string, NetworkSymbolName>
  /** Fill for the shape swatches (shape, not color, is the encoding here).
   *  @default "var(--semiotic-text, currentColor)" */
  symbolColor?: string
  /** Symbol-group heading. @default "" */
  symbolLabel?: string

  // ── Size channel (area) ───────────────────────────────────────────────────────
  /** Reference values → circle swatches sized by the mark scale. */
  sizeStops?: number[]
  /** Map a value → radius (px) — pass the recipe's own radius scale so the
   *  legend circles match the marks exactly. Required to draw the size group. */
  sizeRadius?: (v: number) => number
  /** Format a size stop for its label. @default `String` */
  sizeFormat?: (v: number) => string
  /** Size swatch circle fill. @default "var(--semiotic-text, currentColor)" */
  sizeColor?: string
  /** Size-group heading. @default "" */
  sizeLabel?: string
}

const INK = "var(--semiotic-text, currentColor)"
const SWATCH = 16
const SWATCH_C = SWATCH / 2

/** Back-solve a d3-symbol `size` so any glyph fits within `radius` px of center
 *  (pointy shapes reach further for the same area; extent ∝ √size). */
function sizeForRadius(shape: NetworkSymbolName, radius: number): number {
  const ref = symbolExtent(shape, 100)
  return ref > 0 ? 100 * (radius / ref) * (radius / ref) : Math.PI * radius * radius
}

export function legendGroupsFrom(input: LegendGroupsInput): LegendGroup[] {
  const groups: LegendGroup[] = []

  // ── Color ───────────────────────────────────────────────────────────────────
  const colorEntries: Array<[string, string | undefined]> = input.colorMap
    ? Object.entries(input.colorMap)
    : input.keys
      ? input.keys.map((k) => [k, input.color ? input.color(k) : undefined])
      : []
  if (colorEntries.length > 0) {
    const type = input.colorType ?? "fill"
    const items: LegendItem[] = colorEntries.map(([label, c]) => ({ label, color: c }))
    const styleFn: (item: LegendItem) => CSSProperties =
      type === "line"
        ? (item) => ({ stroke: (item.color as string) ?? INK, strokeWidth: 2, fill: "none" })
        : (item) => ({ fill: (item.color as string) ?? INK, stroke: (item.color as string) ?? INK })
    groups.push({ type, label: input.colorLabel ?? "", items, styleFn })
  }

  // ── Symbol (shape replaces the mark) ──────────────────────────────────────────
  if (input.symbolMap && Object.keys(input.symbolMap).length > 0) {
    const fill = input.symbolColor ?? INK
    const items: LegendItem[] = Object.entries(input.symbolMap).map(([label, shape]) => ({
      label,
      shape,
      color: fill,
    }))
    groups.push({
      label: input.symbolLabel ?? "",
      items,
      styleFn: () => ({}),
      type: (item) => {
        const shape = item.shape as NetworkSymbolName
        return (
          <path
            d={symbolPathString(shape, sizeForRadius(shape, SWATCH_C - 1))}
            transform={`translate(${SWATCH_C},${SWATCH_C})`}
            fill={(item.color as string) ?? fill}
          />
        )
      },
    })
  }

  // ── Size (area) ───────────────────────────────────────────────────────────────
  if (input.sizeStops && input.sizeStops.length > 0 && input.sizeRadius) {
    const radius = input.sizeRadius
    const fmt = input.sizeFormat ?? ((v: number) => String(v))
    const fill = input.sizeColor ?? INK
    const items: LegendItem[] = input.sizeStops.map((v) => ({
      label: fmt(v),
      r: Math.max(0.5, radius(v)),
      color: fill,
    }))
    groups.push({
      label: input.sizeLabel ?? "",
      items,
      styleFn: () => ({}),
      type: (item) => (
        <circle cx={SWATCH_C} cy={SWATCH_C} r={item.r as number} fill={(item.color as string) ?? fill} />
      ),
    })
  }

  return groups
}
