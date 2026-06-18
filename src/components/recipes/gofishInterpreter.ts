import { hierarchy, treemap as d3treemap, treemapSquarify } from "d3-hierarchy"
import type { Datum } from "../charts/shared/datumTypes"
import type { CustomLayout, LayoutContext } from "../stream/customLayout"
import type { OrdinalCustomLayout, OrdinalLayoutContext } from "../stream/ordinalCustomLayout"
import type { OrdinalSceneNode } from "../stream/ordinalTypes"
import type { Style } from "../stream/types"
import type { GofishGlyphMark } from "./gofish"
import { createGofishGlyphLayout, datumFromFields, petalPath, polarPoint, smoothClosedPath, stableGlyphId } from "./gofish"
import { resolveLambda } from "./gofishLambdas"
import type { GofishLambda, GofishLambdaPrimitive } from "./gofishLambdas"
import type {
  GofishChannelValue,
  GofishMarkIR,
  GofishOperatorIR,
  GofishRootIR,
} from "./gofishIR"

/**
 * GoFish IR interpreter.
 *
 * Walks a `data → operators → mark` tree and *executes* the grammar —
 * `group`/`spread`/`stack`/`scatter`/`treemap`/`layer`, the `polar`/`unit`
 * coordinate transforms, mark channels through scales, and `connect`/`ref`/
 * `arrow` relations — emitting positioned primitives. This is a real
 * translator, not a recognizer: any spec built from these constructs renders.
 *
 * It is NOT GoFish's full constraint solver. GoFish elaborates `spread` to
 * `layer + distribute + align` over a linear-system bbox; we implement the
 * deterministic allocation/accumulation model the common acyclic specs reduce
 * to. Constructs outside it (`table`, `cut`, `mask`, `over`/`inside`/`xor`,
 * free-form `.constrain`) record a warning and fall back, never silently
 * mis-render. The two sanctioned non-grammar paths — `derive` and `mark-fn`
 * lambdas — resolve through the lambda registry.
 */

export interface InterpretOptions {
  /** Per-call lambda overrides for `derive`/`mark-fn` (merged over the registry). */
  lambdas?: Record<string, GofishLambda>
  /** Collected warnings for unsupported constructs / unresolved lambdas. */
  warnings?: string[]
}

type Coord = "none" | "unit" | "polar"

interface Region {
  /** Local-space box. `none`: pixels. `unit`: [0,1]. `polar`: θ∈[0,2π] × r∈[0,Rpx]. */
  x0: number
  y0: number
  x1: number
  y1: number
}

interface PolarFrame {
  cx: number
  cy: number
  rMax: number
}

interface NamedFrame {
  name: string
  /** Pixel bbox + anchor (center). */
  cx: number
  cy: number
  bbox: { x: number; y: number; w: number; h: number }
}

interface Relation {
  kind: "connect" | "arrow"
  refs: string[]
  fill?: string
  stroke?: string
  opacity?: number
  interpolation?: "linear" | "bezier"
}

interface Engine {
  marks: GofishGlyphMark[]
  frames: Map<string, NamedFrame>
  relations: Relation[]
  resolveColor: (key: string, datum?: Datum) => string
  options: InterpretOptions
  warnings: string[]
  ids: { n: number }
  /** Max absolute value per numeric field across all rows — the shared value scale. */
  domains: Map<string, number>
  /**
   * Transient per-sibling-set scale override. A `spread`/`scatter` that
   * aggregates a size channel (e.g. a stem = sum of a lake's catch) sets the
   * domain to the max *aggregated* sibling value here, so bars scale against
   * each other rather than the max single row. Restored after the subtree.
   */
  sizeOverride: Map<string, number>
  /** Polar segments recorded for ribbon stitching (a `connect` over series). */
  polarSegments: Array<{ group?: string; cx: number; cy: number; innerR: number; outerR: number; theta0: number; theta1: number }>
}

// ── Channel resolution ───────────────────────────────────────────────────

function readField(datum: Datum | undefined, path: string): unknown {
  if (!datum) return undefined
  if (!path.includes(".")) return datum[path]
  return path.split(".").reduce<unknown>((acc, key) => (acc == null ? undefined : (acc as Datum)[key]), datum)
}

/** Resolve a channel to a concrete value for a datum. */
function channel(value: GofishChannelValue | undefined, datum: Datum | undefined): unknown {
  if (value == null) return undefined
  if (typeof value === "object") {
    const v = value as { type?: string; name?: string; datum?: unknown }
    if (v.type === "field" && typeof v.name === "string") return readField(datum, v.name)
    if (v.type === "datum") return v.datum
    return undefined
  }
  if (typeof value === "string") {
    const field = readField(datum, value)
    return field !== undefined ? field : value // bare string = field, else literal
  }
  return value
}

