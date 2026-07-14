import type { Datum } from "./datumTypes"

export function resolveHoverXPosition(
  interactionDatum: Datum,
  datum: Datum | null | undefined,
  xField: string
): number | null {
  const candidate = interactionDatum.xValue ?? datum?.[xField]
  if (candidate == null) return null
  const numeric = Number(candidate)
  return Number.isFinite(numeric) ? numeric : null
}

export function observationDatum(interactionDatum: Datum): Datum {
  let datum = interactionDatum.data || interactionDatum.datum || interactionDatum
  if (Array.isArray(datum)) datum = datum[0]
  if (
    interactionDatum.xValue != null &&
    datum &&
    typeof datum === "object" &&
    !Array.isArray(datum) &&
    datum.xValue == null
  ) {
    return { ...datum, xValue: interactionDatum.xValue }
  }
  return datum || {}
}

export function hasOwnEnumerableKey(
  value: object | undefined | null
): boolean {
  if (!value) return false
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) return true
  }
  return false
}
