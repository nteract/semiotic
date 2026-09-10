/** Resolve the same primary axes in live chrome, static SVG, and margin layout. */
export function resolveXYAxes<T extends { orient?: string }>(
  axes?: readonly T[]
) {
  const bottomAxis = axes?.find((axis) => axis.orient === "bottom")
  const topAxis = axes?.find((axis) => axis.orient === "top")
  const leftAxis = axes?.find((axis) => axis.orient === "left")
  const rightAxis = axes?.find((axis) => axis.orient === "right")
  return {
    bottomAxis,
    topAxis,
    leftAxis,
    rightAxis,
    xAxis: bottomAxis ?? topAxis,
    yAxis: leftAxis ?? rightAxis,
    xOrient: bottomAxis || !topAxis ? ("bottom" as const) : ("top" as const),
    yOrient: leftAxis || !rightAxis ? ("left" as const) : ("right" as const)
  }
}