function numChannel(value: GofishChannelValue | undefined, datum: Datum | undefined): number | undefined {
  const v = channel(value, datum)
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function sumChannel(value: GofishChannelValue | undefined, rows: Datum[]): number {
  let sum = 0
  for (const r of rows) {
    const n = numChannel(value, r)
    if (n != null) sum += n
  }
  return sum
}

/** The data field a channel reads, or null for a literal. */
function fieldOf(value: GofishChannelValue | undefined): string | null {
  if (value == null) return null
  if (typeof value === "object") {
    const v = value as { type?: string; name?: string }
    return v.type === "field" && typeof v.name === "string" ? v.name : null
  }
  return null
}

/**
 * Pixel extent for a size channel within an axis extent:
 * - field  → value-scaled bar (sum / global-max × extent)
 * - number → literal pixels (clamped)
 * - absent → fills the extent
 */
function sizePx(value: GofishChannelValue | undefined, rows: Datum[], extent: number, engine: Engine): number {
  const field = fieldOf(value)
  if (field) {
    const max = engine.sizeOverride.get(field) ?? engine.domains.get(field) ?? 0
    if (max <= 0) return extent
    return Math.max(0, Math.min(1, sumChannel(value, rows) / max)) * extent
  }
  if (typeof value === "number") return Math.min(value, extent)
  return extent
}

/** The field a node's cross-axis size channel reads (first such leaf), or null. */
function leafSizeField(node: GofishMarkIR, axis: "x" | "y"): string | null {
  if (isCombinator(node)) {
    for (const child of node.children ?? []) {
      const f = leafSizeField(child, axis)
      if (f) return f
    }
    return null
  }
  return fieldOf((axis === "y" ? node.h : node.w) as GofishChannelValue)
}

/**
 * Set the shared scale for a value-scaled sibling set: the domain is the max
 * *aggregated* value across groups (so a summed stem isn't measured against the
 * max single row). Returns a restore fn. No-op when there is no field/`by`.
 */
function withAggregatedScale(
  node: GofishMarkIR,
  groups: Array<{ rows: Datum[] }>,
  axis: "x" | "y",
  engine: Engine
): () => void {
  const template = (node.children ?? [])[0]
  if (!template || groups.length === 0) return () => {}
  const field = leafSizeField(template, axis)
  if (!field) return () => {}
  const channel: GofishChannelValue = { type: "field", name: field }
  const max = Math.max(...groups.map((g) => sumChannel(channel, g.rows)), 0)
  if (max <= (engine.domains.get(field) ?? 0)) return () => {}
  const prev = engine.sizeOverride.get(field)
  engine.sizeOverride.set(field, max)
  return () => {
    if (prev === undefined) engine.sizeOverride.delete(field)
    else engine.sizeOverride.set(field, prev)
  }
}

// ── Operator/mark helpers ──────────────────────────────────────────────────

const LAYOUT_OPS = new Set(["spread", "stack", "scatter", "treemap", "group"])
const DATA_OPS = new Set(["derive", "log"])

function applyDataOperators(
  rows: Datum[],
  operators: GofishOperatorIR[],
  options: InterpretOptions,
  warnings: string[]
): Datum[] {
  let next = rows
  for (const op of operators) {
    if (op.type === "derive") {
      const id = op.lambdaId as string | undefined
      const lambda = id ? resolveLambda(id, options.lambdas) : undefined
      if (lambda && lambda.kind === "derive") next = lambda.fn(next)
      else if (id) warnings.push(`derive lambda "${id}" is not registered; passing data through.`)
    }
  }
  return next
}

function rootWithFrameData(root: GofishRootIR, data: Datum[]): GofishRootIR {
  const rows = data as Array<Record<string, unknown>>
  if (root.type === "chart") {
    if (root.data?.type !== "inline") return root
    return { ...root, data: { ...root.data, rows } }
  }
  if (root.type === "layer") {
    return {
      ...root,
      charts: root.charts.map((chart) =>
        chart.data?.type === "inline"
          ? { ...chart, data: { ...chart.data, rows } }
          : chart
      ),
    }
  }
  return root
}

/** Fold a chart's `.flow()` operators into a single combinator-mark tree around the mark. */
function chartToNode(operators: GofishOperatorIR[], mark: GofishMarkIR): GofishMarkIR {
  let node = mark
  for (let i = operators.length - 1; i >= 0; i--) {
    const op = operators[i]
    node = {
      type: op.type,
      __combinator: true,
      options: { ...op },
      children: [node],
    } as GofishMarkIR
  }
  return node
}

function partition(rows: Datum[], by: string): Array<{ key: string; rows: Datum[] }> {
  const order: string[] = []
  const map = new Map<string, Datum[]>()
  const field = by.startsWith("datum.") ? by.slice("datum.".length) : by
  for (const r of rows) {
    const k = String(readField(r, field))
    if (!map.has(k)) {
      map.set(k, [])
      order.push(k)
    }
    map.get(k)!.push(r)
  }
  return order.map((key) => ({ key, rows: map.get(key)! }))
}

/** Raw (unscaled) size of a node along an axis — used to allocate stacks. */
function sizeValue(node: GofishMarkIR, rows: Datum[], axis: "x" | "y"): number {
  if (isCombinator(node)) {
    const dir = (node.options?.dir as string) ?? "y"
    const kids = node.children ?? []
    if (node.type === "stack") {
      // glued: sum along its dir, else max
      const childSizes = kids.map((k) => sizeValue(k, rows, axis))
      return dir === axis ? childSizes.reduce((a, b) => a + b, 0) : Math.max(0, ...childSizes)
    }
    return Math.max(0, ...kids.map((k) => sizeValue(k, rows, axis)), 1)
  }
  const ch = axis === "y" ? node.h : node.w
  const v = sumChannel(ch as GofishChannelValue, rows)
  return v > 0 ? v : rows.length || 1
}

function isCombinator(node: GofishMarkIR): boolean {
  return node.__combinator === true && Array.isArray(node.children)
}

// ── Helpers ────────────────────────────────────────────────────────────────

function nextId(engine: Engine, prefix: string): string {
  engine.ids.n += 1
  return `${prefix}-${engine.ids.n}`
}

/** Sample `n+1` points along an arc — for filled polar wedges / ribbons. */
function sampleArc(cx: number, cy: number, r: number, t0: number, t1: number, n: number): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  for (let i = 0; i <= n; i++) pts.push(polarPoint(cx, cy, r, t0 + (t1 - t0) * (i / n)))
  return pts
}

// ── Core walk ────────────────────────────────────────────────────────────

function place(
  node: GofishMarkIR,
  region: Region,
  rows: Datum[],
  coord: Coord,
  polar: PolarFrame | null,
  engine: Engine,
  fill = false
): void {
  // Coordinate transform on this node?
  const coordObj = node.options?.coord as UnitCoordOption | undefined
  const coordOpt = coordObj?.type
  if (coordOpt === "polar" && coord !== "polar") {
    const cx = (region.x0 + region.x1) / 2
    const cy = (region.y0 + region.y1) / 2
    const rMax = Math.min(Math.abs(region.x1 - region.x0), Math.abs(region.y1 - region.y0)) / 2
    const pf: PolarFrame = { cx, cy, rMax }
    // An inner-radius fraction leaves a center hole (radial bars start there).
    const innerR = typeof coordObj?.innerRadius === "number" ? Math.max(0, Math.min(0.95, coordObj.innerRadius)) * rMax : 0
    const polarRegion: Region = { x0: 0, y0: innerR, x1: 2 * Math.PI, y1: rMax }
    placeChildrenInto(node, polarRegion, rows, "polar", pf, engine)
    return
  }
  if (coordOpt === "unit" && coord !== "unit") {
    // Establish a unit [0,1] region mapped onto the pixel region. The default
    // `fill` projection stretches [0,1]² across the region; `fit: "uniform"`
    // scales x/y by a single factor (aspect-preserving) so a pictorial glyph —
    // round pearls, square ice — isn't distorted, and anchors the content box
    // within the region (e.g. cups sitting on a shared baseline).
    const proj = makeUnitProjection(region, coordObj, rows[0])
    for (const child of node.children ?? []) emitLeafUnit(child, region, rows, engine, proj)
    return
  }

  if (isCombinator(node)) {
    placeCombinator(node, region, rows, coord, polar, engine, fill)
    return
  }
  emitLeaf(node, region, rows, coord, polar, engine, fill)
}

/** Re-dispatch a coord-wrapping `layer`/combinator's children in the new coord. */
function placeChildrenInto(
  node: GofishMarkIR,
  region: Region,
  rows: Datum[],
  coord: Coord,
  polar: PolarFrame | null,
  engine: Engine
): void {
  for (const child of node.children ?? []) place(child, region, rows, coord, polar, engine)
}

interface UnitCoordOption {
  type?: string
  innerRadius?: number
  /** `"fill"` (default) stretches [0,1]² across the region; `"uniform"` preserves aspect. */
  fit?: "fill" | "uniform"
  /** Datum field carrying the content box `[bw, bh]` (uniform fit only); default `[1, 1]`. */
  boxField?: string
  /** Horizontal anchor of the content box within the region (uniform fit). @default "center" */
  anchorX?: "start" | "center" | "end"
  /** Vertical anchor of the content box within the region (uniform fit). @default "center" */
  anchorY?: "start" | "center" | "end"
}

/** Maps unit [0,1] coords onto a pixel region — `ux`/`uy` for points, `us` for sizes/radii. */
interface UnitProjection {
  ux: (v: number) => number
  uy: (v: number) => number
  us: (v: number) => number
}

function makeUnitProjection(region: Region, coord: UnitCoordOption | undefined, datum: Datum | undefined): UnitProjection {
  const x0 = Math.min(region.x0, region.x1)
  const y0 = Math.min(region.y0, region.y1)
  const w = Math.abs(region.x1 - region.x0)
  const h = Math.abs(region.y1 - region.y0)
  if (coord?.fit !== "uniform") {
    return { ux: (v) => x0 + v * w, uy: (v) => y0 + v * h, us: (v) => v * Math.min(w, h) }
  }
  let bw = 1
  let bh = 1
  const box = coord.boxField ? readField(datum, coord.boxField) : undefined
  if (Array.isArray(box) && box.length === 2) {
    bw = Number(box[0]) > 0 ? Number(box[0]) : 1
    bh = Number(box[1]) > 0 ? Number(box[1]) : 1
  }
  const s = Math.min(w / bw, h / bh)
  const slackX = w - s * bw
  const slackY = h - s * bh
  const offX = coord.anchorX === "start" ? 0 : coord.anchorX === "end" ? slackX : slackX / 2
  const offY = coord.anchorY === "start" ? 0 : coord.anchorY === "end" ? slackY : slackY / 2
  return { ux: (v) => x0 + offX + v * s, uy: (v) => y0 + offY + v * s, us: (v) => v * s }
}

