import type { ChartConfig } from "./serverChartConfigShared"

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
    return {
      chartType: "heatmap",
      data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      valueAccessor: rest.valueAccessor,
      showValues: rest.showValues,
      heatmapValueFormat: rest.valueFormat,
      // `frameProps.areaStyle` remains the documented final escape hatch.
      areaStyle: cellStyle,
      ...common,
      ...(effectiveColorScheme !== undefined && { colorScheme: effectiveColorScheme }),
      ...(heatmapColorScale && { heatmapColorScale }),
    }
  },
}
