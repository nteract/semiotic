import {
  confidenceZScore,
  linearRegression,
  forecastIntervalStats,
  polynomialRegression,
  type RegressionPoint
} from "./leastSquaresRegression"
import { fitLoessForForecast } from "./loess"

/** Shared fitting and approximate prediction intervals for all forecast renderers. */
export function forecastModel(
  points: RegressionPoint[],
  config: {
    method?: string
    order?: number
    bandwidth?: number
    confidence?: number
  }
): {
  predict: (x: number) => number
  forecast: (
    count: number,
    start?: number
  ) => { x: number; y: number; upper: number; lower: number }[]
} | null {
  if (points.length < 3 || points[0][0] === points[points.length - 1][0])
    return null
  const fit =
    config.method === "polynomial"
      ? polynomialRegression(points, config.order ?? 2)
      : linearRegression(points)
  if (!fit.points.length) return null
  const predict =
    config.method === "loess"
      ? fitLoessForForecast(points, config.bandwidth)
      : fit.predict
  if (!predict) return null
  const { se } = forecastIntervalStats(points, predict, fit.parameterCount)
  const z = confidenceZScore(config.confidence ?? 0.95)
  const lastX = points[points.length - 1][0]
  const step = (lastX - points[0][0]) / (points.length - 1)
  return {
    predict,
    forecast: (count, start = lastX) => {
      if (!Number.isInteger(count) || count <= 0) return []
      return Array.from({ length: count }, (_, i) => {
        const x = start + (i + 1) * step
        const y = predict(x)
        const interval = se * z * Math.sqrt(1 + fit.leverage(x))
        return { x, y, upper: y + interval, lower: y - interval }
      })
    }
  }
}