function placeCombinator(
  node: GofishMarkIR,
  region: Region,
  rows: Datum[],
  coord: Coord,
  polar: PolarFrame | null,
  engine: Engine,
  fill: boolean
): void {
  const opt = node.options ?? {}
  const type = node.type

  if (type === "derive" || type === "log") {
    const id = opt.lambdaId as string | undefined
    let next = rows
    if (type === "derive") {
      const lambda = id ? resolveLambda(id, engine.options.lambdas) : undefined
      if (lambda && lambda.kind === "derive") next = lambda.fn(rows)
      else if (id) engine.warnings.push(`derive lambda "${id}" is not registered; passing data through.`)
    }
    for (const child of node.children ?? []) place(child, region, next, coord, polar, engine, fill)
    return
  }

  if (type === "layer") {
    const kids = node.children ?? []
    const isBar = (c: GofishMarkIR): boolean =>
      !isCombinator(c) && (c.type === "rect" || c.type === "area") && fieldOf((c.h ?? c.w) as GofishChannelValue) != null
    const hasPolar = (c: GofishMarkIR): boolean => (c.options?.coord as { type?: string } | undefined)?.type === "polar"
    const bars = kids.filter(isBar)
    // Anchor glyph siblings (e.g. a polar flower head) to the top of a value-bar
    // sibling, so a flower sits atop its stem instead of floating mid-column.
    let anchorY: number | null = null
    let anchorX: number | null = null
    for (const child of bars) {
      place(child, region, rows, coord, polar, engine, fill)
      if (coord === "none") {
        const h = sizePx(child.h as GofishChannelValue, rows, region.y1 - region.y0, engine)
        anchorY = region.y1 - h
        anchorX = (region.x0 + region.x1) / 2
      }
    }
    for (const child of kids) {
      if (isBar(child)) continue
      if (anchorY != null && anchorX != null && hasPolar(child)) {
        // The polar layer may set `radiusFactor` (fraction of the column) to
        // size its glyph head; default 0.2.
        const factor = typeof child.options?.radiusFactor === "number" ? (child.options.radiusFactor as number) : 0.2
        const radius = Math.min(Math.abs(region.x1 - region.x0), Math.abs(region.y1 - region.y0)) * factor
        const sub: Region = { x0: anchorX - radius, y0: anchorY - radius, x1: anchorX + radius, y1: anchorY + radius }
        place(child, sub, rows, coord, polar, engine, fill)
      } else {
        place(child, region, rows, coord, polar, engine, fill)
      }
    }
    return
  }

  const by = opt.by as string | undefined

  if (type === "group") {
    const groups = by ? partition(rows, by) : [{ key: "", rows }]
    const child = (node.children ?? [])[0]
    if (!child) return
    for (const g of groups) place(child, region, g.rows, coord, polar, engine, fill)
    return
  }

  if (type === "spread") {
    distribute(node, region, rows, coord, polar, engine, false)
    return
  }
  if (type === "stack") {
    distribute(node, region, rows, coord, polar, engine, true)
    return
  }
  if (type === "scatter") {
    scatter(node, region, rows, coord, polar, engine)
    return
  }
  if (type === "treemap") {
    treemap(node, region, rows, coord, polar, engine)
    return
  }
  if (type === "connect" || type === "arrow") {
    recordRelation(node, rows, engine)
    return
  }

  engine.warnings.push(`Unsupported combinator "${type}" — children skipped.`)
}

/** Build the list of (child node, rows, key) instances a layout op lays out. */
function instances(
  node: GofishMarkIR,
  rows: Datum[]
): Array<{ node: GofishMarkIR; rows: Datum[]; key: string }> {
  const by = node.options?.by as string | undefined
  const kids = node.children ?? []
  if (by) {
    const template = kids[0]
    return partition(rows, by).map((g) => ({ node: template, rows: g.rows, key: g.key }))
  }
  if (kids.length > 1) return kids.map((k, i) => ({ node: k, rows, key: String(i) }))
  // single child: a leaf maps per row, a combinator takes the whole scope
  const only = kids[0]
  if (only && !isCombinator(only) && rows.length > 1) {
    return rows.map((r, i) => ({ node: only, rows: [r], key: String(i) }))
  }
  return only ? [{ node: only, rows, key: "0" }] : []
}

function distribute(
  node: GofishMarkIR,
  region: Region,
  rows: Datum[],
  coord: Coord,
  polar: PolarFrame | null,
  engine: Engine,
  glue: boolean
): void {
  const dir = ((node.options?.dir as string) ?? "x") === "y" ? "y" : "x"
  const spacing = Number(node.options?.spacing) || 0
  const items = instances(node, rows)
  if (items.length === 0) return
  // `sort: "asc" | "desc"` orders the segments by magnitude along this axis,
  // per group — e.g. each polar spoke stacks its species by count. Default is
  // insertion order.
  const sort = node.options?.sort
  if (sort === "asc" || sort === "desc") {
    items.sort((a, b) => {
      const av = sizeValue(a.node, a.rows, dir)
      const bv = sizeValue(b.node, b.rows, dir)
      return sort === "asc" ? av - bv : bv - av
    })
  }
  const axisLo = dir === "x" ? region.x0 : region.y0
  const axisHi = dir === "x" ? region.x1 : region.y1
  const extent = axisHi - axisLo

  if (!glue) {
    // spread: even slots along `dir`; children value-scale within their slot
    // against a shared scale over the max aggregated slot value.
    const crossAxis = dir === "x" ? "y" : "x"
    const restore = withAggregatedScale(node, items, crossAxis, engine)
    // `sizeBy: <field>` makes this a bar chart: each slot's cross-extent (bar
    // height for dir:"x") is sum(field) on a shared scale, anchored to the far
    // edge — so the slot region a child fills is a value-scaled bar.
    const sizeBy = node.options?.sizeBy as string | undefined
    const crossVals = sizeBy ? items.map((it) => sumChannel({ type: "field", name: sizeBy }, it.rows)) : []
    const crossMax = sizeBy ? Math.max(...crossVals, 0) : 0
    const slot = (extent - spacing * (items.length - 1)) / items.length
    items.forEach((it, i) => {
      const lo = axisLo + i * (slot + spacing)
      let sub = subRegion(region, dir, lo, lo + slot)
      if (sizeBy && crossMax > 0) sub = barRegion(sub, crossAxis, Math.max(0.02, crossVals[i] / crossMax))
      place(it.node, sub, it.rows, coord, polar, engine, false)
    })
    restore()
    return
  }

  // stack: segments accumulate by value. By default the stack fills its extent
  // (a 100%-style stack). But when an ancestor `spread`/`scatter` set a shared
  // scale for this size field (e.g. radial bars across lakes), scale against
  // that shared max instead — so a smaller-total stack is genuinely shorter.
  const sizes = items.map((it) => sizeValue(it.node, it.rows, dir))
  const total = sizes.reduce((a, b) => a + b, 0) || 1
  const usable = extent - spacing * (items.length - 1)
  const sizeField = items[0] ? leafSizeField(items[0].node, dir) : null
  const sharedMax = sizeField ? engine.sizeOverride.get(sizeField) : undefined
  const scale = sharedMax && sharedMax > 0 ? usable / sharedMax : usable / total
  let cursor = axisLo
  items.forEach((it, i) => {
    const len = sizes[i] * scale
    const sub = subRegion(region, dir, cursor, cursor + len)
    place(it.node, sub, it.rows, coord, polar, engine, true)
    cursor += len + spacing
  })
}

