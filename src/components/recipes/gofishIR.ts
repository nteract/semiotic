import { createElement, Fragment } from "react"
import type { ReactNode } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkCustomLayout, NetworkLayoutResult } from "../stream/networkCustomLayout"
import type { NetworkSceneNode } from "../stream/networkTypes"
import type { Style } from "../stream/types"

/**
 * Experimental GoFish **DisplayList** → Semiotic custom-layout adapter.
 *
 * GoFish's `toDisplayList({ w, h })` is the post-layout *render IR*: a flat,
 * ordered list of positioned primitives in absolute viewport pixels. The layout
 * solve has already run — operators, constraints, channels, and the coordinate
 * transforms are all consumed, so a polar petal arrives as a baked `path`, a
 * treemap cell as a baked `rect`. Josh Pollock shipped this stage specifically
 * for this adapter (it is the analogue of running a chart to SVG but stopping
 * one step earlier, before backend emission).
 *
 * That makes the adapter's job small and faithful: GoFish owns the geometry; we
 * map each item onto Semiotic's custom-layout surface *by its `role`*, exactly
 * as the reference backends do (`displayListToSVG` emits SVG tags; we emit
 * scene-nodes + overlays):
 *
 * - **`role: "overlay"`** — chrome (axis ticks, labels, glyph detail). Rendered
 *   verbatim into one ordered SVG overlay layer (a JSX port of GoFish's
 *   reference `displayListToSVG`), so painter order and every `kind` — including
 *   warped `path`s, `image`s, and Porter-Duff `composite`/`mask` graphs — stay
 *   pixel-faithful.
 * - **`role: "node"`** — data-bearing marks. Rendered into the same SVG layer
 *   *and* given a transparent hit-rect scene node carrying the item's `datum`,
 *   so Semiotic stays authoritative for hit-testing, tooltips, `onObservation`,
 *   cross-chart selection, keyboard a11y, and SSR mark-count evidence.
 *
 * Because a display list is **viewport-baked** — solved at one `{ w, h }`, not
 * cacheable — the result always mounts on `NetworkCustomChart` (the scale-free
 * family: plot-relative pixel coordinates, no data scales to fight the baked
 * geometry). The adapter surfaces the document's `viewport` as `width`/`height`;
 * the list is only valid at that size, so on resize or data change the host
 * re-calls `toDisplayList` and re-runs the adapter rather than rescaling an old
 * document.
 *
 * Scope: GoFish DisplayList IR v0 (`ir: "gofish-display-list"`). This is a
 * PR-preview adapter named `unstable-gofish-displaylist-adapter`, exposed from
 * `semiotic/experimental`; it is not a release API commitment.
 */

export const EXPERIMENTAL_GOFISH_ADAPTER_NAME = "unstable-gofish-displaylist-adapter"

// ── DisplayList IR types (a local, structural mirror of gofish-ir's
//    display-list schema v0, so consumers of `semiotic/experimental` don't
//    need gofish-ir installed to type a call). ────────────────────────────────

/** Resolved paint carried by a display item. */
export interface GofishDisplayStyle {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  fillOpacity?: number
  /** CSS `mix-blend-mode`. */
  mixBlendMode?: string
  /** SVG `stroke-dasharray`. */
  strokeDasharray?: string
  /** A `url(#id)` reference to a user-supplied filter def. */
  filter?: string
}

/** One source row, or the rows of an aggregate mark. Provenance, not a binding. */
export type GofishDisplayDatum = Record<string, unknown> | Array<Record<string, unknown>>

export interface GofishDisplayItemBase {
  style?: GofishDisplayStyle
  datum?: GofishDisplayDatum
  /** `"node"` (data-bearing) or `"overlay"` (chrome). Defaults to `"node"`. */
  role?: "node" | "overlay"
  id?: string
}

