import type { Datum } from "../charts/shared/datumTypes"
import { buildServerPointStyle } from "./serverChartConfigsXYScatter"
import { mergeServerRegressionAnnotation, type ChartConfig } from "./serverChartConfigShared"

export const bubbleChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const annotations = mergeServerRegressionAnnotation(
      common.annotations,
      rest.regression,
    )
    return {
      chartType: "scatter",
      data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      colorAccessor: colorBy,
      sizeAccessor: rest.sizeBy,
      sizeRange: rest.sizeRange || [5, 40],
      colorScheme,
      ...common,
      ...(annotations && { annotations }),
      pointStyle:
        common.pointStyle ||
        buildBubblePointStyle(data, colorBy, colorScheme, common, rest),
      showLegend: common.showLegend ?? Boolean(colorBy)
    }
  }
}

/** Mirror BubbleChart's HOC-level point encoding on the server path. */
export function buildBubblePointStyle(
  data: unknown,
  colorBy: string | ((d: Datum) => unknown) | undefined,
  colorScheme: unknown,
  common: Datum,
  rest: Datum
): (d: Datum) => Datum {
  return buildServerPointStyle(data, colorBy, colorScheme, common, rest, "bubble")
}