function subRegion(region: Region, dir: "x" | "y", lo: number, hi: number): Region {
  return dir === "x"
    ? { x0: lo, y0: region.y0, x1: hi, y1: region.y1 }
    : { x0: region.x0, y0: lo, x1: region.x1, y1: hi }
}

/** Shrink a region's cross axis to `frac`, anchored to the far edge (bar growth). */
function barRegion(region: Region, crossAxis: "x" | "y", frac: number): Region {
  if (crossAxis === "y") {
    const h = (region.y1 - region.y0) * frac
    return { ...region, y0: region.y1 - h } // grow up from the bottom
  }
  const w = (region.x1 - region.x0) * frac
  return { ...region, x1: region.x0 + w } // grow right from the left
}

function scatter(
  node: GofishMarkIR,
  region: Region,
  rows: Datum[],
  coord: Coord,
  polar: PolarFrame | null,
  engine: Engine
): void {
  const opt = node.options ?? {}
  const child = (node.children ?? [])[0]
  if (!child) return
  const by = opt.by as string | undefined

  // With `by`: one positioned slot per group (the group's rows flow to the
  // child, which aggregates). Without: one slot per row.
  const slots = by
    ? partition(rows, by).map((g) => ({ rows: g.rows, anchor: g.rows[0] }))
    : rows.map((r) => ({ rows: [r], anchor: r }))

  const anchors = slots.map((s) => s.anchor)
  const xs = anchors.map((r) => numChannel(opt.x as GofishChannelValue, r)).filter((v): v is number => v != null)
  const ys = anchors.map((r) => numChannel(opt.y as GofishChannelValue, r)).filter((v): v is number => v != null)
  const regionW = Math.abs(region.x1 - region.x0)
  const fullH = Math.abs(region.y1 - region.y0)
  // Inset the position scales so edge glyphs aren't pinned to the plot border,
  // and reserve top headroom (for a glyph atop a bar) + a little baseline room.
  const xPad = Math.min(regionW * 0.5, (regionW / Math.max(1, slots.length)) * 0.5)
  const topPad = fullH * 0.12
  const botPad = fullH * 0.06
  const xScale = makeScale(xs, region.x0 + xPad, region.x1 - xPad)
  const yScale = makeScale(ys, region.y1 - botPad, region.y0 + topPad) // y inverted
  // Bars across slots share a scale over the max aggregated slot value.
  const restore = withAggregatedScale(node, slots, "y", engine)
  for (const slot of slots) {
    const cxv = numChannel(opt.x as GofishChannelValue, slot.anchor)
    const cyv = numChannel(opt.y as GofishChannelValue, slot.anchor)
    const px = cxv != null ? xScale(cxv) : (region.x0 + region.x1) / 2
    const half = Math.min(regionW / Math.max(1, slots.length), fullH) * 0.4
    const sub: Region = cyv != null && opt.y != null
      ? { x0: px - half, y0: yScale(cyv) - half, x1: px + half, y1: yScale(cyv) + half }
      : { x0: px - half, y0: region.y0 + topPad, x1: px + half, y1: region.y1 - botPad }
    place(child, sub, slot.rows, coord, polar, engine)
  }
  restore()
}

function makeScale(values: number[], lo: number, hi: number): (v: number) => number {
  if (values.length === 0) return () => (lo + hi) / 2
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 0.5
    max += 0.5
  }
  return (v: number) => lo + ((v - min) / (max - min)) * (hi - lo)
}

interface TreemapDatum {
  value?: number
  item?: { rows: Datum[]; key: string }
  children?: TreemapDatum[]
}

function treemap(
  node: GofishMarkIR,
  region: Region,
  rows: Datum[],
  coord: Coord,
  polar: PolarFrame | null,
  engine: Engine
): void {
  const opt = node.options ?? {}
  const by = opt.by as string | undefined
  const valueField = opt.valueField as string | undefined
  const child = (node.children ?? [])[0]
  if (!child) return
  // Cells: one per `by` group, else one per row. Nest a `treemap` child to get
  // a treemap-of-treemaps (e.g. classes → passengers).
  const items = by ? partition(rows, by) : rows.map((r, i) => ({ key: String(i), rows: [r] }))
  const valueOf = (rs: Datum[]): number =>
    valueField ? Math.max(0, sumChannel({ type: "field", name: valueField }, rs)) : rs.length
  const leaves: TreemapDatum[] = items
    .map((it) => ({ value: valueOf(it.rows), item: { rows: it.rows, key: it.key } }))
    .filter((l) => (l.value ?? 0) > 0)
  if (leaves.length === 0) return
  const w = Math.max(1, region.x1 - region.x0)
  const h = Math.max(1, region.y1 - region.y0)
  const pad = Number(opt.paddingInner) || 1
  // Real squarified treemap (low-aspect cells) via d3-hierarchy.
  const layout = d3treemap<TreemapDatum>().tile(treemapSquarify).size([w, h]).paddingInner(pad).round(true)
  const root = layout(hierarchy<TreemapDatum>({ children: leaves }).sum((d) => d.value ?? 0))
  for (const leaf of root.leaves()) {
    const it = leaf.data.item
    if (!it) continue
    const cell: Region = {
      x0: region.x0 + leaf.x0,
      y0: region.y0 + leaf.y0,
      x1: region.x0 + leaf.x1,
      y1: region.y0 + leaf.y1,
    }
    place(child, cell, it.rows, coord, polar, engine, true)
  }
}

// ── Leaf marks ──────────────────────────────────────────────────────────

function emitLeaf(
  node: GofishMarkIR,
  region: Region,
  rows: Datum[],
  coord: Coord,
  polar: PolarFrame | null,
  engine: Engine,
  fill: boolean
): void {
  if (node.type === "mark-fn") {
    emitMarkFn(node, region, rows[0] ?? null, engine)
    return
  }
  // `repeat`: iterate an array field of the single datum, instantiating per
  // element in the region's unit space (fill projection). Strip `repeat` on the
  // per-element node so the element's emission doesn't re-enter this branch.
  const repeat = node.repeat as string | undefined
  if (repeat) {
    const arr = readField(rows[0], repeat)
    if (Array.isArray(arr)) {
      const proj = makeUnitProjection(region, undefined, rows[0])
      const elNode = { ...node, repeat: undefined }
      for (const el of arr) emitLeafUnit(elNode, region, [el as Datum], engine, proj)
    }
    return
  }
  if (coord === "polar" && polar) {
    emitPolarLeaf(node, region, rows, polar, engine)
    return
  }
  emitPixelLeaf(node, region, rows, engine, fill)
}