export interface GofishRectItem extends GofishDisplayItemBase {
  kind: "rect"
  x: number
  y: number
  w: number
  h: number
  rx?: number
  ry?: number
}
export interface GofishEllipseItem extends GofishDisplayItemBase {
  kind: "ellipse"
  cx: number
  cy: number
  rx: number
  ry: number
}
export interface GofishPathItem extends GofishDisplayItemBase {
  kind: "path"
  /** SVG path data in absolute pixels (coordinate transform already applied). */
  d: string
}
export interface GofishTextItem extends GofishDisplayItemBase {
  kind: "text"
  x: number
  y: number
  text: string
  fontSize?: number
  fontFamily?: string
  textAnchor?: "start" | "middle" | "end"
  dominantBaseline?: "auto" | "central" | "middle" | "hanging" | "mathematical"
  /** Rotation in degrees about `(x, y)` (SVG `rotate(deg, x, y)` convention). */
  rotate?: number
}
export interface GofishImageItem extends GofishDisplayItemBase {
  kind: "image"
  x: number
  y: number
  w: number
  h: number
  href: string
  preserveAspectRatio?: string
}
export interface GofishGroupItem extends GofishDisplayItemBase {
  kind: "group"
  transform: { translate?: [number, number]; scale?: [number, number] }
  children: GofishDisplayItem[]
}
export interface GofishCompositeItem extends GofishDisplayItemBase {
  kind: "composite"
  operator: "over" | "atop" | "in" | "out" | "xor"
  blendMode?: string
  bbox: { x: number; y: number; w: number; h: number }
  source: GofishDisplayItem[]
  dest: GofishDisplayItem[]
}
export interface GofishMaskItem extends GofishDisplayItemBase {
  kind: "mask"
  bbox: { x: number; y: number; w: number; h: number }
  mask: GofishDisplayItem[]
  content: GofishDisplayItem[]
}

export type GofishDisplayItem =
  | GofishRectItem
  | GofishEllipseItem
  | GofishPathItem
  | GofishTextItem
  | GofishImageItem
  | GofishGroupItem
  | GofishCompositeItem
  | GofishMaskItem

export interface GofishDisplayListDocument {
  irVersion: number
  ir: string
  $schema?: string
  viewport: { w: number; h: number }
  items: GofishDisplayItem[]
}

// ── Output config ────────────────────────────────────────────────────────────

/**
 * The translated chart, spreadable into `NetworkCustomChart`. Mirrors
 * `fromVegaLite`'s `{ component, props, warnings }` for the custom-layout
 * surface — a baked display list is always scale-free, so the family is fixed.
 */
export interface GofishChartConfig {
  /** Always `"network"`: absolute-pixel primitives have no data scales. */
  family: "network"
  /** Pass as `layout` on `NetworkCustomChart`. */
  networkLayout: NetworkCustomLayout<{ displayList?: GofishDisplayListDocument }>
  /**
   * Pass as `layoutConfig`. Carries the document so a host can swap the baked
   * list through `layoutConfig` (the cheap re-render path) without re-ingesting
   * the `nodes` topology.
   */
  layoutConfig: { displayList: GofishDisplayListDocument }
  /** Row data from `role:"node"` items — pass as `nodes` (seeds non-empty state + selection). */
  nodes: Datum[]
  /** A display list is a flat primitive list — no relational edges. */
  edges: Datum[]
  /**
   * The viewport this list was solved at. Use as the chart `width`/`height`
   * (with `margin={0}`); the geometry is only valid at this size.
   */
  width: number
  height: number
  irVersion: number
  warnings?: string[]
}

// ── Style + geometry helpers ───────────────────────────────────────────────

/** GoFish resolved style → React SVG presentation props. Mirrors the field set
 *  of the reference `displayListToSVG` `styleAttrs`. */
