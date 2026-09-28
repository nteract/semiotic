/** Preserve numeric precision, normalizing only noise near a short decimal. */
export function formatTooltipNumber(value: number): string {
  let clean = value
  if (Number.isFinite(value) && !Number.isInteger(value)) {
    const shorter = Number(value.toPrecision(12))
    // A short representation must be within floating-point relative precision.
    // Do not round integers: their digits may be identifiers or exact counts.
    if (Math.abs(value - shorter) <= Number.EPSILON * Math.abs(value)) {
      clean = shorter
    }
  }
  // Preserve fractional digits when grouping; Intl defaults to three decimals.
  return Math.abs(clean) > 9999
    ? clean.toLocaleString(undefined, { maximumSignificantDigits: 21 })
    : String(clean)
}
