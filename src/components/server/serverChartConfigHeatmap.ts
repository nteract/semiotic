import type { ChartConfig } from "./serverChartConfigShared"
import type { Datum } from "../charts/shared/datumTypes"
import { composeStyleRules, type StyleRule } from "../charts/shared/styleRules"
import { makeHeatmapRuleContext } from "../charts/shared/heatmapStyleRules"
import { getSequentialInterpolator } from "../charts/shared/colorPalettes"
import { getMinMax } from "../charts/shared/minMax"
import { filterSparseArray } from "../charts/shared/sparseArray"
import type { GradientLegendValue } from "../types/legendTypes"

/**
 * The HOCs' gradient legend. Its domain sizes the legend margin; the static
 * renderer then takes domain and ramp from the drawn cells, as the frame does.
 */
export function heatmapGradientLegend(options: {
  domain: [number, number]
  label: string
  format?: (value: number) => string
  legendDistance?: number
  colorScheme?: unknown
  colorScale?: (value: number) => string
}): GradientLegendValue {
  const { domain } = options
  const interpolator = getSequentialInterpolator(
    typeof options.colorScheme === "string" ? options.colorScheme : undefined
  )
  return {
    gradient: {
      colorFn: options.colorScale ?? ((value: number) =>
        interpolator((value - domain[0]) / (domain[1] - domain[0] || 1))),
      domain,
      label: options.label,
      format: options.format,
    },
    legendDistance: options.legendDistance,
  }
}

/**
 * Heatmap keeps cell border props separate from the generic primitive
 * vocabulary. Convert them to the areaStyle consumed by both SVG paths.
 */
export const heatmap: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, colorScheme, common, rest) => {
    const frameProps = rest.frameProps && typeof rest.frameProps === "object"
      ? rest.frameProps as Record<string, unknown>
      : undefined
    const borderWidth = Number.isFinite(rest.cellBorderWidth)
      ? Math.max(0, rest.cellBorderWidth as number)
      : 1
    const cellStyle = () => ({
      stroke: (rest.cellBorderColor as string | undefined) ?? "#fff",
      strokeWidth: borderWidth,
    })
    const ruledCellStyle = composeStyleRules(
      cellStyle,
      rest.styleRules as StyleRule[] | undefined,
      makeHeatmapRuleContext(
        rest.xAccessor as string | ((d: Datum) => unknown) | undefined,
        rest.yAccessor as string | ((d: Datum) => unknown) | undefined,
        rest.valueAccessor as string | ((d: Datum) => unknown) | undefined,
      ),
    )
    const frameColorScheme = typeof frameProps?.colorScheme === "string"
      ? frameProps.colorScheme
      : undefined
    const effectiveColorScheme = frameColorScheme ?? colorScheme
    const hasFrameScaleOverride = frameProps != null && Object.hasOwn(frameProps, "heatmapColorScale")
    const frameScale = frameProps?.heatmapColorScale
    const heatmapColorScale = hasFrameScaleOverride
      ? typeof frameScale === "function"
        ? frameScale as (value: number) => string
        : undefined
      : effectiveColorScheme === "custom" && typeof rest.customColorScale === "function"
        ? rest.customColorScale as (value: number) => string
        : undefined
    const valueAccessor = rest.valueAccessor ?? "value"
    const readValue = typeof valueAccessor === "function"
      ? valueAccessor as (d: Datum) => number
      : (d: Datum) => d[valueAccessor as string] as number
    const legendSlot = (rest.legend ?? common.legend) as { legendDistance?: number } | undefined
    const legend = common.showLegend
      ? heatmapGradientLegend({
          domain: getMinMax(Array.isArray(data) ? filterSparseArray(data) : [], readValue),
          label: typeof valueAccessor === "string" ? valueAccessor : "value",
          format: rest.valueFormat as ((value: number) => string) | undefined,
          legendDistance: legendSlot?.legendDistance,
          colorScheme: effectiveColorScheme,
          colorScale: heatmapColorScale,
        })
      : undefined
    return {
      chartType: "heatmap",
      data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      valueAccessor: rest.valueAccessor,
      showValues: rest.showValues,
      heatmapValueFormat: rest.valueFormat,
      // Dense numeric grids auto-bin in the scene builder; explicit
      // aggregation still has to reach that path on renderChart().
      ...(rest.heatmapAggregation && { heatmapAggregation: rest.heatmapAggregation }),
      ...(rest.heatmapXBins != null && { heatmapXBins: rest.heatmapXBins }),
      ...(rest.heatmapYBins != null && { heatmapYBins: rest.heatmapYBins }),
      // `frameProps.areaStyle` remains the documented final escape hatch.
      areaStyle: ruledCellStyle,
      ...common,
      ...(effectiveColorScheme !== undefined && { colorScheme: effectiveColorScheme }),
      ...(heatmapColorScale && { heatmapColorScale }),
      ...(legend && { legend }),
    }
  },
}
