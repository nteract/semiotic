/** Compact default display; authored tooltip formatters control precision. */
export function formatTooltipNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value)
  const rounded = Number.isInteger(value) ? value : Number(value.toPrecision(6))
  return Math.abs(rounded) > 9999 ? rounded.toLocaleString() : String(rounded)
}
