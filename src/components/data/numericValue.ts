/** Decimal data values, not base-prefixed literals or zero-padded identifiers. */
export function parseNumericValue(value: unknown): number | undefined {
  if (typeof value === "number") return value
  if (typeof value !== "string") return undefined
  const text = value.trim()
  if (/^[+-]?nan$/i.test(text)) return NaN
  if (/^[+-]?Infinity$/.test(text)) return Number(text)
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) || /^[+-]?0\d+$/.test(text)) return undefined
  return Number(text)
}

export function isMissingValue(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "")
}
