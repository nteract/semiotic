import { resolveHiddenAxisMargins, resolveXYAxisChrome } from "../../legendLayout"

/**
 * The histogram's axes: `showTimeAxis`/`showValueAxis` defaults, or the
 * explicit `axes`, whose entries win. An orientation the explicit axes leave
 * out still follows its visibility flag, so `axes={[{ orient: "bottom",
 * tickValues }]}` with `showValueAxis={false}` hides the value axis the frame
 * would otherwise draw by default.
 */
export function resolveHistogramAxes(props: {
  axes?: import("../../stream/xyFrameAxisTypes").XYFrameAxisConfig[]
  showTimeAxis?: boolean
  showValueAxis?: boolean
}): import("../../stream/xyFrameAxisTypes").XYFrameAxisConfig[] {
  if (!props.axes) {
    return [
      { orient: "bottom", visible: props.showTimeAxis !== false },
      { orient: "left", visible: props.showValueAxis !== false }
    ]
  }
  const has = (...orients: string[]) => props.axes!.some((axis) => orients.includes(axis.orient))
  const hideTime = props.showTimeAxis === false && !has("bottom", "top")
  const hideValue = props.showValueAxis === false && !has("left", "right")
  if (!hideTime && !hideValue) return props.axes
  return [
    ...props.axes,
    ...(hideTime ? [{ orient: "bottom" as const, visible: false }] : []),
    ...(hideValue ? [{ orient: "left" as const, visible: false }] : [])
  ]
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