/** Project a unit-coord leaf ([0,1]) onto a pixel region via the unit projection. */
function emitLeafUnit(node: GofishMarkIR, region: Region, rows: Datum[], engine: Engine, proj: UnitProjection): void {
  const repeat = node.repeat as string | undefined
  if (repeat) {
    const arr = readField(rows[0], repeat)
    if (Array.isArray(arr)) {
      const elNode = { ...node, repeat: undefined }
      for (const el of arr) emitLeafUnit(elNode, region, [el as Datum], engine, proj)
    }
    return
  }
  const { ux, uy, us } = proj
  const datum = rows[0] ?? null
  const id = node.origin?.name ?? node.name ?? nextId(engine, node.type)
  // A `clip` channel (unit point array) → an SVG path in pixel coords, so a
  // fill or image can be clipped to a silhouette.
  const clipPts = channel(node.clip as GofishChannelValue, datum)
  const clipPath = Array.isArray(clipPts) && clipPts.length
    ? `M${(clipPts as Array<[number, number]>).map((p) => `${ux(p[0])},${uy(p[1])}`).join(" L")} Z`
    : undefined

  if (node.type === "polygon") {
    const pts = channel(node.points as GofishChannelValue, datum) as Array<[number, number]> | undefined
    if (!Array.isArray(pts) || pts.length === 0) return
    const d = `M${pts.map((p) => `${ux(p[0])},${uy(p[1])}`).join(" L")} Z`
    engine.marks.push({ kind: "path", id: nextId(engine, id), d, style: styleOf(node, datum, engine), clipPath })
    return
  }
  if (node.type === "image") {
    const href = channel(node.href as GofishChannelValue, datum)
    if (typeof href !== "string" || !href) return
    const x = numChannel(node.x as GofishChannelValue, datum) ?? 0
    const y = numChannel(node.y as GofishChannelValue, datum) ?? 0
    const iw = numChannel(node.w as GofishChannelValue, datum) ?? 1
    const ih = numChannel(node.h as GofishChannelValue, datum) ?? 1
    engine.marks.push({
      kind: "image",
      id: nextId(engine, id),
      href,
      x: ux(x),
      y: uy(y),
      width: ux(x + iw) - ux(x),
      height: uy(y + ih) - uy(y),
      opacity: numChannel(node.opacity as GofishChannelValue, datum),
      clipPath,
    })
    return
  }
  if (node.type === "circle") {
    const cx = numChannel(node.cx as GofishChannelValue, datum) ?? numChannel(node.x as GofishChannelValue, datum) ?? 0.5
    const cy = numChannel(node.cy as GofishChannelValue, datum) ?? numChannel(node.y as GofishChannelValue, datum) ?? 0.5
    const r = numChannel(node.r as GofishChannelValue, datum) ?? 0.02
    engine.marks.push({
      kind: "circle",
      id: nextId(engine, id),
      cx: ux(cx),
      cy: uy(cy),
      r: us(r),
      style: styleOf(node, datum, engine),
      datum: datum ?? undefined,
      interactive: node.interactive as boolean | undefined,
    })
    return
  }
  if (node.type === "rect") {
    const rot = numChannel(node.rotate as GofishChannelValue, datum)
    if (rot != null) {
      // Centered, square-ish glyph (e.g. a rotated ice cube): x/y are the center.
      const cxp = ux(numChannel(node.x as GofishChannelValue, datum) ?? 0.5)
      const cyp = uy(numChannel(node.y as GofishChannelValue, datum) ?? 0.5)
      const side = us(numChannel(node.w as GofishChannelValue, datum) ?? 0.05)
      const d = rotatedRectPath(cxp - side / 2, cyp - side / 2, side, side, rot, cxp, cyp)
      engine.marks.push({ kind: "path", id: nextId(engine, id), d, style: styleOf(node, datum, engine) })
      return
    }
    // Region rect: x/y are the top-left; width/height span the box (per axis,
    // not the min dimension) so a full-slot fill or hit target works.
    const x = numChannel(node.x as GofishChannelValue, datum) ?? 0
    const y = numChannel(node.y as GofishChannelValue, datum) ?? 0
    const rw = numChannel(node.w as GofishChannelValue, datum) ?? 1
    const rh = numChannel(node.h as GofishChannelValue, datum) ?? 1
    engine.marks.push({
      kind: "rect",
      id: nextId(engine, id),
      x: ux(x),
      y: uy(y),
      width: ux(x + rw) - ux(x),
      height: uy(y + rh) - uy(y),
      style: styleOf(node, datum, engine),
      datum: datum ?? undefined,
      group: groupKey(node, datum),
      interactive: node.interactive as boolean | undefined,
      clipPath,
    })
    return
  }
  if (node.type === "line") {
    engine.marks.push({
      kind: "line",
      id: nextId(engine, id),
      x1: ux(numChannel(node.x1 as GofishChannelValue, datum) ?? 0),
      y1: uy(numChannel(node.y1 as GofishChannelValue, datum) ?? 0),
      x2: ux(numChannel(node.x2 as GofishChannelValue, datum) ?? 1),
      y2: uy(numChannel(node.y2 as GofishChannelValue, datum) ?? 0),
      style: styleOf(node, datum, engine),
    })
    return
  }
  if (node.type === "text") {
    const text = channel(node.text as GofishChannelValue, datum)
    engine.marks.push({
      kind: "text",
      id: nextId(engine, id),
      x: ux(numChannel(node.x as GofishChannelValue, datum) ?? 0.5),
      y: uy(numChannel(node.y as GofishChannelValue, datum) ?? 0.95),
      text: text == null ? "" : String(text),
      fontSize: Number(node.fontSize) || 11,
      textAnchor: (node.textAnchor as "start" | "middle" | "end") ?? "middle",
      style: { fill: "var(--semiotic-text-secondary, #667)" },
    })
    return
  }
  emitTextOrFallback(node, ux(0.5), uy(0.95), datum, engine)
}

/** Pixel-space leaf (coord none): fill (parent pre-sized it) or value-scale a bar. */
function emitPixelLeaf(node: GofishMarkIR, region: Region, rows: Datum[], engine: Engine, fill: boolean): void {
  const datum = rows[0] ?? null
  const id = node.origin?.name ?? node.name ?? node.type
  const x0 = Math.min(region.x0, region.x1)
  const x1 = Math.max(region.x0, region.x1)
  const y0 = Math.min(region.y0, region.y1)
  const y1 = Math.max(region.y0, region.y1)
  const literalOrFill = (v: GofishChannelValue | undefined, ext: number): number =>
    typeof v === "number" ? Math.min(v, ext) : ext

  if (node.type === "rect" || node.type === "image") {
    const regionW = x1 - x0
    const regionH = y1 - y0
    // fill: the stack/treemap already sized this region by the value → fill it
    // (honoring a literal w/h). Otherwise value-scale a bottom-anchored bar.
    const w = fill ? literalOrFill(node.w as GofishChannelValue, regionW) : sizePx(node.w as GofishChannelValue, rows, regionW, engine)
    const h = fill ? literalOrFill(node.h as GofishChannelValue, regionH) : sizePx(node.h as GofishChannelValue, rows, regionH, engine)
    // Bars anchor to the bottom; width centers in the slot.
    engine.marks.push({
      kind: "rect",
      id: nextId(engine, id),
      x: x0 + (regionW - w) / 2,
      y: y1 - h,
      width: Math.max(0, w),
      height: Math.max(0, h),
      style: styleOf(node, datum, engine, rows),
      datum: aggregateDatum(node, rows),
      group: groupKey(node, datum),
      interactive: node.interactive as boolean | undefined,
    })
    if (node.type === "image") {
      engine.warnings.push(`image mark "${id}" rendered as a placeholder rect (href not loaded).`)
    }
    return
  }
  if (node.type === "circle") {
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const r = Math.min(x1 - x0, y1 - y0) / 2
    engine.marks.push({
      kind: "circle",
      id: nextId(engine, id),
      cx,
      cy,
      r: Math.max(0, r),
      style: styleOf(node, datum, engine, rows),
      datum: aggregateDatum(node, rows),
      group: groupKey(node, datum),
      interactive: node.interactive as boolean | undefined,
    })
    return
  }
  if (node.type === "line") {
    engine.marks.push({ kind: "line", id: nextId(engine, id), x1: x0, y1: y1, x2: x1, y2: y0, style: styleOf(node, datum, engine, rows) })
    return
  }
  emitTextOrFallback(node, (x0 + x1) / 2, (y0 + y1) / 2, datum, engine)
}

