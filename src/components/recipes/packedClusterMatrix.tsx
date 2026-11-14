import { fnv1a32 } from "../utils/hash"
import * as React from "react"
import type { ReactNode } from "react"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type { NetworkSceneNode, NetworkSymbolNode } from "../stream/networkTypes"
import type { NetworkSymbolName } from "../stream/symbolPath"
import { SYMBOL_SEQUENCE, symbolExtent, symbolPathString } from "../stream/symbolPath"
import { makeShade, readField, dimFor, signatureKey, LayoutCache } from "./recipeUtils"
import { roundedEnclosure, bandLabel, markCallout } from "./recipeChrome"
import type { MarkCalloutProps } from "./recipeChrome"
import type { Datum } from "../charts/shared/datumTypes"
import { NetworkPerspectiveBillboard, NetworkPerspectiveGround } from "../stream/networkPerspectivePlacement"
import { buildGeometry, type Geom } from "./packedClusterMatrixGeometry"
import { packedMatrixPerspectiveBounds } from "./packedClusterMatrixPerspective"

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
  /** Column order prefix; unlisted columns follow by count, largest first. */
  columnOrder?: string[]
  /** Row order prefix **bottom→top**; unlisted rows follow by count, largest first. */
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
  /** Cap padded glyph extent area in each cell at this fraction; all radii scale
   *  together to fit the densest cell, preserving size comparisons. @default 0.4 */
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
  /** `"proportional"` sizes columns/rows by counts; banded cell area reflects
   *  marginal counts, stacked cells use within-column counts (before gaps).
   *  `"uniform"` gives equal column/row spans. @default "proportional" */
  cellSizing?: "proportional" | "uniform"
  /** Exponent applied to counts when sizing columns/rows. `1` = proportional
   *  spans; `<1` softens the range so small columns stay legible. @default 1 */
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

// Geometry cache keyed by a content signature of layout-affecting inputs only
// (NOT color/shade/highlight) — so interaction and a returning resize reuse
// the packing. Shape extents participate through the per-mark fingerprint.
const GEOM_CACHE = /* @__PURE__ */ new LayoutCache<Geom>(12)

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

