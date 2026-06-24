import * as React from "react"
import type { ReactNode } from "react"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type { NetworkSceneNode, NetworkSymbolNode } from "../stream/networkTypes"
import type { NetworkSymbolName } from "../stream/symbolPath"
import { SYMBOL_SEQUENCE, symbolExtent, symbolPathString } from "../stream/symbolPath"
import { makeShade, readField, groupBy, dimFor, signatureKey, LayoutCache } from "./recipeUtils"
import { roundedEnclosure, bandLabel, markCallout } from "./recipeChrome"
import type { MarkCalloutProps } from "./recipeChrome"
import type { Datum } from "../charts/shared/datumTypes"

/**
 * Config for {@link packedClusterMatrix}. Accessors read `node.data.<field>`
 * (the ingest wrapper) and fall back to the node itself.
 */
export interface PackedClusterMatrixConfig {
  // ── Encoding accessors ────────────────────────────────────────────────────
  /** Categorical field → matrix column. @default "column" */
  columnAccessor?: string
  /** Categorical field → matrix row (stacked within a column). @default "row" */
  rowAccessor?: string
  /** Numeric field → glyph size (area-encoded). Constant size when omitted. */
  sizeAccessor?: string
  /** Categorical field → glyph hue (via `ctx.resolveColor`). */
  colorAccessor?: string
  /** Fixed hue per category value. Wins over `ctx.resolveColor` for mapped keys —
   *  the right choice for editorial graphics with a semantic palette. */
  colorMap?: Record<string, string>
  /** Categorical field → glyph shape. Auto-assigned shapes when no `symbolMap`. */
  symbolAccessor?: string
  /** Numeric/date field → lightness shade of the hue (the fourth channel). */
  shadeAccessor?: string
  /** Boolean field → small center dot on the glyph (e.g. a flagged subset). */
  markerAccessor?: string

  // ── Ordering ──────────────────────────────────────────────────────────────
  /** Explicit column order; otherwise columns sort by count, largest first. */
  columnOrder?: string[]
  /** Explicit row order **bottom→top**; otherwise rows sort by count, largest at bottom. */
  rowOrder?: string[]

  // ── Shape mapping ───────────────────────────────────────────────────────────
  /** Map a class value to a named glyph (the base mark BECOMES that shape).
   *  Unmapped values get auto-assigned. Mutually exclusive with `iconAccessor`. */
  symbolMap?: Record<string, NetworkSymbolName>
  /** Shape when no `symbolAccessor` is set. @default "circle" */
  defaultSymbol?: NetworkSymbolName

  // ── Composite glyph (base circle + stroked inner icon) ────────────────────────
  /** Categorical field whose value selects an OPTIONAL stroked icon drawn inside
   *  the (filled circle) base mark — the "most marks are plain circles, a few
   *  carry an icon" model. Only values present in `iconMap` get an icon. */
  iconAccessor?: string
  /** Map an icon-field value to a glyph. Values omitted here render as a plain
   *  circle (no icon) — so a single dominant class stays unmarked. */
  iconMap?: Record<string, NetworkSymbolName>
  /** Stroke color of the inner icon. @default "rgba(255,255,255,0.92)" */
  iconColor?: string
  /** Inner-icon stroke width. @default 1 */
  iconStrokeWidth?: number
  /** Inner-icon size as a fraction of the base circle radius. @default 0.72 */
  iconScale?: number

  // ── Size scale ──────────────────────────────────────────────────────────────
  /** Glyph radius range in px (area = πr²). @default [2, 8] */
  sizeRange?: [number, number]
  /** Size value domain. @default data extent */
  sizeDomain?: [number, number]
  /** Cap total glyph area at this fraction of the plot; radii scale down to fit
   *  (keeps clusters packable / non-overlapping on smaller canvases). @default 0.4 */
  maxAreaFraction?: number

  // ── Shade scale ─────────────────────────────────────────────────────────────
  /** How far the shade travels from the base hue (0..1). @default 0.72 */
  shadeStrength?: number
  /** Shade value domain. @default data extent (dates auto-parsed) */
  shadeDomain?: [number, number]
  /** Flip the shade ramp (default: low → light, high → dark). */
  shadeReverse?: boolean

  // ── Layout ──────────────────────────────────────────────────────────────────
  /** Row layout. `"banded"`: orbit rows are aligned global bands (one y-range
   *  spanning all columns → row labels align, one enclosure per band spans the
   *  columns, a column is only as tall as its highest occupied band). `"stacked"`:
   *  each column stacks its own rows independently (cell height ∝ that column's
   *  count; rows do NOT align). @default "banded" */
  rowMode?: "banded" | "stacked"
  /** `"proportional"` (mosaic: cell area ∝ count) or `"uniform"` grid. @default "proportional" */
  cellSizing?: "proportional" | "uniform"
  /** Exponent applied to counts when sizing columns/cells. `1` = strict area ∝
   *  count; `<1` softens the range so small columns stay legible. @default 1 */
  proportionExponent?: number
  /** Gap between columns in px. @default 16 */
  columnGap?: number
  /** Gap between stacked cells in px. @default 12 */
  rowGap?: number
  /** Collision padding between glyphs in px. @default 1 */
  packPadding?: number
  /** Relaxation passes for the packing (capped at 14; a near-uniform seed needs
   *  few). Higher = tidier/slower. @default 12 */
  iterations?: number