/** Polar leaf: a rect becomes an annular band; circle a dot at (θ,r) center. */
function emitPolarLeaf(node: GofishMarkIR, region: Region, rows: Datum[], polar: PolarFrame, engine: Engine): void {
  const datum = rows[0] ?? null
  const id = node.origin?.name ?? node.name ?? node.type
  const theta0 = region.x0
  const theta1 = region.x1
  const r0 = region.y0
  const r1 = region.y1
  const style = styleOf(node, datum, engine, rows)

  if (node.type === "petal") {
    // A real petal: a teardrop across the θ slice. Its radial length encodes
    // the petal's size channel (e.g. h:count) on the shared value scale, so a
    // bigger count grows a longer petal — the custom layout reading the data.
    const sizeCh = (node.h ?? node.size ?? node.r) as GofishChannelValue
    const field = fieldOf(sizeCh)
    let outerR = r1
    if (field) {
      const max = engine.sizeOverride.get(field) ?? engine.domains.get(field) ?? 0
      if (max > 0) {
        const frac = Math.max(0, Math.min(1, sumChannel(sizeCh, rows) / max))
        // Floor so the smallest petal stays legible rather than collapsing.
        outerR = r0 + (r1 - r0) * (0.35 + 0.65 * frac)
      }
    }
    const d = petalPath(polar.cx, polar.cy, Math.max(1, outerR * 0.16), outerR, theta0, theta1)
    engine.marks.push({ kind: "path", id: nextId(engine, id), d, style, datum: aggregateDatum(node, rows), group: groupKey(node, datum) })
    recordFrame(node, polarPoint(polar.cx, polar.cy, (r0 + outerR) / 2, (theta0 + theta1) / 2), datum, engine)
    return
  }
  if (node.type === "rect" || node.type === "area") {
    // Annular wedge as a data-bearing AREA scene node (sampled arcs) — it gets
    // hit testing / transitions / SSR from the frame, so no separate hit glyph
    // is needed. A `w` channel sets the bar's angular width (radians), centered
    // in the lake's slot — thin radial spokes rather than full-slot wedges.
    const group = groupKey(node, datum)
    const wRad = numChannel(node.w as GofishChannelValue, datum)
    const tMid = (theta0 + theta1) / 2
    const t0 = wRad != null ? tMid - wRad / 2 : theta0
    const t1 = wRad != null ? tMid + wRad / 2 : theta1
    const samples = Math.max(2, Math.ceil(Math.abs(t1 - t0) / 0.12))
    const outerArc = sampleArc(polar.cx, polar.cy, r1, t0, t1, samples)
    const innerArc = sampleArc(polar.cx, polar.cy, r0, t0, t1, samples)
    engine.marks.push({
      kind: "area",
      id: nextId(engine, id),
      topPath: outerArc,
      bottomPath: innerArc,
      style,
      datum: rows.length ? rows : undefined,
      group,
    })
    // Record the segment so a `connect` can stitch a per-series ribbon.
    engine.polarSegments.push({ group, cx: polar.cx, cy: polar.cy, innerR: r0, outerR: r1, theta0: t0, theta1: t1 })
    return
  }
  if (node.type === "circle") {
    const [cx, cy] = polarPoint(polar.cx, polar.cy, (r0 + r1) / 2, (theta0 + theta1) / 2)
    engine.marks.push({ kind: "circle", id: nextId(engine, id), cx, cy, r: 3, style, datum: datum ?? undefined, interactive: node.interactive as boolean | undefined })
    return
  }
  const [tx, ty] = polarPoint(polar.cx, polar.cy, (r0 + r1) / 2, (theta0 + theta1) / 2)
  emitTextOrFallback(node, tx, ty, datum, engine)
}

function emitTextOrFallback(node: GofishMarkIR, x: number, y: number, datum: Datum | null, engine: Engine): void {
  if (node.type === "text") {
    const text = channel(node.text as GofishChannelValue, datum ?? undefined)
    engine.marks.push({
      kind: "text",
      id: nextId(engine, node.origin?.name ?? "text"),
      x,
      y,
      text: text == null ? "" : String(text),
      fontSize: Number(node.fontSize) || 11,
      textAnchor: "middle",
      style: { fill: "var(--semiotic-text-secondary, #667)" },
    })
    return
  }
  engine.warnings.push(`Unsupported leaf mark "${node.type}".`)
}

// ── mark-fn escape hatch ────────────────────────────────────────────────────

function emitMarkFn(node: GofishMarkIR, region: Region, datum: Datum | null, engine: Engine): void {
  const id = node.lambdaId as string | undefined
  const lambda = id ? resolveLambda(id, engine.options.lambdas) : undefined
  const x0 = Math.min(region.x0, region.x1)
  const y0 = Math.min(region.y0, region.y1)
  const w = Math.abs(region.x1 - region.x0)
  const h = Math.abs(region.y1 - region.y0)
  if (!lambda || lambda.kind !== "mark-fn") {
    if (id) engine.warnings.push(`mark-fn lambda "${id}" is not registered; drawing a placeholder.`)
    engine.marks.push({ kind: "rect", id: nextId(engine, "markfn"), x: x0, y: y0, width: w, height: h, style: { fill: "rgba(0,0,0,0.04)", stroke: "var(--semiotic-border,#bbb)" }, datum: datum ?? undefined })
    return
  }
  const prims = lambda.fn(datum ?? {}, { x: x0, y: y0, w, h })
  for (const p of prims) splicePrimitive(p, x0, y0, w, h, engine)
}

function splicePrimitive(p: GofishLambdaPrimitive, x0: number, y0: number, w: number, h: number, engine: Engine): void {
  const ux = (v: number) => x0 + v * w
  const uy = (v: number) => y0 + v * h
  const us = (v: number) => v * Math.min(w, h)
  if (p.kind === "polygon") {
    const d = `M${p.points.map((pt) => `${ux(pt[0])},${uy(pt[1])}`).join(" L")} Z`
    engine.marks.push({ kind: "path", id: nextId(engine, "mf-poly"), d, style: { fill: p.fill, stroke: p.stroke, strokeWidth: p.strokeWidth, opacity: p.opacity } })
  } else if (p.kind === "circle") {
    engine.marks.push({ kind: "circle", id: nextId(engine, "mf-c"), cx: ux(p.x), cy: uy(p.y), r: us(p.r), style: { fill: p.fill, stroke: p.stroke, opacity: p.opacity }, interactive: false })
  } else if (p.kind === "rect") {
    engine.marks.push({ kind: "rect", id: nextId(engine, "mf-r"), x: ux(p.x), y: uy(p.y), width: us(p.w), height: us(p.h), style: { fill: p.fill, stroke: p.stroke, opacity: p.opacity }, interactive: false })
  } else if (p.kind === "text") {
    engine.marks.push({ kind: "text", id: nextId(engine, "mf-t"), x: ux(p.x), y: uy(p.y), text: p.text, fontSize: p.fontSize ?? 11, textAnchor: "middle", style: { fill: p.fill } })
  }
}

