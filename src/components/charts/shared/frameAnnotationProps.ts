import type { Datum } from "./datumTypes"

/** Match the chart's final frame props, including an explicit false or empty array. */
export function withFrameAnnotationProps(props: Datum, frame: Datum | undefined, chartFirst: boolean): Datum {
  if (!frame) return props
  let resolved = props
  for (const key of ["annotations", "autoPlaceAnnotations"]) {
    if (!Object.prototype.propertyIsEnumerable.call(frame, key) || (chartFirst && props[key] != null)) continue
    if (props[key] === frame[key]) continue
    if (resolved === props) resolved = { ...props }
    resolved[key] = frame[key]
  }
  return resolved
}
