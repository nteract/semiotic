import type { Datum } from "./datumTypes"
import {
  makeRuleValueResolver,
  type StyleRuleContext,
} from "./styleRules"

/**
 * Heatmap rules operate on two distinct public mark shapes:
 *
 * - ordinary cells retain the caller's row and resolve x/y/value accessors;
 * - aggregated cells expose `{ value, count, sum, xCenter, yCenter, agg }`.
 *
 * The default `value` channel deliberately means the displayed aggregate for
 * a derived cell. Callers can still target `count`, `sum`, or `agg` through a
 * declarative `field`, while `axis: "x"|"y"` resolves the bin center.
 */
export function makeHeatmapRuleContext(
  xAccessor: string | ((d: Datum) => unknown) | undefined,
  yAccessor: string | ((d: Datum) => unknown) | undefined,
  valueAccessor: string | ((d: Datum) => unknown) | undefined,
): (datum: Datum) => StyleRuleContext {
  const readX = makeRuleValueResolver(xAccessor)
  const readY = makeRuleValueResolver(yAccessor)
  const readValue = makeRuleValueResolver(valueAccessor)

  return (datum: Datum) => {
    const isAggregate =
      typeof datum.agg === "string" &&
      typeof datum.count === "number" &&
      typeof datum.xCenter === "number" &&
      typeof datum.yCenter === "number"
    const value = isAggregate
      ? finiteNumber(datum.value)
      : readValue(datum)
    const x = isAggregate ? finiteNumber(datum.xCenter) : readX(datum)
    const y = isAggregate ? finiteNumber(datum.yCenter) : readY(datum)
    return { value, x, y }
  }
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined
}