// ── Style / datum helpers ───────────────────────────────────────────────────

/**
 * A fill string the interpreter should paint verbatim rather than resolve
 * through the categorical palette: explicit color literals (`#…`, `rgb(…)`,
 * `hsl(…)`, `var(…)`) and the paint keywords `none` / `transparent` /
 * `currentColor`. Without the keywords, a `fill: "none"` outline (the boba cup
 * silhouette) gets a categorical color and paints a solid block over the glyph.
 */
function isLiteralColor(value: string): boolean {
  if (value.startsWith("#") || value.startsWith("var(") || value.startsWith("rgb") || value.startsWith("hsl")) {
    return true
  }
  const lower = value.toLowerCase()
  return lower === "none" || lower === "transparent" || lower === "currentcolor"
}

function styleOf(node: GofishMarkIR, datum: Datum | undefined, engine: Engine, rows?: Datum[]): Style {
  const fillCh = node.fill as GofishChannelValue | undefined
  const strokeCh = node.stroke as GofishChannelValue | undefined
  let fill: string | undefined
  if (fillCh != null) {
    const v = channel(fillCh, datum)
    if (typeof v === "string" && isLiteralColor(v)) fill = v
    else if (v != null) fill = engine.resolveColor(String(v), datum)
  }
  const stroke = typeof channel(strokeCh, datum) === "string" ? (channel(strokeCh, datum) as string) : undefined
  void rows
  return {
    fill: fill ?? (node.type === "rect" || node.type === "circle" || node.type === "area" || node.type === "petal" ? engine.resolveColor(groupKey(node, datum) ?? "0", datum) : undefined),
    stroke,
    strokeWidth: typeof node.strokeWidth === "number" ? node.strokeWidth : undefined,
    fillOpacity: typeof node.opacity === "number" ? node.opacity : undefined,
  }
}

function groupKey(node: GofishMarkIR, datum: Datum | undefined): string | undefined {
  const fillCh = node.fill as GofishChannelValue | undefined
  if (fillCh && typeof fillCh === "object" && (fillCh as { type?: string }).type === "field") {
    const v = readField(datum, (fillCh as { name: string }).name)
    if (v != null) return String(v)
  }
  return undefined
}

function aggregateDatum(node: GofishMarkIR, rows: Datum[]): Datum | undefined {
  if (rows.length === 0) return undefined
  if (rows.length === 1) return rows[0]
  // summarize the group: carry the first row + summed numeric size channels
  return datumFromFields({ ...rows[0], _groupSize: rows.length })
}

function recordFrame(node: GofishMarkIR, anchor: [number, number], datum: Datum | undefined, engine: Engine): void {
  const name = node.name ?? node.origin?.name
  if (!name) return
  engine.frames.set(name, { name, cx: anchor[0], cy: anchor[1], bbox: { x: anchor[0], y: anchor[1], w: 0, h: 0 } })
}

function recordRelation(node: GofishMarkIR, rows: Datum[], engine: Engine): void {
  const opt = node.options ?? {}
  const refs: string[] = []
  for (const child of node.children ?? []) {
    if (child.type === "ref") {
      const sel = child.selection
      if (Array.isArray(sel)) refs.push(sel.map(String).join("-"))
      else if (sel != null) refs.push(String(sel))
    }
  }
  engine.relations.push({
    kind: node.type === "arrow" ? "arrow" : "connect",
    refs,
    fill: typeof opt.fill === "string" ? opt.fill : undefined,
    stroke: typeof opt.stroke === "string" ? opt.stroke : undefined,
    opacity: typeof opt.opacity === "number" ? opt.opacity : undefined,
    interpolation: opt.interpolation === "bezier" ? "bezier" : "linear",
  })
  void rows
}

function rotatedRectPath(x: number, y: number, w: number, h: number, deg: number, cx: number, cy: number): string {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const pt = (px: number, py: number): string => {
    const dx = px - cx
    const dy = py - cy
    return `${cx + dx * cos - dy * sin},${cy + dx * sin + dy * cos}`
  }
  return `M${pt(x, y)} L${pt(x + w, y)} L${pt(x + w, y + h)} L${pt(x, y + h)} Z`
}

// ── Relations → glyph marks (after placement) ───────────────────────────────

function emitRelations(engine: Engine): void {
  // Polar ribbons: a `connect` over recorded polar segments stitches one band
  // per series (the relational case the named-ref path can't resolve —
  // segments are grouped by their fill series, sorted by angle). The band rides
  // each spoke's outer/inner edge and bridges the gaps with straight connectors
  // (`interpolation: "linear"`, default) or a smooth curve (`"bezier"`).
  const connect = engine.relations.find((r) => r.kind === "connect")
  if (connect && engine.polarSegments.length >= 2) {
    const bySeries = new Map<string, Engine["polarSegments"]>()
    for (const seg of engine.polarSegments) {
      const key = seg.group ?? ""
      const list = bySeries.get(key) ?? []
      list.push(seg)
      bySeries.set(key, list)
    }
    for (const [series, segs] of bySeries) {
      if (segs.length < 2) continue
      const ordered = [...segs].sort((a, b) => (a.theta0 + a.theta1) / 2 - (b.theta0 + b.theta1) / 2)
      // Each spoke contributes its outer arc endpoints (top) and inner arc
      // endpoints (bottom); the closed band is outer-forward + inner-backward.
      const top: Array<[number, number]> = []
      const bottom: Array<[number, number]> = []
      for (const s of ordered) {
        top.push(polarPoint(s.cx, s.cy, s.outerR, s.theta0), polarPoint(s.cx, s.cy, s.outerR, s.theta1))
        bottom.push(polarPoint(s.cx, s.cy, s.innerR, s.theta0), polarPoint(s.cx, s.cy, s.innerR, s.theta1))
      }
      const pts = [...top, ...bottom.reverse()]
      const d = connect.interpolation === "bezier" ? smoothClosedPath(pts) : straightClosedPath(pts)
      const color = engine.resolveColor(series)
      engine.marks.push({
        kind: "path",
        id: nextId(engine, "ribbon"),
        d,
        style: { fill: color, fillOpacity: connect.opacity ?? 0.26, stroke: color, strokeWidth: 1, opacity: 0.9 },
      })
    }
  }

  for (const rel of engine.relations) {
    const pts = rel.refs.map((r) => engine.frames.get(r)).filter((f): f is NamedFrame => !!f).map((f) => [f.cx, f.cy] as [number, number])
    if (pts.length < 2) continue
    const d = rel.interpolation === "bezier" || rel.kind === "connect" ? smoothOpenPath(pts) : `M${pts.map((p) => `${p[0]},${p[1]}`).join(" L")}`
    engine.marks.push({
      kind: "path",
      id: nextId(engine, rel.kind),
      d,
      style: { fill: rel.fill ?? "none", stroke: rel.stroke ?? rel.fill ?? "var(--semiotic-border,#888)", opacity: rel.opacity ?? 0.8, strokeWidth: rel.fill && rel.fill !== "none" ? 0 : 1.5 },
    })
  }
}

function smoothOpenPath(points: [number, number][]): string {
  if (points.length < 2) return ""
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const mx = (prev[0] + curr[0]) / 2
    d += ` Q${mx},${prev[1]} ${curr[0]},${curr[1]}`
  }
  return d
}

