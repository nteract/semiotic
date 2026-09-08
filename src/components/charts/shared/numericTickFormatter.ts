/** Preserve distinctions on narrow domains while resolving precision once per tick set. */
export function numericTickFormatter(
  values: number[]
): (value: number) => string {
  let precision = 6
  for (let i = 1; i < values.length; i++) {
    const gap = Math.abs(values[i] - values[i - 1])
    if (gap > 0 && Number.isFinite(gap)) {
      const magnitude = Math.max(Math.abs(values[i]), Math.abs(values[i - 1]))
      precision = Math.max(
        precision,
        Math.ceil(Math.log10(magnitude / gap)) + 1
      )
    }
  }
  const digits = Math.min(17, precision)
  return (value) =>
    Number.isInteger(value)
      ? String(value)
      : String(Number(value.toPrecision(digits)))
}
