import type { Datum } from "../../charts/shared/datumTypes"
/**
 * Ribbon scene builder — the unified primitive for painting a closed
 * top/bottom envelope underneath a line/area, used by:
 *
 * - `boundsAccessor` (symmetric ±offset around `yAccessor`)
 * - `band` (asymmetric `y0Accessor` / `y1Accessor` per BandConfig, with
 *   multi-band fan support)
 *
 * Both public APIs normalize to `ResolvedRibbon[]` at the PipelineStore
 * layer; the scene builders, y-extent expansion, and tooltip enrichment
 * all read that single array.
 *
 * Consumed by: lineScene, areaScene, mixedScene (each renders ribbons
 * before lines/areas so they sit underneath in z-order).
 */
import type { AreaSceneNode, Style } from "../types"
import type { XYSceneContext } from "./types"

/**
 * One ribbon worth of geometry + style. The PipelineStore owns the
 * normalization from `boundsAccessor` and `band` public props into this
 * single internal shape.
 */
export interface ResolvedRibbon {
  /**
   * Origin of this ribbon:
   * - `"bounds"`: produced by `boundsAccessor` (decorative-only)
   * - `"band"`: produced by `band` (eligible for `datum.band` tooltip
   *   enrichment in the hover handler)
   */
  kind: "bounds" | "band"
  /**
   * Top y-value for each datum. Return `NaN` to skip a datum entirely
   * (gap behavior). Bounds resolves this from `y + offset` (collapsing
   * to `y` when offset is non-finite, matching legacy behavior); band
   * resolves it from `y1Accessor`.
   */
  getTop: (d: Datum) => number
  /**
   * Bottom y-value for each datum. Same gap semantics as `getTop`.
   */
  getBottom: (d: Datum) => number
  /**
   * Style override. When omitted, the scene builder falls back to
   * `ctx.resolveBoundsStyle(group, sampleDatum)` — line color at 0.2
   * fillOpacity. Functions get the first datum and group key.
   */
  style?: Style | ((d: Datum, group?: string) => Style)
  /**
   * `true` → one ribbon per group, colored to match each line.
   * `false` → a single aggregate ribbon across the whole dataset.
   * Bounds is always `true`. Band defaults to `true`; the public
   * `BandConfig.perSeries: false` opt-out flips this.
   */
  perSeries: boolean
  /**
   * Whether the ribbon area participates in hit testing. Bounds is
   * always `false`. Band defaults to `false` but supports `interactive: true`.
   */
  interactive: boolean
}

function pickStyle(
  ctx: XYSceneContext,
  ribbon: ResolvedRibbon,
  group: string,
  sampleDatum?: Datum
): Style {
  if (typeof ribbon.style === "function") {
    return ribbon.style(sampleDatum || {}, group)
  }
  if (ribbon.style && typeof ribbon.style === "object") {
    return ribbon.style
  }
  // Fall back to the line/bounds cascade (line color @ 0.2 fillOpacity,
  // with themeSemantic.primary as the ultimate default).
  return ctx.resolveBoundsStyle(group, sampleDatum)
}

/**
 * Build a single ribbon scene node for one slice of data.
 *
 * Iterates the data once, evaluates `getTop`/`getBottom` per datum, and
 * collects coordinate pairs. Any datum with non-finite x, top, or bottom
 * is skipped (gap semantics — equivalent to `gapStrategy: "break"`).
 * Returns `null` when fewer than two valid points remain (a single
 * point can't form a visible ribbon).
 */
export function buildRibbonForGroup(
  ctx: XYSceneContext,
  data: Datum[],
  group: string,
  ribbon: ResolvedRibbon
): AreaSceneNode | null {
  if (!ctx.scales) return null
  const topPath: [number, number][] = []
  const bottomPath: [number, number][] = []
  for (const d of data) {
    const x = ctx.getX(d)
    if (x == null || Number.isNaN(x)) continue
    const top = ribbon.getTop(d)
    const bottom = ribbon.getBottom(d)
    if (!Number.isFinite(top) || !Number.isFinite(bottom)) continue
    const px = ctx.scales.x(x)
    topPath.push([px, ctx.scales.y(top)])
    bottomPath.push([px, ctx.scales.y(bottom)])
  }
  if (topPath.length < 2) return null
  return {
    type: "area",
    topPath,
    bottomPath,
    style: pickStyle(ctx, ribbon, group, data[0]),
    datum: data,
    group,
    interactive: ribbon.interactive,
  }
}

/**
 * Split ribbons by `perSeries` so the caller can dispatch correctly:
 * per-series ribbons render once per group; aggregate ribbons render
 * once across the full dataset.
 */
export function partitionRibbons(ribbons: ResolvedRibbon[] | undefined): {
  perSeries: ResolvedRibbon[]
  aggregate: ResolvedRibbon[]
} {
  const perSeries: ResolvedRibbon[] = []
  const aggregate: ResolvedRibbon[] = []
  if (!ribbons) return { perSeries, aggregate }
  for (const r of ribbons) {
    if (r.perSeries) perSeries.push(r)
    else aggregate.push(r)
  }
  return { perSeries, aggregate }
}

/**
 * Build all aggregate ribbons (perSeries=false) for the whole dataset.
 * Each ribbon emits at most one AreaSceneNode under the synthetic
 * group key `__ribbon_aggregate`.
 */
export function buildAggregateRibbons(
  ctx: XYSceneContext,
  data: Datum[],
  ribbons: ResolvedRibbon[]
): AreaSceneNode[] {
  const nodes: AreaSceneNode[] = []
  for (const r of ribbons) {
    const node = buildRibbonForGroup(ctx, data, "__ribbon_aggregate", r)
    if (node) nodes.push(node)
  }
  return nodes
}

/**
 * Build all per-series ribbons for one grouped data slice. Each ribbon
 * in the list emits at most one AreaSceneNode for the given group.
 */
export function buildPerSeriesRibbons(
  ctx: XYSceneContext,
  data: Datum[],
  group: string,
  ribbons: ResolvedRibbon[]
): AreaSceneNode[] {
  const nodes: AreaSceneNode[] = []
  for (const r of ribbons) {
    const node = buildRibbonForGroup(ctx, data, group, r)
    if (node) nodes.push(node)
  }
  return nodes
}
