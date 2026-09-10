import { resolveHiddenAxisMargins, resolveXYAxisChrome } from "../../legendLayout"

/** Resolve histogram conveniences into the shared XY axis configuration. */
export function resolveHistogramAxes(props: {
  axes?: import("../../stream/xyFrameAxisTypes").XYFrameAxisConfig[]
  showTimeAxis?: boolean
  showValueAxis?: boolean
}): import("../../stream/xyFrameAxisTypes").XYFrameAxisConfig[] {
  return (
    props.axes ?? [
      { orient: "bottom", visible: props.showTimeAxis !== false },
      { orient: "left", visible: props.showValueAxis !== false }
    ]
  )
}

export function histogramMarginDefaults(
  defaults: { top: number; right: number; bottom: number; left: number },
  axes: import("../../stream/xyFrameAxisTypes").XYFrameAxisConfig[],
  showAxes: boolean,
  hasTitle = false
) {
  const chrome = resolveXYAxisChrome({ axes, showAxes })
  return {
    ...resolveHiddenAxisMargins(defaults, axes, hasTitle),
    ...(!chrome.hasAxis && { bottom: 0 }),
    ...(!chrome.leftAxis?.hasAxis && { left: 0 })
  }
}
