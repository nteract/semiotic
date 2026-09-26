/** Clamp a value to inclusive bounds; NaN propagates from any argument. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
