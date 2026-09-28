/**
 * Multi-series hover for StreamXYFrame: every series value at one x.
 * Pure — shared by the pointer and keyboard paths, no React dependency.
 */
import type { Datum } from "../charts/shared/datumTypes"
import type { PipelineStore } from "./PipelineStore"
import type { HoverData, StreamChartType } from "./types"
import { clampToSeriesXRange, findAllNodesAtX } from "./CanvasHitTester"
import { buildHoverData } from "./hoverUtils"
import { UNGROUPED_SERIES_KEY } from "./pipelineStyleResolvers"
import { enrichDatumWithBand } from "./xySceneBuilders/ribbonScene"
import { getXYPlugin } from "./xyPlugins/registry"

export interface XYMultiHoverOptions {
  chartType: StreamChartType
  /** A string accessor also receives the x value on the synthetic datum. */
  xAccessor: unknown
  /** Row color when a series has none of its own (the theme primary). */
  fallbackColor: string
  maxXDistance: number
  /** Whether a scene node sits under the pointer or keyboard focus. */
  hasHit: boolean
}

/**
 * Attach `allSeries`, `xValue`, and `xPx` for the series at plot x `px`.
 * The lookup x is clamped into the rendered series range, so padding
 * outside the data reads the first or last sample. `hover.x`/`hover.y`
 * stay where they are; the crosshair and series dots draw at `xPx`.
 * Returns `hover` unchanged when no series spans the lookup x.
 */
export function attachMultiHover(
  hover: HoverData,
  store: Pick<PipelineStore, "scene" | "scales" | "resolvedRibbons">,
  px: number,
  options: XYMultiHoverOptions
): HoverData {
  const { scene, scales } = store
  if (scene.length === 0 || !scales) return hover
  const pluginHover = getXYPlugin(options.chartType)?.multiHover
  if (pluginHover) return pluginHover(hover, store, px, options)
  const lookupX = clampToSeriesXRange(scene, px)
  const hits = findAllNodesAtX(scene, lookupX, options.maxXDistance)
  if (hits.length === 0) return hover

  const xInvert = scales.x?.invert
  const xValue = typeof xInvert === "function" ? xInvert(lookupX) : lookupX
  let next: HoverData
  if (options.hasHit) {
    next = { ...hover, xValue, xPx: lookupX }
  } else {
    const syntheticDatum: Datum = { xValue }
    if (typeof options.xAccessor === "string") syntheticDatum[options.xAccessor] = xValue
    next = buildHoverData(syntheticDatum, hover.x, hover.y, { xValue, xPx: lookupX })
  }

  const yInvert = scales.y.invert
  next.allSeries = hits.map(h => {
    const topValue = yInvert ? yInvert(h.y) : h.y
    const bottomValue = h.y0 != null
      ? (yInvert ? yInvert(h.y0) : h.y0)
      : undefined
    const value = options.chartType === "stackedarea" && bottomValue != null
      ? topValue - bottomValue
      : topValue
    return {
      group: h.group == null || h.group === UNGROUPED_SERIES_KEY ? "" : h.group,
      value,
      valuePx: h.y,
      color: h.color || options.fallbackColor,
      // Each per-series datum gets its own band enrichment so
      // multi-mode tooltips can read `s.datum.band` per series.
      datum: enrichDatumWithBand(h.datum, store.resolvedRibbons),
    }
  })
  return next
}

