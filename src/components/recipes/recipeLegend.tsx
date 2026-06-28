import * as React from "react"
import type { CSSProperties, ReactElement } from "react"
import type { LegendGroup, LegendItem } from "../types/legendTypes"
import { symbolPathString, symbolExtent, type NetworkSymbolName } from "../stream/symbolPath"

/**
 * `legendGroupsFrom` — build the `LegendGroup[]` a custom-layout recipe passes
 * through `frameProps.legend` (`{ legendGroups }`). All four custom-chart HOCs
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

// ── Portable SVG legend for custom-layout overlays ─────────────────────────────

export interface LegendSwatch {
  /** Legend entry label. */
  label: string
  /** Filled-square swatch color (the categorical / fill case). */
  color?: string
  /** Line-stroke swatch color (a horizontal bar — for line-series legends). */
  line?: string
  /** Glyph-shape swatch (the per-datum shape channel). */
  shape?: NetworkSymbolName
  /** Diagonal-hatch swatch (percentile / uncertainty bands). Line color comes
   *  from `color`, falling back to the label color. */
  hatch?: boolean
}

export interface LegendSwatchesProps {
  entries: LegendSwatch[]
  /** Top-left x of the legend block, in plot coordinates. */
  x: number
  /** Top-left y of the legend block, in plot coordinates. */
  y: number
  /** Stack entries down (`vertical`) or flow them across (`horizontal`).
   *  @default "vertical" */
  orientation?: "vertical" | "horizontal"
  /** Swatch box size in px. @default 14 */
  swatchSize?: number
  /** Row height (vertical) / inter-entry gap (horizontal), px. @default 8 (+ swatch) */
  gap?: number
  /** Gap between a swatch and its label, px. @default 6 */
  labelGap?: number
  /** @default 12 */
  fontSize?: number
  /** Label color. @default "var(--semiotic-text-secondary, #888)" */
  color?: string
  className?: string
  keyId?: string | number
}

/**
 * A self-contained SVG legend a custom layout draws in its `overlays` — the
 * portable counterpart to {@link legendGroupsFrom} (which feeds the *frame's*
 * legend via `frameProps.legend`). Custom charts disable the built-in legend,
 * so this renders swatch + label rows directly: fill squares, line bars, glyph
 * shapes, and diagonal-hatch swatches, stacked or flowed. `pointerEvents: none`.
 *
 * @example
 * ```ts
 * legendSwatches({
 *   x: 0, y: 0, orientation: "horizontal",
 *   entries: SPHERES.map((s) => ({ label: s, color: COLORS[s] })),
 * })
 * ```
 */
export function legendSwatches(p: LegendSwatchesProps): ReactElement {
  const orientation = p.orientation ?? "vertical"
  const sw = p.swatchSize ?? 14
  const gap = p.gap ?? 8
  const labelGap = p.labelGap ?? 6
  const fontSize = p.fontSize ?? 12
  const color = p.color ?? "var(--semiotic-text-secondary, #888)"
  const rowHeight = sw + gap

  let cursor = 0
  const children: ReactElement[] = []
  p.entries.forEach((entry, i) => {
    const ex = orientation === "vertical" ? 0 : cursor
    const ey = orientation === "vertical" ? cursor : 0
    const swatchColor = entry.color ?? entry.line ?? color
    children.push(
      <g key={`legend-${i}`} transform={`translate(${ex},${ey})`}>
        {renderSwatch(entry, sw, swatchColor, color)}
        <text
          x={sw + labelGap}
          y={sw / 2}
          dominantBaseline="middle"
          fontSize={fontSize}
          fill={color}
        >
          {entry.label}
        </text>
      </g>,
    )
    if (orientation === "vertical") {
      cursor += rowHeight
    } else {
      // Advance past swatch + label gap + estimated text width + inter-entry gap.
      cursor += sw + labelGap + entry.label.length * fontSize * 0.58 + gap + 8
    }
  })

  return (
    <g
      key={p.keyId}
      className={p.className}
      transform={`translate(${p.x},${p.y})`}
      style={{ pointerEvents: "none" }}
    >
      {children}
    </g>
  )
}

function renderSwatch(
  entry: LegendSwatch,
  sw: number,
  swatchColor: string,
  labelColor: string,
): ReactElement {
  if (entry.shape) {
    const size = sizeForRadius(entry.shape, sw / 2 - 1)
    return (
      <path
        d={symbolPathString(entry.shape, size)}
        transform={`translate(${sw / 2},${sw / 2})`}
        fill={swatchColor}
      />
    )
  }
  if (entry.hatch) {
    const stroke = entry.color ?? labelColor
    // Nested <svg> clips the diagonal lines to the swatch box (overflow hidden)
    // without needing a unique clipPath id — keeps it pure / collision-free.
    return (
      <g>
        <svg width={sw} height={sw} style={{ overflow: "hidden" }}>
          {[-sw, -sw / 2, 0, sw / 2].map((o, k) => (
            <line key={k} x1={o} y1={sw} x2={o + sw} y2={0} stroke={stroke} strokeWidth={1} opacity={0.7} />
          ))}
        </svg>
        <rect width={sw} height={sw} fill="none" stroke={stroke} strokeWidth={1} opacity={0.5} rx={2} />
      </g>
    )
  }
  if (entry.line) {
    return <rect y={sw / 2 - 1.5} width={sw} height={3} rx={1.5} fill={entry.line} />
  }
  return <rect width={sw} height={sw} rx={2} fill={swatchColor} />
}
