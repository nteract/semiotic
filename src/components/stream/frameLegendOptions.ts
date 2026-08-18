import {
  resolveOrdinalAxisChrome,
  resolveXYAxisChrome,
} from "../legendLayout"
import type { StreamOrdinalFrameProps } from "./ordinalTypes"
import type { StreamXYFrameProps } from "./types"

type ChartLegendHost = {
  __legendMarginReservedFor?: unknown
}

function marginWasReserved(props: ChartLegendHost, legend: unknown): boolean {
  return props.__legendMarginReservedFor === legend
}

/** Shared HOC-to-frame legend hand-off for direct XY frames. */
export function xyFrameLegendOptions(
  props: StreamXYFrameProps & ChartLegendHost,
  legend: unknown,
) {
  return {
    legendLayout: props.legendLayout,
    axisChrome: resolveXYAxisChrome({
      showAxes: props.showAxes,
      xLabel: props.xLabel,
      yLabel: props.yLabel,
      yLabelRight: props.yLabelRight,
      axes: props.axes,
    }),
    legendMarginReserved: marginWasReserved(props, legend),
  }
}

/** Shared HOC-to-frame legend hand-off for direct ordinal frames. */
export function ordinalFrameLegendOptions(
  props: StreamOrdinalFrameProps & ChartLegendHost,
  legend: unknown,
) {
  return {
    legendLayout: props.legendLayout,
    axisChrome: resolveOrdinalAxisChrome({
      showAxes: props.showAxes,
      projection: props.projection,
      hasCategoryLabel: Boolean(props.categoryLabel ?? props.oLabel),
      hasValueLabel: Boolean(props.valueLabel ?? props.rLabel),
    }),
    legendMarginReserved: marginWasReserved(props, legend),
  }
}