/**
 * `packedClusterMatrix` — a reusable network layout that arranges a flat set of
 * records into a **matrix of densely-packed clusters**: one column per value of
 * `columnAccessor`, cells stacked within a column per value of `rowAccessor`,
 * each cell a beeswarm of variable-radius glyphs. In `"proportional"` sizing the
 * column widths and row heights track counts. Aligned banded cells reflect
 * marginal counts, not individual cell counts; stacked cells use within-column
 * counts. A shared glyph scale fits the densest cell without changing size ratios.
 *
 * Each record renders as a **four-channel glyph**: shape (`symbolAccessor`),
 * hue (`colorAccessor`), size (`sizeAccessor`, area-encoded), and lightness
 * shade (`shadeAccessor`). Packing uses a deterministic jittered grid and
 * spatial-hash relaxation. Geometry is cached, so hover/selection/filter re-runs re-style without
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
    if (!Number.isFinite(v)) v = dmin
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
      const base = colorMap && Object.prototype.hasOwnProperty.call(colorMap, colorKey) && typeof colorMap[colorKey] === "string" && colorMap[colorKey] ? colorMap[colorKey] : ctx.resolveColor(colorKey)
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
    iconAcc && iconMap && Object.prototype.hasOwnProperty.call(iconMap, val) ? iconMap[val] ?? null : null
  // The base shape: a circle in icon mode, otherwise the symbol encoding.
  const baseShapeFor = (m: RawMark): NetworkSymbolName => (iconAcc ? "circle" : symbolFor(m.symVal))

  // Use true circumradii so pointy symbols participate in the same density
  // and separation checks as circles. Actual cell occupancy sets the fit.
  const maxAreaFraction = Number.isFinite(cfg.maxAreaFraction)
    ? clamp(cfg.maxAreaFraction!, 0, 1) : 0.4
  for (const m of raw) {
    const r = radiusOf(m.sizeVal)
    m.baseShape = baseShapeFor(m)
    m.iconShape = iconFor(m.iconVal)
    m.size = Math.PI * r * r
    m.packR = symbolExtent(m.baseShape, m.size)
  }

  // ── Resolve orders ────────────────────────────────────────────────────────
  const colCounts = new Map<string, number>()
  const rowCounts = new Map<string, number>()
  for (const m of raw) {
    colCounts.set(m.col, (colCounts.get(m.col) ?? 0) + 1)
    rowCounts.set(m.row, (rowCounts.get(m.row) ?? 0) + 1)
  }
  const ordered = (counts: Map<string, number>, hint: string[] = []) =>
    [...new Set([...hint.filter(k => counts.has(k)),
      ...[...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!)])]
  const columnOrder = ordered(colCounts, cfg.columnOrder)
  const rowOrder = ordered(rowCounts, cfg.rowOrder)

  // ── Geometry (cached) ───────────────────────────────────────────────────────
  // Sign by layout-affecting inputs only (plus a per-mark fingerprint) — never by
  // `ctx.nodes` array identity, which is fresh every buildScene. See LayoutCache.
  const sig = signatureKey([
    plot.x,
    plot.y,
    plot.width,
    plot.height,
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
    JSON.stringify(columnOrder),
    JSON.stringify(rowOrder),
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
      maxAreaFraction,
    })
  )
  for (const m of raw) {
    m.size *= geom.scale * geom.scale
    m.packR *= geom.scale
  }

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
      markerDots.push({ x: g.px, y: g.py, r: Math.sqrt(m.size / Math.PI) * 0.4 })
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
  const chrome: ChromeOpts = {
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
  }
  const overlays = renderChrome(geom, chrome)

  // The chrome places itself under a perspective and reaches past the marks: declare it for the fit.
  const bounds = ctx.perspective ? { perspectiveBounds: packedMatrixPerspectiveBounds(geom, chrome) } : {}
  return { sceneNodes, overlays, perspective: "manual", ...bounds }
}

/** FNV-1a fingerprint of the inputs that affect packing geometry. */
function fingerprint(raw: RawMark[]): string {
  let h = 2166136261 >>> 0
  for (const m of raw) {
    h = fnv1a32(JSON.stringify([m.id, m.col, m.row, m.packR]), h)
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
  // Under a `perspective`, icons and dots lie on their token; labels and callouts stand.
  const lie = (key: string, x: number, y: number, node: ReactNode) => <NetworkPerspectiveBillboard key={key} x={x} y={y} onGround>{node}</NetworkPerspectiveBillboard>
  const stand = (key: string, x: number, y: number, z: number | "top", node: ReactNode) => <NetworkPerspectiveBillboard key={key} x={x} y={y} z={z}>{node}</NetworkPerspectiveBillboard>
  return (
    <g className="packed-cluster-matrix-chrome" style={{ pointerEvents: "none" }}>
      {/* Group enclosures (per-cell in stacked, per-band in banded). */}
      <NetworkPerspectiveGround>
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
      </NetworkPerspectiveGround>

      {/* Inner stroked icons — the composite-glyph decorator (drawn on top). */}
      {c.iconMarks.length > 0 && (
        <g className="packed-cluster-matrix-icons">
          {c.iconMarks.map((m, i) => lie(`ic-${i}`, m.x, m.y,
            <path
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
          {c.markerDots.map((d, i) => lie(`mk-${i}`, d.x, d.y, <circle cx={d.x} cy={d.y} r={d.r} fill={c.markerColor} />))}
        </g>
      )}

      {c.showColumnHeaders &&
        geom.colBands.map((b, i) => stand(`col-${i}`, b.x + b.w / 2, c.headerY, 0,
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
        ))}

      {c.showRowLabels &&
        [...geom.rowLabelY].map(([row, y]) => stand(`row-${row}`, c.labelX, y, 0,
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
        ))}

      {c.callouts.map((co) => stand(String(co.keyId), co.markX, co.markY, "top", markCallout(co)))}
    </g>
  )
}