  // ── Chrome ────────────────────────────────────────────────────────────────
  /** Draw a rounded enclosure hugging each cluster. @default true */
  showEnclosures?: boolean
  enclosureColor?: string
  enclosureRadius?: number
  enclosureOpacity?: number
  enclosureWidth?: number
  /** Column header labels across the top. @default true */
  showColumnHeaders?: boolean
  /** Row labels down the left. @default true */
  showRowLabels?: boolean
  columnLabel?: (col: string) => string
  rowLabel?: (row: string) => string
  headerColor?: string
  labelColor?: string
  headerFontSize?: number
  labelFontSize?: number
  /** Top space reserved for headers. @default 26 */
  headerHeight?: number
  /** Left space reserved for row labels. @default 66 */
  labelWidth?: number
  /** Bottom margin reserved for callout labels (only when `callouts` is set). @default 30 */
  footerHeight?: number

  // ── Glyph styling / interaction ─────────────────────────────────────────────
  markStroke?: string
  markStrokeWidth?: number
  /** Center-dot color for `markerAccessor` hits. @default "#ffffff" */
  markerColor?: string
  /** Dim every glyph that doesn't match the highlight. A single `{field,value}`
   *  or an array (AND — a glyph must match all to stay lit, e.g. a region×orbit
   *  cell). Drives legend / nav-tree highlighting. */
  highlight?: { field: string; value: string } | { field: string; value: string }[] | null
  /** Opacity for dimmed glyphs. @default 0.16 */
  dimOpacity?: number

  // ── Callouts ──────────────────────────────────────────────────────────────
  /** Editorial leader-line callouts to specific marks. Each picks the first mark
   *  whose `datum[field] === value` and draws a ring + connector + label. `at`
   *  places the label: a y in [0,1] of the plot ("1" = bottom) and the label
   *  tracks the mark's x, or an explicit `{x,y}` in plot px. */
  callouts?: Array<{
    field: string
    value: string
    label: string
    at?: number | { x: number; y: number }
    connector?: "straight" | "elbow" | "curve"
  }>
  calloutColor?: string
}

// ── Internal types ────────────────────────────────────────────────────────────

interface RawMark {
  id: string
  col: string
  row: string
  sizeVal: number
  colorKey: string
  symVal: string
  shadeVal: number
  marker: boolean
  iconVal: string
  datum: Datum
  /** d3-symbol draw area (px²). Computed once from the size scale. */
  size: number
  /** Glyph circumradius — the radius collision packs and clamps by. */
  packR: number
  /** Base mark shape (the filled glyph). */
  baseShape: NetworkSymbolName
  /** Optional stroked icon drawn inside the base, or null for a plain mark. */
  iconShape: NetworkSymbolName | null
}

interface EnclosureRect {
  x: number
  y: number
  w: number
  h: number
}

interface Geom {
  positions: Map<string, { px: number; py: number }>
  /** Rounded enclosures to draw (per-cell in `stacked`, per-band in `banded`). */
  enclosures: EnclosureRect[]
  colBands: { col: string; x: number; w: number }[]
  rowLabelY: Map<string, number>
}

// Geometry cache keyed by a content signature of layout-affecting inputs only
// (NOT color/shade/symbol/highlight) — so interaction and a returning resize
// reuse the packing instead of re-running the force sim. Bounded.
const GEOM_CACHE = new LayoutCache<Geom>(12)