/** A closed polygon through the points — straight edges, no smoothing bulge. */
function straightClosedPath(points: [number, number][]): string {
  if (points.length < 2) return ""
  return `M${points.map((p) => `${p[0]},${p[1]}`).join(" L")} Z`
}

// ── Public: build an interpreted scene for a root + pixel frame ──────────────

function runInterpreter(
  root: GofishRootIR,
  frame: { x: number; y: number; width: number; height: number },
  resolveColor: (key: string) => string,
  options: InterpretOptions
): Engine {
  const engine: Engine = {
    marks: [],
    frames: new Map(),
    relations: [],
    resolveColor,
    options,
    warnings: options.warnings ?? [],
    ids: { n: 0 },
    domains: new Map(),
    sizeOverride: new Map(),
    polarSegments: [],
  }
  const region: Region = { x0: frame.x, y0: frame.y, x1: frame.x + frame.width, y1: frame.y + frame.height }

  const charts = root.type === "chart" ? [root] : root.type === "layer" ? root.charts : []
  // Shared value scale: max absolute value per numeric field across all rows.
  for (const chart of charts) {
    if (chart.data?.type !== "inline") continue
    for (const row of chart.data.rows) {
      for (const [k, v] of Object.entries(row)) {
        const n = Number(v)
        if (Number.isFinite(n)) engine.domains.set(k, Math.max(engine.domains.get(k) ?? 0, Math.abs(n)))
      }
    }
  }
  if (root.type === "raw-mark") {
    place(root.mark, region, [], "none", null, engine)
  }
  for (const chart of charts) {
    const rows: Datum[] = chart.data?.type === "inline" ? (chart.data.rows as Datum[]) : []
    const node = chartToNode(chart.operators ?? [], chart.mark)
    place(node, region, rows, "none", null, engine)
    if (chart.connect) place(chart.connect, region, rows, "none", null, engine)
  }
  emitRelations(engine)
  return engine
}

// ── Frame bindings ───────────────────────────────────────────────────────

/** XY binding — the default for free-coordinate GoFish charts. */
export function interpretToXYLayout(root: GofishRootIR, options: InterpretOptions = {}): CustomLayout {
  return (ctx: LayoutContext) => {
    const engine = runInterpreter(rootWithFrameData(root, ctx.data), ctx.dimensions.plot, ctx.resolveColor, { ...options, warnings: options.warnings ?? [] })
    const solver = createGofishGlyphLayout(() => ({ marks: engine.marks }))
    return solver(ctx)
  }
}

/**
 * Ordinal binding — the top-level categorical `spread`/`group` maps to the
 * frame's o-scale (one band per category); each category's subtree is
 * interpreted within its full band column. A pictorial glyph that declares a
 * `unit` coord with `fit: "uniform"` then scales aspect-correctly to fill the
 * column (e.g. boba cups). Emits one data-bearing hit rect per category + the
 * interpreted glyph as overlays.
 *
 * `config.glyphWidthRatio` (alias `cupWidthRatio`) insets the glyph column
 * horizontally so neighboring glyphs breathe; default 0.9.
 */
export function interpretToOrdinalLayout(
  root: GofishRootIR,
  categoryAccessor: string,
  options: InterpretOptions = {}
): OrdinalCustomLayout {
  return (ctx: OrdinalLayoutContext) => {
    const { plot } = ctx.dimensions
    const o = ctx.scales.o
    const bandW = o.bandwidth()
    const labelPad = 26
    const topPad = 8
    const availH = Math.max(1, plot.height - labelPad - topPad)
    const cfg = (ctx.config ?? {}) as { glyphWidthRatio?: number; cupWidthRatio?: number }
    const widthRatio = Math.max(0.2, Math.min(1, cfg.glyphWidthRatio ?? cfg.cupWidthRatio ?? 0.9))
    const glyphW = bandW * widthRatio
    const nodes: OrdinalSceneNode[] = []
    const overlays: GofishGlyphMark[] = []
    const warnings = options.warnings ?? []

    // Pull the cup subtree = the chart mark with its operators minus the outer
    // categorical spread; interpret it per category filling the band column.
    const chart = root.type === "chart" ? root : root.type === "layer" ? root.charts[0] : undefined
    if (!chart) return { nodes: [] }
    const sourceRows = chart.data?.type === "inline" ? ctx.data : []
    // Apply data operators (derive) once over all rows, then interpret the
    // inner glyph per category. This keeps shared derived geometry (for
    // example the boba menu's common aspect box) global instead of recomputing
    // it independently inside each band.
    const rows = applyDataOperators(sourceRows, chart.operators ?? [], options, warnings)
    const innerNode = chartToNode((chart.operators ?? []).filter((op) => !DATA_OPS.has(op.type) && !LAYOUT_OPS.has(op.type)), chart.mark)

    const byOp = (chart.operators ?? []).find((op) => op.type === "spread" || op.type === "group")
    const byField = (byOp?.by ?? categoryAccessor).replace(/^datum\./, "")
    const groups = partition(rows, byField)

    for (const g of groups) {
      const bandX = o(g.key)
      if (bandX == null) continue
      const fx = bandX + (bandW - glyphW) / 2
      const fy = plot.y + topPad
      const engine = runInterpreter(
        { type: "chart", data: { type: "inline", rows: g.rows }, mark: innerNode } as GofishRootIR,
        { x: fx, y: fy, width: glyphW, height: availH },
        ctx.resolveColor,
        { ...options, warnings }
      )
      // Each category runs its own interpreter (ids restart at 0), so namespace
      // the mark ids by category to keep React keys unique across cups.
      const prefix = stableGlyphId(g.key)
      for (const m of engine.marks) m.id = `${prefix}-${m.id}`
      overlays.push(...engine.marks)
      // Data-bearing hit rect for the whole cup.
      nodes.push({
        type: "rect",
        x: bandX,
        y: plot.y + 8,
        w: bandW,
        h: availH,
        style: { fill: "rgba(0,0,0,0)", stroke: "none" },
        datum: g.rows[0] ?? null,
        group: g.key,
        _transitionKey: `cat-${stableGlyphId(g.key)}`,
      } as OrdinalSceneNode)
      // Category label.
      overlays.push({ kind: "text", id: `lbl-${stableGlyphId(g.key)}`, x: bandX + bandW / 2, y: plot.y + plot.height - 8, text: g.key, fontSize: 12, textAnchor: "middle", style: { fill: "var(--semiotic-text,#333)" } })
    }

    // Compile overlay glyph marks via the shared compiler, but keep our hit rects.
    const compiled = createGofishGlyphLayout(() => ({ marks: overlays }))({
      data: ctx.data,
      scales: { x: ctx.scales.r, y: ctx.scales.r } as unknown as LayoutContext["scales"],
      dimensions: ctx.dimensions,
      theme: ctx.theme,
      resolveColor: ctx.resolveColor,
      config: {},
    })
    return { nodes: [...nodes, ...(compiled.nodes as OrdinalSceneNode[])], overlays: compiled.overlays }
  }
}

/** Interpret a root to raw marks (for tests / custom hosts). */
export function interpretToMarks(
  root: GofishRootIR,
  frame: { x: number; y: number; width: number; height: number },
  resolveColor: (key: string) => string = (k) => k,
  options: InterpretOptions = {}
): { marks: GofishGlyphMark[]; warnings: string[] } {
  const engine = runInterpreter(root, frame, resolveColor, { ...options, warnings: options.warnings ?? [] })
  return { marks: engine.marks, warnings: engine.warnings }
}
