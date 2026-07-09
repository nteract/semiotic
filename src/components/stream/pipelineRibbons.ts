/**
 * Ribbon resolution — compose `boundsAccessor` + `band` into ResolvedRibbon[].
 * Extracted from PipelineStore so scene builders / tests can reuse without
 * the full store class.
 */

import type { Datum } from "../charts/shared/datumTypes"
import type { BandConfig, StreamChartType, Style } from "./types"
import type { ResolvedRibbon } from "./xySceneBuilders/ribbonScene"
import {
  resolveAccessor,
  type CoercibleNumber
} from "./accessorUtils"

/**
 * Minimal config surface required to resolve envelope ribbons.
 * Full PipelineConfig satisfies this; kept narrow for pure helpers.
 */
export interface RibbonResolveConfig {
  chartType: StreamChartType
  runtimeMode?: "streaming" | "bounded"
  valueAccessor?: string | ((d: Datum) => CoercibleNumber)
  yAccessor?: string | ((d: Datum) => CoercibleNumber)
  boundsAccessor?: string | ((d: Datum) => CoercibleNumber)
  boundsStyle?: Style | ((d: Datum, group?: string) => Style)
  band?: BandConfig | BandConfig[]
}

/**
 * Read a value off a datum preserving null/undefined as NaN so ribbon
 * gap semantics work. `resolveAccessor` coerces null→0 via unary `+`,
 * which would silently produce a "valid" 0 baseline for missing data —
 * fine for primary y values, wrong for envelope edges.
 */
export function resolveRibbonValueAccessor(
  accessor: string | ((d: Datum) => CoercibleNumber) | undefined,
  fallback: string
): (d: Datum) => number {
  const get: (d: Datum) => unknown =
    typeof accessor === "function"
      ? (accessor as (d: Datum) => unknown)
      : (d) => (d as Record<string, unknown>)[accessor || fallback]
  return (d: Datum) => {
    const raw = get(d)
    if (raw == null) return Number.NaN
    return +(raw as number)
  }
}

/**
 * Compose the full ribbon list from both public envelope APIs:
 * `boundsAccessor` (symmetric ±offset) and `band` (asymmetric pairs).
 * Bounds is prepended so it paints furthest back when both are set on
 * the same chart. Both surfaces share scene-builder, y-extent, and
 * style-cascade machinery — only the resolution differs.
 *
 * Both APIs use null-preserving accessors (NaN for null/undefined) so
 * the unified `buildRibbonForGroup` can rely on a single
 * `Number.isFinite` check to skip gap datums.
 */
export function resolveRibbons(config: RibbonResolveConfig): ResolvedRibbon[] {
  const ribbons: ResolvedRibbon[] = []
  const useStreamingDefaults =
    ["bar", "swarm", "waterfall"].includes(config.chartType) ||
    config.runtimeMode === "streaming"
  const rawY = resolveRibbonValueAccessor(
    useStreamingDefaults
      ? config.valueAccessor || config.yAccessor
      : config.yAccessor,
    useStreamingDefaults ? "value" : "y"
  )

  // boundsAccessor → one ribbon. Legacy behavior: when the offset is
  // not a finite non-zero number, the top and bottom collapse to `y`
  // (degenerate zero-width ribbon — preserved via the conditional).
  if (config.boundsAccessor) {
    const offsetGet = resolveAccessor(config.boundsAccessor, "bounds")
    ribbons.push({
      kind: "bounds",
      getTop: (d) => {
        const y = rawY(d)
        if (!Number.isFinite(y)) return Number.NaN
        const o = offsetGet(d)
        return Number.isFinite(o) && o !== 0 ? y + o : y
      },
      getBottom: (d) => {
        const y = rawY(d)
        if (!Number.isFinite(y)) return Number.NaN
        const o = offsetGet(d)
        return Number.isFinite(o) && o !== 0 ? y - o : y
      },
      style: config.boundsStyle as
        | Style
        | ((d: Datum, group?: string) => Style)
        | undefined,
      perSeries: true,
      interactive: false
    })
  }

  // band → one ribbon per BandConfig (array form drives fan charts).
  if (config.band) {
    const list = Array.isArray(config.band) ? config.band : [config.band]
    for (const b of list) {
      ribbons.push({
        kind: "band",
        getTop: resolveRibbonValueAccessor(
          b.y1Accessor as
            | string
            | ((d: Datum) => CoercibleNumber)
            | undefined,
          "y1"
        ),
        getBottom: resolveRibbonValueAccessor(
          b.y0Accessor as
            | string
            | ((d: Datum) => CoercibleNumber)
            | undefined,
          "y0"
        ),
        style: b.style as
          | Style
          | ((d: Datum, group?: string) => Style)
          | undefined,
        perSeries: b.perSeries !== false,
        interactive: b.interactive === true
      })
    }
  }

  return ribbons
}