/** Coerce a value to a number, parsing dates (ISO strings / `Date`) to ms. */
function toNumberOrDate(v: unknown): number {
  if (v == null) return NaN
  if (typeof v === "number") return v
  if (v instanceof Date) return v.getTime()
  const s = String(v)
  const n = Number(s)
  if (!Number.isNaN(n) && s.trim() !== "") return n
  const t = Date.parse(s)
  return Number.isNaN(t) ? NaN : t
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/** Small deterministic PRNG so the force packing is stable across renders. */
function lcg(seed: number): () => number {
  let s = (seed >>> 0) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * `packedClusterMatrix` — a reusable network layout that arranges a flat set of
 * records into a **matrix of densely-packed clusters**: one column per value of
 * `columnAccessor`, cells stacked within a column per value of `rowAccessor`,
 * each cell a beeswarm of variable-radius glyphs. In `"proportional"` sizing the
 * column widths and cell heights track counts (a mosaic), so a cell's area is
 * proportional to its record count and packing density stays roughly uniform.
 *
 * Each record renders as a **four-channel glyph**: shape (`symbolAccessor`),
 * hue (`colorAccessor`), size (`sizeAccessor`, area-encoded), and lightness
 * shade (`shadeAccessor`). Packing is deterministic (seeded `d3-force`) and the
 * geometry is cached, so hover/selection/filter re-runs re-style without
 * re-packing. Built to recreate small-multiples beeswarm graphics (e.g. Nadieh
 * Bremer's "Satellites in Space").
 *
 * @example
 * ```tsx
 * import { NetworkCustomChart } from "semiotic/network"
 * import { packedClusterMatrix } from "semiotic/recipes"
 *
 * <NetworkCustomChart
 *   nodes={satellites}            // each: { id, region, orbit, mass, category, klass, launch }
 *   layout={packedClusterMatrix}
 *   colorScheme={categoryColors}
 *   layoutConfig={{
 *     columnAccessor: "region", rowAccessor: "orbit",
 *     sizeAccessor: "mass", colorAccessor: "category",
 *     symbolAccessor: "klass", shadeAccessor: "launch",
 *   }}
 * />
 * ```
 */
export const packedClusterMatrix: NetworkCustomLayout<PackedClusterMatrixConfig> = (ctx) => {
  const cfg = ctx.config || {}
  const plot = ctx.dimensions.plot

  const columnAcc = cfg.columnAccessor ?? "column"
  const rowAcc = cfg.rowAccessor ?? "row"
  const sizeAcc = cfg.sizeAccessor
  const colorAcc = cfg.colorAccessor
  const symbolAcc = cfg.symbolAccessor
  const shadeAcc = cfg.shadeAccessor
  const markerAcc = cfg.markerAccessor
  const iconAcc = cfg.iconAccessor

  const defaultSymbol = cfg.defaultSymbol ?? "circle"
  const [rMin, rMax] = cfg.sizeRange ?? [2, 8]
  const shadeStrength = cfg.shadeStrength ?? 0.72
  const shadeReverse = cfg.shadeReverse ?? false
  const rowMode = cfg.rowMode ?? "banded"
  const cellSizing = cfg.cellSizing ?? "proportional"
  const proportionExponent = cfg.proportionExponent ?? 1
  const columnGap = cfg.columnGap ?? 16
  const rowGap = cfg.rowGap ?? 12
  const packPadding = cfg.packPadding ?? 1
  const iterations = cfg.iterations ?? 12

  const showEnclosures = cfg.showEnclosures !== false
  const showColumnHeaders = cfg.showColumnHeaders !== false
  const showRowLabels = cfg.showRowLabels !== false
  const headerH = showColumnHeaders ? cfg.headerHeight ?? 26 : 0
  const labelW = showRowLabels ? cfg.labelWidth ?? 66 : 0
  // Reserve a bottom margin for callout labels so they sit BELOW the data area
  // rather than overlapping the marks.
  const hasCallouts = !!(cfg.callouts && cfg.callouts.length > 0)
  const footerH = hasCallouts ? cfg.footerHeight ?? 30 : 0

  const innerX = plot.x + labelW
  const innerY = plot.y + headerH
  const innerW = Math.max(1, plot.width - labelW)
  const innerH = Math.max(1, plot.height - headerH - footerH)

  // ── Read records ────────────────────────────────────────────────────────────
  const raw: RawMark[] = []
  for (const node of ctx.nodes) {
    const datum = (node.data ?? node) as Datum
    raw.push({
      id: node.id,
      col: String(readField(node, columnAcc, "—")),
      row: String(readField(node, rowAcc, "—")),
      sizeVal: sizeAcc ? Number(readField(node, sizeAcc, 1)) : 1,
      colorKey: colorAcc ? String(readField(node, colorAcc, "")) : "",
      symVal: symbolAcc ? String(readField(node, symbolAcc, "")) : "",
      shadeVal: shadeAcc ? toNumberOrDate(readField(node, shadeAcc, null)) : NaN,
      marker: markerAcc ? Boolean(readField(node, markerAcc, false)) : false,
      iconVal: iconAcc ? String(readField(node, iconAcc, "")) : "",
      datum,
      size: 0, // filled below once the size scale is known
      packR: 0,
      baseShape: "circle",
      iconShape: null,
    })
  }

  if (raw.length === 0) return { sceneNodes: [] }

  // ── Scales ──────────────────────────────────────────────────────────────────
  let dmin = Infinity
  let dmax = -Infinity
  if (sizeAcc) {
    for (const m of raw) {
      if (Number.isFinite(m.sizeVal)) {
        if (m.sizeVal < dmin) dmin = m.sizeVal
        if (m.sizeVal > dmax) dmax = m.sizeVal
      }
    }
  }
  if (cfg.sizeDomain) [dmin, dmax] = cfg.sizeDomain
  if (!Number.isFinite(dmin) || !Number.isFinite(dmax)) {
    dmin = 0
    dmax = 1
  }
  const radiusOf = (v: number): number => {
    if (dmax <= dmin) return (rMin + rMax) / 2
    const t = Math.sqrt(clamp((v - dmin) / (dmax - dmin), 0, 1))
    return rMin + t * (rMax - rMin)
  }

  let smin = Infinity
  let smax = -Infinity
  if (shadeAcc) {
    for (const m of raw) {
      if (Number.isFinite(m.shadeVal)) {
        if (m.shadeVal < smin) smin = m.shadeVal
        if (m.shadeVal > smax) smax = m.shadeVal
      }
    }
  }
  if (cfg.shadeDomain) [smin, smax] = cfg.shadeDomain
  const shadeT = (v: number): number => {
    if (!shadeAcc || !Number.isFinite(v) || smax <= smin) return 0.5
    const t = clamp((v - smin) / (smax - smin), 0, 1)
    return shadeReverse ? 1 - t : t
  }

  // Hue shaders, one per category color (each captures two Lab interpolators).
  const colorMap = cfg.colorMap
  const shaders = new Map<string, (t: number) => string>()
  const fillFor = (colorKey: string, t: number): string => {
    let f = shaders.get(colorKey)
    if (!f) {
      const base = (colorMap && colorMap[colorKey]) || ctx.resolveColor(colorKey)
      f = makeShade(base, shadeStrength)
      shaders.set(colorKey, f)
    }
    return f(t)
  }

  // Shape assignment: explicit map first, then stable auto-assignment.
  const symMap = new Map<string, NetworkSymbolName>()
  if (cfg.symbolMap) {
    for (const [k, v] of Object.entries(cfg.symbolMap)) symMap.set(k, v)
  }
  let symSeq = 0
  const symbolFor = (val: string): NetworkSymbolName => {
    if (!symbolAcc) return defaultSymbol
    let s = symMap.get(val)
    if (!s) {
      s = SYMBOL_SEQUENCE[symSeq % SYMBOL_SEQUENCE.length]
      symSeq++
      symMap.set(val, s)
    }
    return s
  }

  // Composite-glyph (icon) mode: the base mark is always a filled circle and an
  // optional stroked icon is drawn inside for values present in `iconMap`.
  const iconMap = cfg.iconMap
  const iconFor = (val: string): NetworkSymbolName | null =>
    iconAcc && iconMap && iconMap[val] ? iconMap[val] : null
  // The base shape: a circle in icon mode, otherwise the symbol encoding.
  const baseShapeFor = (m: RawMark): NetworkSymbolName => (iconAcc ? "circle" : symbolFor(m.symVal))

  // Per-mark draw area + collision radius. `packR` is the glyph's true
  // circumradius (a triangle/star reaches past a circle of the same area), so
  // packing by it keeps pointy shapes from visually overlapping.
  //
  // Area cap: if the glyphs would need more than `maxAreaFraction` of the plot,
  // scale every radius down by one shared factor so they fit at a packable
  // density. This preserves the size *encoding* (relative sizes are untouched)
  // while guaranteeing the clusters can pack without overlap on any canvas —
  // exactly what a designer does by sizing marks to the available space.
  const maxAreaFraction = cfg.maxAreaFraction ?? 0.4
  let totalExtentArea = 0
  const baseR: number[] = new Array(raw.length)
  const baseExtent: number[] = new Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    const m = raw[i]
    const r = radiusOf(m.sizeVal)
    baseR[i] = r
    m.baseShape = baseShapeFor(m)
    m.iconShape = iconFor(m.iconVal)
    const ext = symbolExtent(m.baseShape, Math.PI * r * r)
    baseExtent[i] = ext
    totalExtentArea += Math.PI * ext * ext
  }
  const areaCap = maxAreaFraction * innerW * innerH
  // Scale by the glyphs' true extent (a star/chevron reaches past its circle
  // radius) so the packable area — not just the nominal circle area — fits.
  const areaScale = totalExtentArea > areaCap ? Math.sqrt(areaCap / totalExtentArea) : 1
  for (let i = 0; i < raw.length; i++) {
    const m = raw[i]
    const rv = baseR[i] * areaScale
    m.size = Math.PI * rv * rv
    m.packR = baseExtent[i] * areaScale // extent scales linearly with radius
  }

  // ── Resolve orders ────────────────────────────────────────────────────────
  const colCounts = new Map<string, number>()
  const rowCounts = new Map<string, number>()
  for (const m of raw) {
    colCounts.set(m.col, (colCounts.get(m.col) ?? 0) + 1)
    rowCounts.set(m.row, (rowCounts.get(m.row) ?? 0) + 1)
  }
  const columnOrder =
    cfg.columnOrder?.filter((c) => colCounts.has(c)) ??
    [...colCounts.keys()].sort((a, b) => (colCounts.get(b) ?? 0) - (colCounts.get(a) ?? 0))
  const rowOrder =
    cfg.rowOrder?.filter((r) => rowCounts.has(r)) ??
    [...rowCounts.keys()].sort((a, b) => (rowCounts.get(b) ?? 0) - (rowCounts.get(a) ?? 0))

  // ── Geometry (cached) ───────────────────────────────────────────────────────
  // Sign by layout-affecting inputs only (plus a per-mark fingerprint) — never by
  // `ctx.nodes` array identity, which is fresh every buildScene. See LayoutCache.
  const sig = signatureKey([
    Math.round(plot.x),
    Math.round(plot.y),
    Math.round(plot.width),
    Math.round(plot.height),
    headerH,
    labelW,
    footerH,
    rowMode,
    cellSizing,
    proportionExponent,
    columnGap,
    rowGap,
    packPadding,
    iterations,
    rMin,
    rMax,
    dmin,
    dmax,
    maxAreaFraction,
    columnOrder.join(","),
    rowOrder.join(","),
    raw.length,
    fingerprint(raw),
  ])

  const geom = GEOM_CACHE.getOrCompute(sig, () =>
    buildGeometry(raw, {
      columnOrder,
      rowOrder,
      innerX,
      innerY,
      innerW,
      innerH,
      rowMode,
      cellSizing,
      proportionExponent,
      columnGap,
      rowGap,
      packPadding,
      iterations,
    })
  )

  // ── Emit glyphs (re-styled every call; cheap) ────────────────────────────────
  // A glyph stays lit only if it matches the highlight AND the shared selection;
  // `dimFor` is the shared opacity rule (see recipeUtils).
  const sel = ctx.selection
  const selPredicate = sel?.isActive ? sel.predicate : null
  const highlight = cfg.highlight ?? null
  const dimOpacity = cfg.dimOpacity ?? 0.16
  const markStroke = cfg.markStroke
  const markStrokeWidth = cfg.markStrokeWidth ?? 0
  const markerColor = cfg.markerColor ?? "#ffffff"

  const iconColor = cfg.iconColor ?? "rgba(255,255,255,0.92)"
  const iconStrokeWidth = cfg.iconStrokeWidth ?? 1
  const iconScale = cfg.iconScale ?? 0.72

  const sceneNodes: NetworkSceneNode[] = []
  // Decorators (center dots, inner icons) are drawn in the overlay so they don't
  // become separate hit/keyboard-nav targets layered over their own base glyph.
  const markerDots: { x: number; y: number; r: number }[] = []
  const iconMarks: { x: number; y: number; size: number; shape: NetworkSymbolName; opacity: number }[] = []
  for (const m of raw) {
    const g = geom.positions.get(m.id)
    if (!g) continue

    const opacity = dimFor(m.datum, { highlight, predicate: selPredicate, dimOpacity })

    // Base (filled) mark — the hit-testable, keyboard-navigable unit.
    const symbol: NetworkSymbolNode = {
      type: "symbol",
      cx: g.px,
      cy: g.py,
      size: m.size,
      symbolType: m.baseShape,
      style: {
        fill: fillFor(m.colorKey, shadeT(m.shadeVal)),
        opacity,
        ...(markStroke ? { stroke: markStroke, strokeWidth: markStrokeWidth } : {}),
      },
      datum: m.datum,
      id: m.id,
      label: String(m.id),
    }
    sceneNodes.push(symbol)

    if (m.iconShape) {
      const rv = Math.sqrt(m.size / Math.PI)
      const targetExtent = rv * iconScale
      // Size the inner icon by its TRUE extent (a star/triangle reaches past its
      // area-radius), so it fits inside the base circle instead of overflowing.
      // Extent ∝ √size, so back-solve from a reference size.
      const e0 = symbolExtent(m.iconShape, 100)
      const iconSize = e0 > 0 ? 100 * (targetExtent / e0) * (targetExtent / e0) : Math.PI * targetExtent * targetExtent
      iconMarks.push({ x: g.px, y: g.py, size: iconSize, shape: m.iconShape, opacity })
    }
    if (m.marker && opacity > dimOpacity + 0.001) {
      markerDots.push({ x: g.px, y: g.py, r: Math.max(1, Math.sqrt(m.size / Math.PI) * 0.4) })
    }
  }

  // ── Callouts: leader lines from a label to specific marks ─────────────────────
  const callouts: import("./recipeChrome").MarkCalloutProps[] = []
  if (cfg.callouts && cfg.callouts.length > 0) {
    const calloutColor = cfg.calloutColor ?? "var(--semiotic-text, #f4f4f8)"
    const footerY = plot.y + plot.height - (footerH > 0 ? footerH * 0.45 : 9)
    // Resolve each callout to its mark; split into explicitly-placed vs auto
    // (auto ones get evenly distributed across the bottom so labels don't pile up).
    const resolved: { c: NonNullable<typeof cfg.callouts>[number]; ci: number; px: number; py: number; markR: number }[] = []
    for (let ci = 0; ci < cfg.callouts.length; ci++) {
      const c = cfg.callouts[ci]
      const hit = raw.find((m) => String((m.datum as Record<string, unknown>)[c.field]) === String(c.value))
      if (!hit) continue
      const g = geom.positions.get(hit.id)
      if (!g) continue
      resolved.push({ c, ci, px: g.px, py: g.py, markR: Math.sqrt(hit.size / Math.PI) })
    }
    const auto = resolved.filter((r) => r.c.at == null).sort((a, b) => a.px - b.px)
    const autoSlot = new Map<number, number>()
    auto.forEach((r, k) => {
      // Evenly spaced label x across the plot, ordered by mark x to limit crossings.
      autoSlot.set(r.ci, innerX + ((k + 0.5) / auto.length) * innerW)
    })
    for (const r of resolved) {
      const c = r.c
      let labelX = autoSlot.get(r.ci) ?? r.px
      let labelY = footerY
      const connector = c.connector ?? (autoSlot.has(r.ci) ? "elbow" : "straight")
      if (typeof c.at === "object" && c.at) {
        labelX = c.at.x
        labelY = c.at.y
      } else if (typeof c.at === "number") {
        labelY = plot.y + c.at * plot.height
      }
      callouts.push({
        keyId: `callout-${r.ci}`,
        markX: r.px,
        markY: r.py,
        labelX,
        labelY,
        label: c.label,
        connector,
        markRadius: Math.max(r.markR + 3, 7),
        stroke: calloutColor,
        color: calloutColor,
        fontSize: 11,
        labelAnchor: "middle",
        // Text sits above the anchor point so a bottom-edge label stays in bounds.
        labelBaseline: "auto",
      })
    }
  }

  // ── Chrome overlay (pointer-events:none) ──────────────────────────────────────
  const overlays = renderChrome(geom, {
    markerDots,
    markerColor,
    iconMarks,
    iconColor,
    iconStrokeWidth,
    callouts,
    plot,
    showEnclosures,
    showColumnHeaders,
    showRowLabels,
    enclosureColor: cfg.enclosureColor ?? "var(--semiotic-text, #f4f4f8)",
    enclosureRadius: cfg.enclosureRadius ?? 9,
    enclosureOpacity: cfg.enclosureOpacity ?? 0.5,
    enclosureWidth: cfg.enclosureWidth ?? 1.5,
    headerColor: cfg.headerColor ?? "var(--semiotic-text, #f4f4f8)",
    labelColor: cfg.labelColor ?? "var(--semiotic-text-secondary, #b9b9c8)",
    headerFontSize: cfg.headerFontSize ?? 13,
    labelFontSize: cfg.labelFontSize ?? 11,
    headerY: plot.y + headerH * 0.62,
    labelX: plot.x + labelW - 10,
    columnLabel: cfg.columnLabel,
    rowLabel: cfg.rowLabel,
  })

  return { sceneNodes, overlays }
}

// ── Geometry builder (cache-miss path) ──────────────────────────────────────────

interface BuildOpts {
  columnOrder: string[]
  rowOrder: string[]
  innerX: number
  innerY: number
  innerW: number
  innerH: number
  rowMode: "banded" | "stacked"
  cellSizing: "proportional" | "uniform"
  proportionExponent: number
  columnGap: number
  rowGap: number
  packPadding: number
  iterations: number
}

const ENCLOSURE_PAD = 4

function buildGeometry(raw: RawMark[], o: BuildOpts): Geom {
  const byCol = new Map<string, RawMark[]>()
  for (const m of raw) {
    let arr = byCol.get(m.col)
    if (!arr) {
      arr = []
      byCol.set(m.col, arr)
    }
    arr.push(m)
  }

  const cols = o.columnOrder.filter((c) => byCol.has(c))
  const colGapTotal = o.columnGap * Math.max(0, cols.length - 1)
  const usableW = Math.max(1, o.innerW - colGapTotal)
  const e = o.proportionExponent
  const colWeights = cols.map((c) => Math.pow(byCol.get(c)!.length, e))
  const colWeightSum = colWeights.reduce((s, w) => s + w, 0) || 1
  const colW = (ci: number) =>
    o.cellSizing === "uniform" ? usableW / cols.length : (colWeights[ci] / colWeightSum) * usableW

  const positions = new Map<string, { px: number; py: number }>()
  const colBands: { col: string; x: number; w: number }[] = []
  let xCursor = o.innerX
  for (let ci = 0; ci < cols.length; ci++) {
    colBands.push({ col: cols[ci], x: xCursor, w: colW(ci) })
    xCursor += colW(ci) + o.columnGap
  }

  let seed = 1
  // Track each row's mark-bbox so we can draw enclosures and align labels.
  const rowBBox = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>()
  const cellBBoxes: EnclosureRect[] = []
  const grow = (row: string, x: number, y: number, r: number) => {
    let b = rowBBox.get(row)
    if (!b) {
      b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      rowBBox.set(row, b)
    }
    if (x - r < b.minX) b.minX = x - r
    if (x + r > b.maxX) b.maxX = x + r
    if (y - r < b.minY) b.minY = y - r
    if (y + r > b.maxY) b.maxY = y + r
  }

  const packInto = (marks: RawMark[], x: number, y: number, w: number, h: number, row: string): EnclosureRect | null => {
    const packMarks = marks.map((m) => ({ id: m.id, r: m.packR }))
    const pos = packCell(packMarks, x, y, w, h, o.packPadding, o.iterations, seed++)
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const pm of packMarks) {
      const p = pos.get(pm.id)!
      positions.set(pm.id, { px: p.px, py: p.py })
      grow(row, p.px, p.py, pm.r)
      if (p.px - pm.r < minX) minX = p.px - pm.r
      if (p.px + pm.r > maxX) maxX = p.px + pm.r
      if (p.py - pm.r < minY) minY = p.py - pm.r
      if (p.py + pm.r > maxY) maxY = p.py + pm.r
    }
    if (!Number.isFinite(minX)) return null
    return { x: minX - ENCLOSURE_PAD, y: minY - ENCLOSURE_PAD, w: maxX - minX + ENCLOSURE_PAD * 2, h: maxY - minY + ENCLOSURE_PAD * 2 }
  }

  if (o.rowMode === "banded") {
    // Global, bottom-anchored row bands: every column shares one y-range per row,
    // so row labels align and each band gets one enclosure spanning the columns.
    // A column only occupies bands it has data in, so columns vary in height.
    const rowCountsG = new Map<string, number>()
    for (const m of raw) rowCountsG.set(m.row, (rowCountsG.get(m.row) ?? 0) + 1)
    const rows = o.rowOrder.filter((r) => rowCountsG.has(r))
    const rowGapTotal = o.rowGap * Math.max(0, rows.length - 1)
    const usableH = Math.max(1, o.innerH - rowGapTotal)
    const rowWeights = rows.map((r) => Math.pow(rowCountsG.get(r)!, e))
    const rowWeightSum = rowWeights.reduce((s, w) => s + w, 0) || 1

    const bandY = new Map<string, { y: number; h: number }>()
    let yCursor = o.innerY + o.innerH // bottom → top
    for (let ri = 0; ri < rows.length; ri++) {
      const bandH = o.cellSizing === "uniform" ? usableH / rows.length : (rowWeights[ri] / rowWeightSum) * usableH
      const y = yCursor - bandH
      bandY.set(rows[ri], { y, h: bandH })
      yCursor = y - o.rowGap
    }

    cols.forEach((col, ci) => {
      const byRow = groupBy(byCol.get(col)!, (m) => m.row)
      for (const row of rows) {
        const rowMarks = byRow.get(row)
        const band = bandY.get(row)
        if (!rowMarks || !band) continue
        packInto(rowMarks, colBands[ci].x, band.y, colBands[ci].w, band.h, row)
      }
    })

    const enclosures: EnclosureRect[] = []
    const rowLabelY = new Map<string, number>()
    for (const row of rows) {
      const band = bandY.get(row)!
      rowLabelY.set(row, band.y + band.h / 2)
      const b = rowBBox.get(row)
      if (b && Number.isFinite(b.minX)) {
        enclosures.push({ x: b.minX - ENCLOSURE_PAD, y: b.minY - ENCLOSURE_PAD, w: b.maxX - b.minX + ENCLOSURE_PAD * 2, h: b.maxY - b.minY + ENCLOSURE_PAD * 2 })
      }
    }
    return { positions, enclosures, colBands, rowLabelY }
  }

  // stacked: each column stacks its own rows (cell height ∝ that column's count).
  const rowYAccum = new Map<string, { sum: number; n: number }>()
  cols.forEach((col, ci) => {
    const byRow = groupBy(byCol.get(col)!, (m) => m.row)
    const rowsHere = o.rowOrder.filter((r) => byRow.has(r))
    const rowGapTotal = o.rowGap * Math.max(0, rowsHere.length - 1)
    const usableColH = Math.max(1, o.innerH - rowGapTotal)
    const rowWeights = rowsHere.map((r) => Math.pow(byRow.get(r)!.length, e))
    const rowWeightSum = rowWeights.reduce((s, w) => s + w, 0) || 1

    let yCursor = o.innerY + o.innerH
    rowsHere.forEach((row, ri) => {
      const cellH =
        o.cellSizing === "uniform" ? usableColH / rowsHere.length : (rowWeights[ri] / rowWeightSum) * usableColH
      const cellY = yCursor - cellH
      const box = packInto(byRow.get(row)!, colBands[ci].x, cellY, colBands[ci].w, cellH, row)
      if (box) {
        cellBBoxes.push(box)
        const acc = rowYAccum.get(row) ?? { sum: 0, n: 0 }
        acc.sum += box.y + box.h / 2
        acc.n += 1
        rowYAccum.set(row, acc)
      }
      yCursor = cellY - o.rowGap
    })
  })

  const rowLabelY = new Map<string, number>()
  for (const [r, a] of rowYAccum) rowLabelY.set(r, a.sum / a.n)
  return { positions, enclosures: cellBBoxes, colBands, rowLabelY }
}

/**
 * Seeded, deterministic packing of variable-radius circles within a cell rect.
 *
 * A jittered grid sized to the cell aspect seeds the marks near-uniformly (so
 * they start close to non-overlapping at a comfortable density), then a few
 * spatial-hash relaxation passes push apart any overlaps and clamp to the cell.
 *
 * Deliberately self-contained (no `d3-force` / `d3-quadtree`): the hot loop must
 * not cross module boundaries, because the docs bundle disables scope hoisting
 * and a cross-module tight loop deoptimizes badly (≈25× slower). Native `Map`
 * + arithmetic keeps it fast in any build.
 */
function packCell(
  marks: { id: string; r: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
  padding: number,
  iterations: number,
  seed: number
): Map<string, { px: number; py: number }> {
  const cx = x + w / 2
  const cy = y + h / 2
  const out = new Map<string, { px: number; py: number }>()
  const n = marks.length
  if (n === 0) return out
  if (n === 1) {
    out.set(marks[0].id, { px: cx, py: cy })
    return out
  }

  const rng = lcg(seed)
  const R = new Float64Array(n)
  let maxR = 0
  for (let i = 0; i < n; i++) {
    R[i] = marks[i].r + padding
    if (R[i] > maxR) maxR = R[i]
  }

  // Jittered grid seed sized to the cell aspect ratio.
  const cols = Math.max(1, Math.round(Math.sqrt((n * w) / Math.max(1, h))))
  const px = new Float64Array(n)
  const py = new Float64Array(n)
  const gw = w / cols
  const gh = h / Math.ceil(n / cols)
  for (let i = 0; i < n; i++) {
    const gx = i % cols
    const gy = Math.floor(i / cols)
    px[i] = x + (gx + 0.3 + rng() * 0.4) * gw
    py[i] = y + (gy + 0.3 + rng() * 0.4) * gh
  }

  // Spatial-hash relaxation. A near-uniform seed needs only light cleanup, so a
  // small fixed pass count fully separates at the capped density.
  const passes = Math.max(0, Math.min(iterations, 14))
  const cellSz = Math.max(1, maxR * 2)
  const buckets = new Map<number, number[]>()
  const cwid = Math.max(1, Math.ceil(w / cellSz) + 3)
  const bucketKey = (gx: number, gy: number): number => (gy + 1) * cwid + (gx + 1)
  for (let pass = 0; pass < passes; pass++) {
    buckets.clear()
    for (let i = 0; i < n; i++) {
      const k = bucketKey(Math.floor((px[i] - x) / cellSz), Math.floor((py[i] - y) / cellSz))
      const arr = buckets.get(k)
      if (arr) arr.push(i)
      else buckets.set(k, [i])
    }
    for (let i = 0; i < n; i++) {
      const gx = Math.floor((px[i] - x) / cellSz)
      const gy = Math.floor((py[i] - y) / cellSz)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const arr = buckets.get(bucketKey(gx + dx, gy + dy))
          if (!arr) continue
          for (let a = 0; a < arr.length; a++) {
            const j = arr[a]
            if (j <= i) continue
            let ddx = px[j] - px[i]
            let ddy = py[j] - py[i]
            const rr = R[i] + R[j]
            const d2 = ddx * ddx + ddy * ddy
            if (d2 >= rr * rr) continue
            if (d2 > 1e-9) {
              const d = Math.sqrt(d2)
              const shift = (rr - d) / 2
              ddx /= d
              ddy /= d
              px[i] -= ddx * shift
              py[i] -= ddy * shift
              px[j] += ddx * shift
              py[j] += ddy * shift
            } else {
              // Coincident: nudge apart deterministically.
              const ang = i * 2.39996323
              px[i] += Math.cos(ang) * R[i]
              py[i] += Math.sin(ang) * R[i]
            }
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const r = R[i]
      const loX = x + r
      const hiX = x + w - r
      const loY = y + r
      const hiY = y + h - r
      px[i] = hiX > loX ? clamp(px[i], loX, hiX) : cx
      py[i] = hiY > loY ? clamp(py[i], loY, hiY) : cy
    }
  }

  for (let i = 0; i < n; i++) out.set(marks[i].id, { px: px[i], py: py[i] })
  return out
}

/** FNV-1a fingerprint of the inputs that affect packing geometry. */
function fingerprint(raw: RawMark[]): string {
  let h = 2166136261 >>> 0
  const mix = (str: string): void => {
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
  }
  for (const m of raw) {
    mix(m.id)
    mix(m.col)
    mix(m.row)
    h ^= Math.round(m.packR * 8)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

// ── Chrome overlay ──────────────────────────────────────────────────────────────

interface ChromeOpts {
  plot: { x: number; y: number; width: number; height: number }
  markerDots: { x: number; y: number; r: number }[]
  markerColor: string
  iconMarks: { x: number; y: number; size: number; shape: NetworkSymbolName; opacity: number }[]
  iconColor: string
  iconStrokeWidth: number
  callouts: MarkCalloutProps[]
  showEnclosures: boolean
  showColumnHeaders: boolean
  showRowLabels: boolean
  enclosureColor: string
  enclosureRadius: number
  enclosureOpacity: number
  enclosureWidth: number
  headerColor: string
  labelColor: string
  headerFontSize: number
  labelFontSize: number
  headerY: number
  labelX: number
  columnLabel?: (col: string) => string
  rowLabel?: (row: string) => string
}

function renderChrome(geom: Geom, c: ChromeOpts): ReactNode {
  const colLabel = c.columnLabel ?? ((s: string) => s)
  const rowLabel = c.rowLabel ?? ((s: string) => s)
  return (
    <g className="packed-cluster-matrix-chrome" style={{ pointerEvents: "none" }}>
      {/* Group enclosures (per-cell in stacked, per-band in banded). */}
      {c.showEnclosures &&
        geom.enclosures.map((b, i) =>
          roundedEnclosure({
            keyId: `enc-${i}`,
            x: b.x,
            y: b.y,
            width: b.w,
            height: b.h,
            radius: c.enclosureRadius,
            stroke: c.enclosureColor,
            strokeWidth: c.enclosureWidth,
            opacity: c.enclosureOpacity,
          })
        )}

      {/* Inner stroked icons — the composite-glyph decorator (drawn on top). */}
      {c.iconMarks.length > 0 && (
        <g className="packed-cluster-matrix-icons">
          {c.iconMarks.map((m, i) => (
            <path
              key={`ic-${i}`}
              d={symbolPathString(m.shape, m.size)}
              transform={`translate(${m.x},${m.y})`}
              fill="none"
              stroke={c.iconColor}
              strokeWidth={c.iconStrokeWidth}
              opacity={m.opacity}
            />
          ))}
        </g>
      )}

      {/* Decorative marker dots (e.g. U.K.). */}
      {c.markerDots.length > 0 && (
        <g className="packed-cluster-matrix-markers">
          {c.markerDots.map((d, i) => (
            <circle key={`mk-${i}`} cx={d.x} cy={d.y} r={d.r} fill={c.markerColor} />
          ))}
        </g>
      )}

      {c.showColumnHeaders &&
        geom.colBands.map((b, i) =>
          bandLabel({
            keyId: `col-${i}`,
            text: colLabel(b.col),
            x: b.x + b.w / 2,
            y: c.headerY,
            anchor: "middle",
            fontSize: c.headerFontSize,
            fontWeight: 700,
            color: c.headerColor,
          })
        )}

      {c.showRowLabels &&
        [...geom.rowLabelY].map(([row, y]) =>
          bandLabel({
            keyId: `row-${row}`,
            text: rowLabel(row),
            x: c.labelX,
            y,
            anchor: "end",
            fontSize: c.labelFontSize,
            fontWeight: 600,
            color: c.labelColor,
          })
        )}

      {c.callouts.map((co) => markCallout(co))}
    </g>
  )
}
