import type { Datum } from "./datumTypes"
import type { ForecastConfig } from "./statisticalOverlays"

/** Include forecast envelopes in the default domain in browser and server charts. */
export function forecastYExtent(
  rows: Datum[],
  yAccessor: string | ((d: Datum) => number),
  forecast?: ForecastConfig
): [number, number] | undefined {
  if (!forecast) return undefined
  const readers = [
    yAccessor,
    forecast.upperBounds ?? "__forecastUpper",
    forecast.lowerBounds ?? "__forecastLower"
  ].map((accessor) =>
    typeof accessor === "function" ? accessor : (d: Datum) => d[accessor]
  )
  let hasBounds = !!(forecast.upperBounds || forecast.lowerBounds)
  let min = Infinity
  let max = -Infinity
  for (const row of rows) {
    const upper = readers[1](row)
    const lower = readers[2](row)
    if (upper != null || lower != null) hasBounds = true
    for (const value of [Number(readers[0](row)), upper, lower]) {
      if (typeof value === "number" && Number.isFinite(value)) {
        min = Math.min(min, value)
        max = Math.max(max, value)
      }
    }
  }
  return hasBounds && min <= max ? [min, max] : undefined
}