function styleProps(style: GofishDisplayStyle | undefined): Record<string, unknown> {
  if (!style) return {}
  const props: Record<string, unknown> = {}
  if (style.fill !== undefined) props.fill = style.fill
  if (style.stroke !== undefined) props.stroke = style.stroke
  if (style.strokeWidth !== undefined) props.strokeWidth = style.strokeWidth
  if (style.strokeDasharray !== undefined) props.strokeDasharray = style.strokeDasharray
  if (style.opacity !== undefined) props.opacity = style.opacity
  if (style.fillOpacity !== undefined) props.fillOpacity = style.fillOpacity
  if (style.filter !== undefined) props.filter = style.filter
  if (style.mixBlendMode !== undefined) props.style = { mixBlendMode: style.mixBlendMode }
  return props
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Extract the bounding numbers of an SVG path `d` by pairing coordinates. The
 *  display-list petals/wedges are M/L/Q/Z paths, so even-indexed numbers are x
 *  and odd-indexed are y — an over-estimate at worst (control points), which is
 *  fine for a transparent hit target. */
function pathBox(d: string): Box | null {
  const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)
  if (!nums || nums.length < 2) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = parseFloat(nums[i])
    const y = parseFloat(nums[i + 1])
    if (Number.isFinite(x)) {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
    }
    if (Number.isFinite(y)) {
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** A coarse text bbox from anchor + font size (text is usually overlay chrome;
 *  a rough box is enough should a `role:"node"` label ever need a hit target). */
function textBox(item: GofishTextItem): Box {
  const fs = item.fontSize ?? 12
  const w = Math.max(1, String(item.text).length * fs * 0.6)
  const anchor = item.textAnchor ?? "start"
  const x = anchor === "middle" ? item.x - w / 2 : anchor === "end" ? item.x - w : item.x
  return { x, y: item.y - fs, w, h: fs * 1.2 }
}

/** The axis-aligned bounding box of an item in its local pixel space. */
function boxOf(item: GofishDisplayItem): Box | null {
  switch (item.kind) {
    case "rect":
    case "image":
      return { x: item.x, y: item.y, w: item.w, h: item.h }
    case "ellipse":
      return { x: item.cx - item.rx, y: item.cy - item.ry, w: item.rx * 2, h: item.ry * 2 }
    case "path":
      return pathBox(item.d)
    case "text":
      return textBox(item)
    case "composite":
    case "mask":
      return item.bbox
    case "group":
      return null // groups contribute via their (transformed) children
  }
}

interface Transform {
  tx: number
  ty: number
  sx: number
  sy: number
}

const IDENTITY: Transform = { tx: 0, ty: 0, sx: 1, sy: 1 }

function applyTransform(box: Box, t: Transform): Box {
  return { x: box.x * t.sx + t.tx, y: box.y * t.sy + t.ty, w: box.w * t.sx, h: box.h * t.sy }
}

function composeTransform(parent: Transform, g: GofishGroupItem["transform"]): Transform {
  const [tx = 0, ty = 0] = g.translate ?? []
  const [sx = 1, sy = 1] = g.scale ?? []
  // child-local → parent: scale then translate, then fold into the parent frame.
  return {
    tx: parent.tx + tx * parent.sx,
    ty: parent.ty + ty * parent.sy,
    sx: parent.sx * sx,
    sy: parent.sy * sy,
  }
}

/** The first `datum` anywhere within an item's subtree, used to give a composite
 *  glyph its provenance. A `paint`/`mask` (e.g. GoFish's bottle-fill) bakes to a
 *  `composite` whose *own* item carries no `datum` — the data-bound child marks
 *  (the fill rect, the silhouette image) are nested in `source`/`dest` and each
 *  carry the row. We treat the composite as one glyph and surface a single
 *  representative datum so the whole silhouette stays one hit target. */
function firstDatumWithin(item: GofishDisplayItem): GofishDisplayDatum | undefined {
  if (item.datum != null) return item.datum
  let children: GofishDisplayItem[] | undefined
  if (item.kind === "group") children = item.children
  else if (item.kind === "composite") children = [...item.source, ...item.dest]
  else if (item.kind === "mask") children = [...item.mask, ...item.content]
  if (!children) return undefined
  for (const child of children) {
    const found = firstDatumWithin(child)
    if (found != null) return found
  }
  return undefined
}

/** A row object for a scene-node `datum`: a single source row, the array
 *  unwrapped when one-to-one, kept (with the array under `_rows`) for aggregates. */
function normalizeDatum(datum: GofishDisplayDatum | undefined): Datum | null {
  if (datum == null) return null
  if (Array.isArray(datum)) {
    if (datum.length === 0) return null
    if (datum.length === 1) return datum[0] as Datum
    return { ...(datum[0] as Datum), _rows: datum }
  }
  return datum as Datum
}

// ── DisplayList → SVG overlay (faithful JSX port of displayListToSVG) ────────

interface RenderState {
  compositeId: number
}

function renderItem(item: GofishDisplayItem, key: string, state: RenderState): ReactNode {
  const s = styleProps(item.style)
  switch (item.kind) {
    case "rect":
      return createElement("rect", {
        key,
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h,
        ...(item.rx !== undefined ? { rx: item.rx } : {}),
        ...(item.ry !== undefined ? { ry: item.ry } : {}),
        ...s,
      })
    case "ellipse":
      return createElement("ellipse", { key, cx: item.cx, cy: item.cy, rx: item.rx, ry: item.ry, ...s })
    case "path":
      return createElement("path", { key, d: item.d, ...s })
    case "text":
      return createElement(
        "text",
        {
          key,
          x: item.x,
          y: item.y,
          ...(item.fontSize !== undefined ? { fontSize: item.fontSize } : {}),
          ...(item.fontFamily !== undefined ? { fontFamily: item.fontFamily } : {}),
          ...(item.textAnchor !== undefined ? { textAnchor: item.textAnchor } : {}),
          ...(item.dominantBaseline !== undefined ? { dominantBaseline: item.dominantBaseline } : {}),
          ...(item.rotate !== undefined ? { transform: `rotate(${item.rotate} ${item.x} ${item.y})` } : {}),
          ...s,
        },
        item.text,
      )
    case "image":
      return createElement("image", {
        key,
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h,
        href: item.href,
        ...(item.preserveAspectRatio !== undefined ? { preserveAspectRatio: item.preserveAspectRatio } : {}),
        ...s,
      })
    case "group": {
      const parts: string[] = []
      if (item.transform.translate) parts.push(`translate(${item.transform.translate[0]} ${item.transform.translate[1]})`)
      if (item.transform.scale) parts.push(`scale(${item.transform.scale[0]} ${item.transform.scale[1]})`)
      return createElement(
        "g",
        { key, ...(parts.length ? { transform: parts.join(" ") } : {}), ...s },
        item.children.map((child, i) => renderItem(child, `${key}-${i}`, state)),
      )
    }
    case "composite":
    case "mask":
      return renderComposite(item, key, state)
  }
}

/** Reconstruct GoFish's Porter-Duff filter / mask graph as JSX. Ported from the
 *  reference backend's `compositeToSVG`, with deterministic ids so SSR is
 *  stable. Rarely hit by typical specs, but kept faithful so a composite never
 *  silently drops. */
function renderComposite(item: GofishCompositeItem | GofishMaskItem, key: string, state: RenderState): ReactNode {
  const uid = `gf-comp-${state.compositeId++}`
  const sourceId = `${uid}-source`
  const destId = `${uid}-destination`

  if (item.kind === "mask") {
    const maskId = `${uid}-mask`
    return createElement(
      Fragment,
      { key },
      createElement(
        "defs",
        null,
        createElement("g", { id: sourceId }, item.mask.map((c, i) => renderItem(c, `${maskId}-m-${i}`, state))),
        createElement("g", { id: destId }, item.content.map((c, i) => renderItem(c, `${maskId}-c-${i}`, state))),
        createElement(
          "mask",
          { id: maskId, maskUnits: "userSpaceOnUse", maskContentUnits: "userSpaceOnUse" },
          createElement("use", { href: `#${sourceId}` }),
        ),
      ),
      createElement("use", { href: `#${destId}`, mask: `url(#${maskId})` }),
    )
  }

  // Robust blend/composite without `feImage` fragment references. GoFish's
  // reference filter graph wires a composite through `feImage href="#g"` to pull
  // in two sub-renders — but Chrome dropped local `feImage` element references
  // and librsvg never implemented them, so that graph renders blank everywhere
  // except Firefox (it was dead code here until a `paint`/`blendMode` spec like
  // the bottle-fill first exercised it). We reproduce the same *visual* with CSS
  // `mix-blend-mode` in an isolated group: the source supplies luminosity
  // (desaturated), the dest blends its hue on top, and an alpha mask clips the
  // result to the source silhouette for the coverage-limiting operators
  // (`atop`/`in`) — so a fill rect reads as liquid rising *inside* the bottle.
  const { x, y, w, h } = item.bbox
  // A composite's `source`/`dest` children are baked in coordinates *local to
  // the composite bbox* (the image at local 0,0; the fill rect at a local
  // offset), so every sub-render is translated to the bbox origin to land in
  // absolute viewport space alongside the rest of the list.
  const translate = `translate(${x} ${y})`
  const blendMode = item.blendMode
  const clip = item.operator === "atop" || item.operator === "in"
  const desatId = `${uid}-desat`
  const maskId = `${uid}-cov`
  const sourceBackdrop = item.source.map((c, i) => renderItem(c, `${uid}-s-${i}`, state))
  const destFg = item.dest.map((c, i) => renderItem(c, `${uid}-d-${i}`, state))
  const defs: ReactNode[] = []
  if (blendMode) {
    defs.push(
      createElement("filter", { key: "desat", id: desatId }, createElement("feColorMatrix", { type: "saturate", values: "0" })),
    )
  }
  if (clip) {
    defs.push(
      createElement(
        "mask",
        { key: "cov", id: maskId, maskUnits: "userSpaceOnUse", x, y, width: w, height: h, style: { maskType: "alpha" } },
        createElement("g", { transform: translate }, item.source.map((c, i) => renderItem(c, `${uid}-m-${i}`, state))),
      ),
    )
  }
  return createElement(
    Fragment,
    { key },
    defs.length ? createElement("defs", { key: "defs" }, defs) : null,
    createElement(
      "g",
      { key: "g", ...(clip ? { mask: `url(#${maskId})` } : {}) },
      createElement(
        "g",
        { transform: translate, style: { isolation: "isolate" } },
        createElement("g", blendMode ? { filter: `url(#${desatId})` } : null, sourceBackdrop),
        createElement("g", blendMode ? { style: { mixBlendMode: blendMode } } : null, destFg),
      ),
    ),
  )
}

// ── DisplayList → hit-rect scene nodes (role:"node" items with a datum) ──────

function collectHitNodes(
  items: GofishDisplayItem[],
  transform: Transform,
  out: NetworkSceneNode[],
  counter: { n: number },
): void {
  for (const item of items) {
    if (item.kind === "group") {
      collectHitNodes(item.children, composeTransform(transform, item.transform), out, counter)
      continue
    }
    const role = item.role ?? "node"
    // `firstDatumWithin` returns the item's own datum for leaf marks, and a
    // composite/mask glyph's representative child datum — so a bottle-fill
    // composite gets one hit target over its silhouette instead of dropping out.
    const datum = normalizeDatum(firstDatumWithin(item))
    // Only data-bearing marks carrying provenance become Semiotic hit targets —
    // legend swatches, axis ticks, and other chrome carry no datum and stay
    // overlay-only. `text` is excluded even when it carries a datum: GoFish tags
    // a glyph's *label* (e.g. the bottle's stage name) as a data-bearing node, but
    // the glyph it annotates is the real target — a label hit-rect is a duplicate.
    if (role !== "node" || !datum || item.kind === "text") continue
    const localBox = boxOf(item)
    if (!localBox) continue
    const box = applyTransform(localBox, transform)
    if (!(box.w > 0) || !(box.h > 0)) continue
    const hitStyle: Style = { fill: "rgba(0,0,0,0)", stroke: "none" }
    out.push({
      type: "rect",
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      style: hitStyle,
      datum,
      id: item.id ?? `gofish-node-${counter.n}`,
    })
    counter.n += 1
  }
}

/** Extract the `role:"node"` row data (for the chart's `nodes` prop). Mirrors
 *  the hit-node rule, including the `text` exclusion, so `nodes` stays aligned to
 *  interactive glyphs — one row per glyph, not one per glyph + its label. */
function collectNodeRows(items: GofishDisplayItem[], out: Datum[]): void {
  for (const item of items) {
    if (item.kind === "group") {
      collectNodeRows(item.children, out)
      continue
    }
    if ((item.role ?? "node") !== "node" || item.kind === "text") continue
    const datum = normalizeDatum(firstDatumWithin(item))
    if (datum) out.push(datum)
  }
}

// ── Layout factory ───────────────────────────────────────────────────────────

/**
 * Build the `NetworkCustomLayout` for a baked display list. The closure-captured
 * document is the default; a host can override it per-render through
 * `layoutConfig.displayList` (the cheap re-layout path — no node re-ingest).
 */
function makeDisplayListLayout(
  defaultDoc: GofishDisplayListDocument,
): NetworkCustomLayout<{ displayList?: GofishDisplayListDocument }> {
  return (ctx) => {
    const doc = ctx.config?.displayList ?? defaultDoc
    const sceneNodes: NetworkSceneNode[] = []
    collectHitNodes(doc.items, IDENTITY, sceneNodes, { n: 0 })

    const state: RenderState = { compositeId: 0 }
    const overlays = createElement(
      "g",
      { className: "semiotic-gofish-displaylist", "data-gofish-ir": doc.ir },
      doc.items.map((item, i) => renderItem(item, `gf-${i}`, state)),
    )

    const result: NetworkLayoutResult = { sceneNodes, overlays }
    return result
  }
}

// ── Public entry ───────────────────────────────────────────────────────────

export interface FromGofishIROptions {
  /**
   * Override the document carried in `layoutConfig` (rarely needed — the
   * returned `layoutConfig.displayList` already holds the parsed document).
   */
  displayList?: GofishDisplayListDocument
}

/**
 * Translate a GoFish DisplayList document into a Semiotic custom-layout config
 * for `NetworkCustomChart`.
 *
 * @example
 * ```tsx
 * import { unstable_fromGofishIR } from "semiotic/experimental"
 * import { NetworkCustomChart } from "semiotic/network"
 *
 * // In a host, the document comes from GoFish's layout pass:
 * //   const doc = await chart(data).flow(...).mark(...).toDisplayList({ w, h })
 * const cfg = unstable_fromGofishIR(doc)
 *
 * <NetworkCustomChart
 *   nodes={cfg.nodes}
 *   layout={cfg.networkLayout}
 *   layoutConfig={cfg.layoutConfig}
 *   width={cfg.width}
 *   height={cfg.height}
 *   margin={0}
 * />
 * ```
 */
export function unstable_fromGofishIR(
  doc: GofishDisplayListDocument,
  options: FromGofishIROptions = {},
): GofishChartConfig {
  const warnings: string[] = []
  if (!doc || doc.ir !== "gofish-display-list") {
    warnings.push(
      `Expected a "gofish-display-list" document (the output of GoFish's toDisplayList) but got ir="${doc?.ir}". ` +
        `This adapter consumes the baked render IR, not the source-level Frontend IR. Attempting best-effort translation.`,
    )
  }
  if (doc?.irVersion !== 0) {
    warnings.push(
      `This adapter targets GoFish DisplayList IR v0; document declares irVersion=${doc?.irVersion}. Newer fields are ignored.`,
    )
  }

  const resolved = options.displayList ?? doc
  const items = Array.isArray(resolved?.items) ? resolved.items : []
  if (items.length === 0) {
    warnings.push("Display list carried no items; the chart will render empty.")
  }

  const nodes: Datum[] = []
  collectNodeRows(items, nodes)

  const viewport = resolved?.viewport ?? { w: 0, h: 0 }

  return {
    family: "network",
    networkLayout: makeDisplayListLayout(resolved),
    layoutConfig: { displayList: resolved },
    nodes,
    edges: [],
    width: viewport.w,
    height: viewport.h,
    irVersion: resolved?.irVersion ?? 0,
    warnings: warnings.length ? warnings : undefined,
  }
}

/** @deprecated Internal compatibility alias for the temporary GoFish PR preview. */
export const fromGofishIR = unstable_fromGofishIR
