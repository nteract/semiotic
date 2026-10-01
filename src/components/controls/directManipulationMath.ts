/**
 * Clamp to `[min, max]` and snap to the step grid through `origin`.
 *
 * The grid is anchored at `origin` rather than at `min`, so a handle bounded
 * by a neighbor's non-integer value still lands on absolute step multiples.
 * A bound that falls between grid lines is itself reachable: snapping never
 * pushes a value outside `[min, max]`.
 */
export function snapToStep(
  value: number,
  min: number,
  max: number,
  step: number,
  origin: number
): number {
  const clamped = Math.min(max, Math.max(min, value))
  if (!(step > 0)) return clamped
  const snapped = origin + Math.round((clamped - origin) / step) * step
  return Math.min(max, Math.max(min, Number(snapped.toFixed(12))))
}

/**
 * The value a slider key moves to, or null for keys the control ignores.
 * Arrows step, Shift+arrows and PageUp/PageDown take `largeStep`, and
 * Home/End jump to the bounds (WAI-ARIA slider pattern).
 */
export function keyboardSliderTarget(
  key: string,
  shiftKey: boolean,
  value: number,
  { min, max, step, largeStep }: { min: number; max: number; step: number; largeStep: number }
): number | null {
  const increment = shiftKey ? largeStep : step
  switch (key) {
    case "ArrowLeft":
    case "ArrowDown":
      return value - increment
    case "ArrowRight":
    case "ArrowUp":
      return value + increment
    case "PageDown":
      return value - largeStep
    case "PageUp":
      return value + largeStep
    case "Home":
      return min
    case "End":
      return max
    default:
      return null
  }
}
