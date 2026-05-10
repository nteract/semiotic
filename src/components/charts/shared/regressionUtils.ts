/**
 * regressionUtils — sugar for the `trend` annotation.
 *
 * The `trend` annotation type (see annotationRules.tsx) already
 * computes and renders linear / polynomial / LOESS regression lines
 * for any chart that exposes x/y scales. This module wraps that into
 * a chart-prop ergonomic — `regression={true}`, `regression="loess"`,
 * or a full config object — so users don't have to author an
 * annotation object by hand for the most common cases.
 *
 * Mirrors the shape of LineChart's `forecast` and `anomaly` props,
 * which are likewise sugar over annotation-side work.
 */
import type { Datum } from "./datumTypes"

/** Regression methods supported by the trend annotation. */
export type RegressionMethod = "linear" | "polynomial" | "loess"

/**
 * Full regression configuration. All visual props mirror the
 * underlying `trend` annotation; users dropping into the `annotations`
 * array directly can pass the same shape.
 */
export interface RegressionConfig {
  /** Regression method. @default "linear" */
  method?: RegressionMethod
  /** LOESS bandwidth (0–1). Lower = more local detail. @default 0.3 */
  bandwidth?: number
  /** Polynomial order (only for `method: "polynomial"`). @default 2 */
  order?: number
  /** Stroke color for the regression line. @default "#6366f1" */
  color?: string
  /** Stroke width. @default 2 */
  strokeWidth?: number
  /** Dash pattern. @default "6,3" */
  strokeDasharray?: string
  /** Optional label rendered at the line's right end. */
  label?: string
}

/**
 * Prop shape on chart HOCs. The boolean form gives users a
 * "just draw a regression line" toggle; the string form picks the
 * method with default styling; the object form opens up the full
 * configuration. Mirrors `forecast` / `anomaly` on LineChart.
 */
export type RegressionProp = boolean | RegressionMethod | RegressionConfig

/**
 * Convert a `regression` prop value into the trend-annotation object
 * to splice into the chart's annotations array. Returns `undefined`
 * when the prop is falsy so callers can skip the spread.
 *
 * @example
 * ```ts
 * const trendAnn = buildRegressionAnnotation(regression)
 * const annotations = [
 *   ...(trendAnn ? [trendAnn] : []),
 *   ...(userAnnotations || []),
 * ]
 * ```
 */
export function buildRegressionAnnotation(
  regression: RegressionProp | undefined,
): Datum | undefined {
  if (!regression) return undefined

  const config: RegressionConfig =
    typeof regression === "boolean"
      ? {}
      : typeof regression === "string"
        ? { method: regression }
        : regression

  return {
    type: "trend",
    method: config.method ?? "linear",
    ...(config.bandwidth != null && { bandwidth: config.bandwidth }),
    ...(config.order != null && { order: config.order }),
    ...(config.color != null && { color: config.color }),
    ...(config.strokeWidth != null && { strokeWidth: config.strokeWidth }),
    ...(config.strokeDasharray != null && { strokeDasharray: config.strokeDasharray }),
    ...(config.label != null && { label: config.label }),
  }
}
