/**
 * Multi-series hover for StreamXYFrame: every series value at one x.
 * Pure — shared by the pointer and keyboard paths, no React dependency.
 */
import type { PipelineStore } from "./PipelineStore"
import type { HoverData, SceneNode, StreamScales, StreamXYFrameProps } from "./types"
import { clampToSeriesXRange, findAllNodesAtX } from "./CanvasHitTester"
import { UNGROUPED_SERIES_KEY } from "./pipelineStyleResolvers"
import { enrichDatumWithBand } from "./xySceneBuilders/ribbonScene"
import { getXYPlugin } from "./xyPlugins/registry"

/** Project custom chart paths once per scene and scale pair (including resize). */
export function cacheMultiHoverScene(
  build: NonNullable<StreamXYFrameProps["multiHoverScene"]>
): NonNullable<StreamXYFrameProps["multiHoverScene"]> {
  let previousScene: SceneNode[] | undefined
  let previousScales: StreamScales | undefined
  let series: SceneNode[]
  return (scene, scales) => {
    if (scene !== previousScene || scales !== previousScales) {
      series = build(scene, scales)
      previousScene = scene
      previousScales = scales
    }
    return series
  }
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
  store: Pick<PipelineStore, "scene" | "scales" | "resolvedRibbons" | "getXAccessor">,
  { chartType, xAccessor, multiHoverScene, tooltipSampling = "sample", normalize }: StreamXYFrameProps,
  fallbackColor: string,
  maxXDistance: number,
  hitX?: number
): HoverData {
  const { scales } = store
  if (store.scene.length === 0 || !scales) return hover
  const px = hover.x
  const hasHit = hitX !== undefined
  const pluginHover = getXYPlugin(chartType)?.multiHover
  if (pluginHover) return pluginHover(hover, store, px, { hasHit, fallbackColor })
  const scene = multiHoverScene?.(store.scene, scales) ?? store.scene
  let lookupX = tooltipSampling === "sample" ? px : clampToSeriesXRange(scene, px)
  const hits = findAllNodesAtX(scene, lookupX, maxXDistance, tooltipSampling)
  if (hits.length === 0) return hover

  if (tooltipSampling === "sample") lookupX = hits[0].x
  let xValue: HoverData["xValue"] = scales.x.invert?.(lookupX) ?? lookupX
  // Preserve the exact source x (including milliseconds) across a scale round trip.
  if (hits[0].sampleValue !== undefined && hits[0].datum) {
    const sampleX = store.getXAccessor()(hits[0].datum)
    if (scales.x(sampleX) === lookupX) xValue = xValue instanceof Date ? new Date(sampleX) : sampleX
  }
  let data = hover.data
  if (!hasHit) {
    data = { xValue }
    if (typeof xAccessor === "string") data[xAccessor] = xValue
  } else if (tooltipSampling === "sample" && hitX !== lookupX) {
    data = enrichDatumWithBand(hits[0].datum, store.resolvedRibbons)
  }

  const invertY = (y: number) => scales.y.invert?.(y) ?? y
  const allSeries = hits.map(h => {
    const stacked = chartType === "stackedarea" && h.y0 !== undefined
    // Normalized stacks report plotted shares. Other sampled series carry the
    // exact source value (or the sum for multiple rows at one stack cell).
    let value = h.sampleValue
    if (value === undefined || (stacked && normalize)) {
      value = invertY(h.y)
      if (stacked) value -= invertY(h.y0!)
    }
    return {
      group: h.group == null || h.group === UNGROUPED_SERIES_KEY ? "" : h.group,
      value,
      valuePx: h.y,
      color: h.color || fallbackColor,
      // Each per-series datum gets its own band enrichment so
      // multi-mode tooltips can read `s.datum.band` per series.
      datum: enrichDatumWithBand(h.datum, store.resolvedRibbons),
    }
  })
  return { ...hover, data, xValue, xPx: lookupX, allSeries }
}
