import type { AnnotationContext } from "../../realtime/types"
import type { Datum } from "./datumTypes"
import {
  linearRegression,
  polynomialRegression,
  regressionPoints,
  type RegressionPoint
} from "./leastSquaresRegression"
import { loess } from "./loess"

/** Shared browser/server trend fitting and projection. */
export function trendGeometry(
  ann: Datum,
  context: AnnotationContext
): RegressionPoint[] {
  const scaleX = context.scales?.x ?? context.scales?.time
  const scaleY = context.scales?.y ?? context.scales?.value
  if (!scaleX || !scaleY) return []
  const data = context.data || []
  const xKey = context.xAccessor || "x"
  const yKey = context.yAccessor || "y"
  const horizontal = context.projection === "horizontal"
  const ordinal = context.frameType === "ordinal"
  const sx = scaleX as (key: string | number | Date) => number
  const sy = scaleY as (key: string | number | Date) => number
  const band = horizontal ? sy : sx
  const categories = ordinal
    ? (context.scales?.o?.domain().map(String) ??
      [
        ...new Set(
          data.filter((d) => d[xKey] != null).map((d) => String(d[xKey]))
        )
      ].sort((a, b) => band(a) - band(b)))
    : []
  const indices = new Map(categories.map((category, i) => [category, i]))
  const points = regressionPoints(
    data.map((d) => [
      ordinal
        ? d[xKey] == null
          ? undefined
          : indices.get(String(d[xKey]))
        : d[xKey],
      d[yKey]
    ])
  )
  if (points.length < 2) return []
  const fitted =
    ann.method === "loess"
      ? loess(points, ann.bandwidth ?? 0.3)
      : (ann.method === "polynomial"
          ? polynomialRegression(points, ann.order ?? 2)
          : linearRegression(points)
        ).points
  return fitted
    .map(([x, y]): RegressionPoint => {
      if (!ordinal) return [sx(x), sy(y)]
      // Every fitter evaluates at the original, integral category indices.
      const position = band(categories[x])
      return horizontal ? [sx(y), position] : [position, sy(y)]
    })
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
}
